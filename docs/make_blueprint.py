"""Builds the Make blueprint for the MWP Digital Shop events scenario.
Usage: python3 make_blueprint.py <monday_connection_id> [<gmail_connection_id>] > blueprint.json
(Without the Gmail connection, ambassador applications still sync, but no welcome / decline email is sent.)
"""
import json, sys

CONN = int(sys.argv[1])
HOOK = 3879124
MATAN = 104260573

B_ORD, B_CUS, B_PRD, B_SUP = 5105799198, 5105799189, 5105799186, 5105799201
B_AMB = 5105939043   # Shop Ambassadors
B_TST = 5105950543   # Shop Testers

# Free text that ends up inside a JSON string: strip quotes, backslashes and line breaks.
def clean(expr):
    return "{{replace(" + expr + "; /[\"\\\\\\r\\n]/g; \"\")}}"

def gql(mid, query, variables, name=None, filt=None):
    m = {
        "id": mid, "module": "monday:ExecuteGraphQLQueryV2", "version": 2,
        "parameters": {"__IMTCONN__": CONN},
        "mapper": {"method": "POST", "queryBody": query, "variablesDataSource": "array",
                   "variables": [{"key": k, "value": v} for k, v in variables.items()]},
        "metadata": {"designer": {"x": 0, "y": 0, **({"name": name} if name else {})}},
    }
    if filt:
        m["filter"] = filt
    return m

def f(name, *conds):
    return {"name": name, "conditions": [[{"a": a, "o": o, **({"b": b} if b is not None else {})} for a, o, b in conds]]}

def router(mid, routes):
    return {"id": mid, "module": "builtin:BasicRouter", "version": 1, "mapper": None,
            "metadata": {"designer": {"x": 0, "y": 0}}, "routes": [{"flow": r} for r in routes]}

TODAY = "{{formatDate(now; \"YYYY-MM-DD\")}}"

# ---------------------------------------------------------------- order
q_order_lookup = """query ($email: String!, $slug: String!, $lsid: String!) {
  cust: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id column_values(ids: ["color_mm806z0h"]) { text } } }
  prod: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm80txve", column_values: [$slug]}]) { items { id } }
  dup: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm806h06", column_values: [$lsid]}]) { items { id } }
}""" % (B_CUS, B_PRD, B_ORD)

order_cv = (
    '{"color_mm80k318":{"label":"{{1.status_label}}"},'
    '"text_mm801m2":"{{1.order_number}}",'
    '"date_mm80g3kg":{"date":"{{1.order_date}}"},'
    '"board_relation_mm80229m":{"item_ids":[{{3.body.data.prod.items[1].id}}]},'
    '"email_mm80d5sm":{"email":"{{1.email}}","text":"{{1.email}}"},'
    '"numeric_mm807h7g":"{{1.subtotal}}","numeric_mm80drf4":"{{1.discount}}",'
    '"numeric_mm80y605":"{{1.tax}}","numeric_mm80a9g":"{{1.total}}",'
    '"text_mm80seb":"{{1.currency}}",'
    '"link_mm80xyay":{"url":"{{1.receipt_url}}","text":"Receipt"},'
    '"text_mm80svyn":"{{1.source}}",'
    '"text_mm806h06":"{{1.checkout_order_id}}"}'
)
# Make reads \" inside {{ }} poorly; use plain quotes there instead.
order_cv = order_cv.replace('\\"', '"')

q_create = "mutation ($name: String!, $group: String!, $cv: JSON!) { create_item(board_id: %d, group_id: $group, item_name: $name, column_values: $cv) { id } }"

new_customer_cv = (
    '{"email_mm80mvf8":{"email":"{{1.email}}","text":"{{1.email}}"},'
    '"date_mm80eahk":{"date":"{{1.order_date}}"},"date_mm80h8hh":{"date":"{{1.order_date}}"},'
    '"color_mm806z0h":{"label":"New"},"color_mm801rf2":{"label":"Not subscribed"},'
    '"board_relation_mm80ww7m":{"item_ids":[{{4.body.data.create_item.id}}]}}'
)
q_existing = """mutation ($cid: ID!, $oid: ID!, $ccv: JSON!, $ocv: JSON!) {
  c: change_multiple_column_values(board_id: %d, item_id: $cid, column_values: $ccv) { id }
  o: change_multiple_column_values(board_id: %d, item_id: $oid, column_values: $ocv) { id }
}""" % (B_CUS, B_ORD)
existing_ccv = ('{"date_mm80h8hh":{"date":"{{1.order_date}}"},'
                '"color_mm806z0h":{"label":"{{switch(3.body.data.cust.items[1].column_values[1].text; "VIP"; "VIP"; "Repeat")}}"}}')
existing_ocv = '{"board_relation_mm80b7mg":{"item_ids":[{{3.body.data.cust.items[1].id}}]}}'

order_route = [
    gql(3, q_order_lookup, {"email": "{{1.email}}", "slug": "{{1.product_slug}}", "lsid": "{{1.checkout_order_id}}"},
        "Find customer, product and duplicate order",
        f("Order", ("{{1.type}}", "text:equal", "order"))),
    gql(4, q_create % B_ORD, {"name": "#{{1.order_number}} · {{1.product}}",
                              "group": '{{switch(1.status_label; "Test order"; "group_mm80apq3"; "topics")}}', "cv": order_cv},
        "Create order", f("Not logged yet", ("{{3.body.data.dup.items[1].id}}", "notexist", None))),
    router(5, [
        [gql(6, q_create % B_CUS, {"name": "{{ifempty(" + "1.name; 1.email)}}", "group": "topics", "cv": new_customer_cv},
             "New customer (linked to order)", f("New customer", ("{{3.body.data.cust.items[1].id}}", "notexist", None)))],
        [gql(7, q_existing, {"cid": "{{3.body.data.cust.items[1].id}}", "oid": "{{4.body.data.create_item.id}}",
                             "ccv": existing_ccv, "ocv": existing_ocv},
             "Returning customer: link and update", f("Returning customer", ("{{3.body.data.cust.items[1].id}}", "exist", None)))],
    ]),
]

# ---------------------------------------------------------------- refund
q_find_order = """query ($lsid: String!) {
  o: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm806h06", column_values: [$lsid]}]) { items { id } }
}""" % B_ORD
q_change = "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id } }"
refund_cv = ('{"color_mm80k318":{"label":"{{switch(1.type; "refund"; "Refunded"; "Partially refunded")}}"},'
             '"numeric_mm80vsjk":"{{1.refunded_amount}}"}')
refund_route = [
    gql(8, q_find_order, {"lsid": "{{1.checkout_order_id}}"}, "Find refunded order",
        f("Refund", ("{{1.type}}", "text:contain", "refund"))),
    gql(9, q_change % B_ORD, {"id": "{{8.body.data.o.items[1].id}}", "cv": refund_cv}, "Mark order refunded",
        f("Order found", ("{{8.body.data.o.items[1].id}}", "exist", None))),
]

# ---------------------------------------------------------------- support
q_support_lookup = """query ($email: String!, $num: String!) {
  cust: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id } }
  ord: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm801m2", column_values: [$num]}]) { items { id } }
}""" % (B_CUS, B_ORD)
TYPE = '{{switch(1.category; "download"; "Download problem"; "install"; "How-to question"; "refund"; "Refund request"; "Other")}}'
ticket_cv = (
    '{"color_mm808sp9":{"label":"{{switch(1.category; "refund"; "Needs Matan"; "New")}}"},'
    '"color_mm80qy4a":{"label":"' + TYPE + '"},'
    '"email_mm8082vk":{"email":"{{1.email}}","text":"{{1.email}}"},'
    '"board_relation_mm80aes6":{"item_ids":[{{10.body.data.cust.items[1].id}}]},'
    '"board_relation_mm80hvrq":{"item_ids":[{{10.body.data.ord.items[1].id}}]},'
    '"date_mm806h2f":{"date":"' + TODAY + '"},'
    '"text_mm80cye9":"{{1.ticket_id}}"}'
)
q_update = "mutation ($id: ID!, $body: String!) { create_update(item_id: $id, body: $body) { id } }"
support_body = "{{1.message_html}}"

q_notify = "mutation ($id: ID!, $text: String!) { create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text } }" % MATAN
support_route = [
    gql(10, q_support_lookup, {"email": "{{1.email}}", "num": "{{ifempty(1.order_number; \"-\")}}"}, "Find customer and order",
        f("Support", ("{{1.type}}", "text:equal", "support"))),
    gql(11, q_create % B_SUP, {"name": "{{1.subject}}", "group": "topics", "cv": ticket_cv}, "Create support ticket"),
    gql(12, q_update, {"id": "{{11.body.data.create_item.id}}", "body": support_body}, "Add the message"),
    gql(13, q_notify, {"id": "{{11.body.data.create_item.id}}",
                       "text": "Refund request in shop support from {{1.email}}: {{1.subject}}. Only you can approve refunds."},
        "Tell Matan about refund requests", f("Refund request", ("{{1.category}}", "text:equal", "refund"))),
]

# ---------------------------------------------------------------- newsletter sign-up
q_find_cust = """query ($email: String!) {
  cust: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id } }
}""" % B_CUS
# Shop Leads · Free guide (Matan, 25 Oct 2026): one row per free-guide sign-up, Waiting for email → Confirmed.
B_LEAD = 5106641452
q_find_cust_lead = """query ($email: String!) {
  cust: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id } }
  lead: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email", column_values: [$email]}]) { items { id } }
}""" % (B_CUS, B_LEAD)
LEAD_PHONE = '{{replace(1.phone_cv; "phone_mm8f7tjs"; "phone")}}'   # the shop's Phone value, for this board's column
q_lead_create = ("mutation ($name: String!, $cv: JSON!) { create_item(board_id: %d, group_id: \"topics\", item_name: $name, "
                 "column_values: $cv, create_labels_if_missing: true) { id } }" % B_LEAD)
q_lead_change = "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id } }" % B_LEAD
# The free Field Guides sample (25 Oct 2026): the pop-up's sign-up arrives as type "subscribe", source "free-guide",
# with name, phone, language and marketing consent; the shop sends the Phone column value (phone_cv) and the
# Newsletter value (newsletter_cv, only when they agreed: it never downgrades someone already subscribed) ready-made.
# Shop Customers columns added for it: Phone, Language, Free guide (Waiting for email / Confirmed), Signed up.
q_create_labels = ("mutation ($name: String!, $cv: JSON!) { create_item(board_id: %d, group_id: \"topics\", item_name: $name, "
                   "column_values: $cv, create_labels_if_missing: true) { id } }" % B_CUS)
GUIDE_COLS = ('"color_mm8fc7jc":{"label":"{{1.language}}"},"color_mm8fazp":{"label":"Waiting for email"},'
              '"date_mm8fvxh9":{"date":"{{1.signed_up_on}}"}')
subscribe_route = [
    gql(14, q_find_cust_lead, {"email": "{{1.email}}"}, "Find customer",
        f("Sign-up", ("{{1.type}}", "text:equal", "subscribe"))),
    router(15, [
        [gql(16, q_change % B_CUS, {"id": "{{14.body.data.cust.items[1].id}}", "cv": '{"color_mm801rf2":{"label":"Subscribed"}}'},
             "Mark subscribed", f("Known", ("{{14.body.data.cust.items[1].id}}", "exist", None),
                                  ("{{1.source}}", "text:notequal", "free-guide")))],
        [gql(17, q_create % B_CUS, {"name": "{{1.email}}", "group": "topics",
                                    "cv": '{"email_mm80mvf8":{"email":"{{1.email}}","text":"{{1.email}}"},'
                                          '"color_mm801rf2":{"label":"Subscribed"},"dropdown_mm80egg7":{"labels":["Newsletter"]}}'},
             "New subscriber", f("New", ("{{14.body.data.cust.items[1].id}}", "notexist", None),
                                 ("{{1.source}}", "text:notequal", "free-guide")))],
        [gql(160, q_change % B_CUS, {"id": "{{14.body.data.cust.items[1].id}}",
                                     # a fixed field first: "{{{" would confuse Make's template parser
                                     "cv": '{"color_mm8fazp":{"label":"Waiting for email"},{{1.phone_cv}}{{1.newsletter_cv}}'
                                           '"color_mm8fc7jc":{"label":"{{1.language}}"},"date_mm8fvxh9":{"date":"{{1.signed_up_on}}"}}'},
             "Free guide: known person", f("Known, free guide", ("{{14.body.data.cust.items[1].id}}", "exist", None),
                                           ("{{1.source}}", "text:equal", "free-guide")))],
        [gql(161, q_create_labels, {"name": "{{1.name}}",
                                    "cv": '{"email_mm80mvf8":{"email":"{{1.email}}","text":"{{1.email}}"},{{1.phone_cv}}' + GUIDE_COLS + ','
                                          '"color_mm806z0h":{"label":"New"},"color_mm801rf2":{"label":"{{1.newsletter_label}}"},'
                                          '"dropdown_mm80egg7":{"labels":["Free guide"]}}'},
             "Free guide: new person", f("New, free guide", ("{{14.body.data.cust.items[1].id}}", "notexist", None),
                                         ("{{1.source}}", "text:equal", "free-guide")))],
        [gql(167, q_lead_create, {"name": "{{1.name}}",
                                  "cv": '{"email":{"email":"{{1.email}}","text":"{{1.email}}"},' + LEAD_PHONE +
                                        '"lead_status":{"label":"Waiting for email"},"language":{"label":"{{1.language}}"},'
                                        '"marketing":{"label":"{{switch(1.marketing; "yes"; "Yes"; "No")}}"},'
                                        '"signed_up":{"date":"{{1.signed_up_on}}"}}'},
             "Leads board: new", f("New lead", ("{{14.body.data.lead.items[1].id}}", "notexist", None),
                                   ("{{1.source}}", "text:equal", "free-guide")))],
        [gql(168, q_lead_change, {"id": "{{14.body.data.lead.items[1].id}}",
                                  "cv": '{"lead_status":{"label":"Waiting for email"},' + LEAD_PHONE +
                                        '"language":{"label":"{{1.language}}"},'
                                        '"marketing":{"label":"{{switch(1.marketing; "yes"; "Yes"; "No")}}"},'
                                        '"signed_up":{"date":"{{1.signed_up_on}}"}}'},
             "Leads board: again", f("Signed up again", ("{{14.body.data.lead.items[1].id}}", "exist", None),
                                     ("{{1.source}}", "text:equal", "free-guide")))],
    ]),
]

# ---------------------------------------------------------------- free guide confirmed (they clicked the emailed link)
# The scheduler's "lead" job: Shop Customers → Free guide = Confirmed; and, only when they agreed to marketing,
# Mailchimp (the company audience "MW-Photo Tours", tags MWP Shop + Shop: free guide: the shop's list).
MAILCHIMP = 10006193        # Matan's Mailchimp connection
MC_LIST = "efdeac6ec5"      # MW-Photo Tours audience
CONFIRMED_COLS = '"color_mm8fc7jc":{"label":"{{1.language_label}}"},"color_mm8fazp":{"label":"Confirmed"}'
# a monday notification to Matan for every confirmed sign-up (Matan, 25 Oct 2026)
q_notify_lead = "mutation ($id: ID!, $text: String!) { create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text } }" % MATAN
LEAD_NOTE = "New free guide sign-up: {{1.name}} ({{1.language_label}}), now on the newsletter."
lead_route = [
    gql(162, q_find_cust_lead, {"email": "{{1.email}}"}, "Find customer",
        f("Free guide confirmed", ("{{1.type}}", "text:equal", "lead_confirmed"))),
    router(163, [
        [gql(164, q_change % B_CUS, {"id": "{{162.body.data.cust.items[1].id}}",
                                     "cv": '{"color_mm8fazp":{"label":"Confirmed"},{{1.phone_cv}}{{1.newsletter_cv}}'
                                           '"color_mm8fc7jc":{"label":"{{1.language_label}}"}}'},
             "Mark confirmed", f("Known", ("{{162.body.data.cust.items[1].id}}", "exist", None)))],
        [gql(165, q_create_labels, {"name": "{{1.name}}",
                                    "cv": '{"email_mm80mvf8":{"email":"{{1.email}}","text":"{{1.email}}"},{{1.phone_cv}}' + CONFIRMED_COLS + ','
                                          '"date_mm8fvxh9":{"date":"{{1.confirmed_on}}"},"color_mm806z0h":{"label":"New"},'
                                          '"color_mm801rf2":{"label":"{{1.newsletter_label}}"},"dropdown_mm80egg7":{"labels":["Free guide"]}}'},
             "New (sign-up missed)", f("New", ("{{162.body.data.cust.items[1].id}}", "notexist", None)))],
        [{"id": 166, "module": "mailchimp:addUpdateASubscriber", "version": 2,
          "parameters": {"__IMTCONN__": MAILCHIMP},
          "mapper": {"select": "list", "list": MC_LIST, "email_address": "{{1.email}}", "createOrUpdate": True,
                     "status": "subscribed", "email_type": "html", "language": "{{1.language}}", "interests": {},
                     "merge_fields": {"FNAME": "{{1.first_name}}", "LNAME": "{{1.last_name}}", "PHONE": "{{1.phone}}", "ADDRESS": {}},
                     "tags": [{"name": "MWP Shop", "status": "active"}, {"name": "Shop: free guide", "status": "active"}]},
          "metadata": {"designer": {"x": 0, "y": 0, "name": "Mailchimp: MWP Shop (Hebrew)"}},
          "filter": f("Agreed, Hebrew", ("{{1.marketing}}", "text:equal", "yes"), ("{{1.language}}", "text:notequal", "en"))}],
        # English speakers carry the audience's own tag lang_en: the newsletters' Hebrew segment is everyone without it
        # (Matan, 25 Oct 2026). Never the welcome_he / welcome_en tags: those belong to the tours' welcome emails.
        [{"id": 171, "module": "mailchimp:addUpdateASubscriber", "version": 2,
          "parameters": {"__IMTCONN__": MAILCHIMP},
          "mapper": {"select": "list", "list": MC_LIST, "email_address": "{{1.email}}", "createOrUpdate": True,
                     "status": "subscribed", "email_type": "html", "language": "en", "interests": {},
                     "merge_fields": {"FNAME": "{{1.first_name}}", "LNAME": "{{1.last_name}}", "PHONE": "{{1.phone}}", "ADDRESS": {}},
                     "tags": [{"name": "MWP Shop", "status": "active"}, {"name": "Shop: free guide", "status": "active"},
                              {"name": "lang_en", "status": "active"}]},
          "metadata": {"designer": {"x": 0, "y": 0, "name": "Mailchimp: MWP Shop (English, lang_en)"}},
          "filter": f("Agreed, English", ("{{1.marketing}}", "text:equal", "yes"), ("{{1.language}}", "text:equal", "en"))}],
        [gql(169, q_lead_change, {"id": "{{162.body.data.lead.items[1].id}}",
                                  "cv": '{"lead_status":{"label":"Confirmed"},' + LEAD_PHONE +
                                        '"marketing":{"label":"{{switch(1.marketing; "yes"; "Yes"; "No")}}"},'
                                        '"confirmed_on":{"date":"{{1.confirmed_on}}"}}'},
             "Leads board: confirmed", f("Lead on the board", ("{{162.body.data.lead.items[1].id}}", "exist", None))),
         gql(172, q_notify_lead, {"id": "{{162.body.data.lead.items[1].id}}", "text": LEAD_NOTE}, "Tell Matan")],
        [gql(170, q_lead_create, {"name": "{{1.name}}",
                                  "cv": '{"email":{"email":"{{1.email}}","text":"{{1.email}}"},' + LEAD_PHONE +
                                        '"lead_status":{"label":"Confirmed"},"language":{"label":"{{1.language_label}}"},'
                                        '"marketing":{"label":"{{switch(1.marketing; "yes"; "Yes"; "No")}}"},'
                                        '"confirmed_on":{"date":"{{1.confirmed_on}}"}}'},
             "Leads board: confirmed (sign-up missed)", f("Not on the board", ("{{162.body.data.lead.items[1].id}}", "notexist", None))),
         gql(173, q_notify_lead, {"id": "{{170.body.data.create_item.id}}", "text": LEAD_NOTE}, "Tell Matan")],
    ]),
]

# ---------------------------------------------------------------- products (shop admin → monday)
B_REP = 5105818461
q_find_product = """query ($slug: String!) {
  p: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm80txve", column_values: [$slug]}]) { items { id group { id } column_values(ids: ["color_mm80c109"]) { text } } }
}""" % B_PRD
product_cv_common = (
    '"color_mm80s3hp":{"label":"{{1.category_label}}"},'
    '"numeric_mm80psz":"{{1.price}}","text_mm80txve":"{{1.slug}}","text_mm80962d":"{{1.variant_id}}",'
    '"link_mm80eg76":{"url":"{{1.shop_url}}","text":"Shop page"},'
    '"text_mm80f6jz":"{{1.version}}","numeric_mm80vj8n":"{{1.item_count}}"'
)
q_update_product = """mutation ($id: ID!, $cv: JSON!, $group: String!) {
  c: change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id }
  g: move_item_to_group(item_id: $id, group_id: $group) { id }
}""" % B_PRD
P = "{{20.body.data.p.items[1]"
R = "20.body.data.p.items[1]"
product_route = [
    gql(20, q_find_product, {"slug": "{{1.slug}}"}, "Find product",
        f("Product", ("{{1.type}}", "text:equal", "product"))),
    router(21, [
        [gql(22, q_create % B_PRD, {"name": "{{1.name}}",
                                    "group": '{{switch(1.status_label; "Live"; "group_mm80bp79"; "topics")}}',
                                    "cv": '{' + product_cv_common + ',"color_mm80c109":{"label":"{{1.status_label}}"}}'},
             "New product", f("Not on the board yet", (P + ".id}}", "notexist", None)))],
        [gql(23, q_update_product, {
            "id": P + ".id}}",
            # Matan owns the Status; the shop only ever moves it to Live.
            "cv": '{"name":"{{1.name}}",' + product_cv_common +
                  ',"color_mm80c109":{"label":"{{switch(1.status_label; "Live"; "Live"; ' + R + '.column_values[1].text)}}"}}',
            "group": '{{switch(1.status_label; "Live"; "group_mm80bp79"; ' + R + '.group.id)}}'},
             "Update product", f("Already on the board", (P + ".id}}", "exist", None)))],
    ]),
]

# ---------------------------------------------------------------- approvals (monday → shop)
q_approvals = """query {
  boards(ids: [%d]) { items_page(limit: 500) { items { name column_values(ids: ["text_mm80txve", "boolean_mm80an1f", "color_mm80c109"]) { id text } } } }
}""" % B_PRD
approvals_route = [
    gql(30, q_approvals, {}, "Read approvals", f("Approvals request", ("{{1.type}}", "text:equal", "approvals_request"))),
    {"id": 31, "module": "json:TransformToJSON", "version": 1, "parameters": {},
     "mapper": {"object": "{{30.body.data}}"}, "metadata": {"designer": {"x": 0, "y": 0, "name": "Board as JSON"}}},
    {"id": 32, "module": "http:MakeRequest", "version": 4, "parameters": {"authenticationType": "noAuth"},
     "mapper": {"url": "{{1.callback_url}}", "method": "post", "contentType": "json", "inputMethod": "jsonString",
                "jsonStringBodyContent": '{"job":"approvals_callback","nonce":"{{1.nonce}}","data":{{31.json}}}',
                "parseResponse": True, "stopOnHttpError": True, "allowRedirects": True, "shareCookies": False,
                "requestCompressedContent": True},
     "metadata": {"designer": {"x": 0, "y": 0, "name": "Send approvals to the shop"}}},
]

# ---------------------------------------------------------------- weekly summary → Shop Reports
report_cv = ('{"timerange_mm81dst2":{"from":"{{1.week_from}}","to":"{{1.week_to}}"},'
             '"numeric_mm81hwhx":"{{1.orders}}","numeric_mm81p9jv":"{{1.gross}}","numeric_mm8117be":"{{1.refunded}}",'
             '"numeric_mm81aqe3":"{{1.net}}","text_mm81n39e":"{{1.currency}}","numeric_mm813xj":"{{1.new_customers}}",'
             '"numeric_mm812e2w":"{{1.open_tickets}}","text_mm81rfmv":"{{1.best_seller}}"}')
q_report_update = """mutation ($id: ID!, $body: String!, $text: String!) {
  u: create_update(item_id: $id, body: $body) { id }
  n: create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text }
}""" % MATAN
weekly_route = [
    gql(40, q_create % B_REP, {"name": "{{1.title}}", "group": "topics", "cv": report_cv}, "Add weekly report",
        f("Weekly summary", ("{{1.type}}", "text:equal", "weekly_summary"))),
    gql(41, q_report_update, {"id": "{{40.body.data.create_item.id}}", "body": "{{1.summary_html}}",
                              "text": "Shop weekly summary: {{1.orders}} orders, net {{1.net}} {{1.currency}}."},
        "Post summary and tell Matan"),
]

# ---------------------------------------------------------------- month close → Shop Payouts
B_PAY = 5105799192
q_month_orders = ('query { o: items_page_by_column_values(board_id: %d, limit: 500, columns: [{column_id: "text_mm806h06", '
                  'column_values: [{{1.checkout_order_ids_gql}}]}]) { items { id } } }') % B_ORD
payout_cv = ('{"color_mm809a4z":{"label":"Scheduled"},'
             '"timerange_mm8096h7":{"from":"{{1.period_from}}","to":"{{1.period_to}}"},'
             '"numeric_mm8013gm":"{{1.gross}}","numeric_mm8012hc":"{{1.refunds}}","text_mm80j987":"{{1.currency}}",'
             '"board_relation_mm803geg":{"item_ids":[{{join(map(50.body.data.o.items; "id"); ",")}}]}}')
payout_route = [
    gql(50, q_month_orders, {}, "Find last month's orders", f("Month close", ("{{1.type}}", "text:equal", "payout"))),
    gql(51, q_create % B_PAY, {"name": "{{1.title}}", "group": "topics", "cv": payout_cv}, "Add payout row"),
]

# ---------------------------------------------------------------- ambassador (Ambassador Program sign-up)
q_amb_lookup = """query ($email: String!) {
  a: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm8331he", column_values: [$email]}]) { items { id } }
}""" % B_AMB
amb_cv = ('{"color_mm8391jm":{"label":"Active"},"email_mm8331he":{"email":"{{1.email}}","text":"{{1.email}}"},'
          '"text_mm83z0v6":"{{1.instagram}}","text_mm83q03t":"{{1.facebook}}",'
          '"date_mm83z07a":{"date":"{{1.agreed_on}}"},"date_mm83mwfv":{"date":"{{1.first_months_end}}"},'
          '"date_mm83s7ad":{"date":"{{1.ends_on}}"},"color_mm835th0":{"label":"Not checked"},'
          '"text_mm831gvm":"{{1.terms_version}}","text_mm837ysb":"{{1.products}}"}')
amb_update_cv = ('{"text_mm83z0v6":"{{1.instagram}}","text_mm83q03t":"{{1.facebook}}","text_mm831gvm":"{{1.terms_version}}",'
                 '"text_mm837ysb":"{{1.products}}"}')
ambassador_route = [
    gql(60, q_amb_lookup, {"email": "{{1.email}}"}, "Find ambassador",
        f("Ambassador", ("{{1.type}}", "text:equal", "ambassador"))),
    router(61, [
        [gql(62, """mutation ($name: String!, $cv: JSON!) {
  c: create_item(board_id: %d, group_id: "topics", item_name: $name, column_values: $cv) { id }
}""" % B_AMB, {"name": "{{1.name}}", "cv": amb_cv}, "New ambassador",
             f("New", ("{{60.body.data.a.items[1].id}}", "notexist", None))),
         gql(63, "mutation ($id: ID!, $text: String!) { create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text } }" % MATAN,
             {"id": "{{62.body.data.c.id}}",
              "text": "New MWP ambassador: {{1.name}} {{1.instagram}} accepted the Ambassador Program terms and got free access."},
             "Tell Matan")],
        [gql(64, "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id } }" % B_AMB,
             {"id": "{{60.body.data.a.items[1].id}}", "cv": amb_update_cv}, "Joined again: update",
             f("Already on the board", ("{{60.body.data.a.items[1].id}}", "exist", None)))],
    ]),
]

# ---------------------------------------------------------------- account (new confirmed account → Shop Customers)
q_cust_by_email = """query ($email: String!) {
  cust: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id } }
}""" % B_CUS
account_cv = ('{"email_mm80mvf8":{"email":"{{1.email}}","text":"{{1.email}}"},"color_mm801rf2":{"label":"Not subscribed"},'
              '"dropdown_mm80egg7":{"labels":["{{1.source}}"]},"long_text_mm80s2st":{"text":"Account created {{1.joined_on}}"}}')
account_route = [
    gql(70, q_cust_by_email, {"email": "{{1.email}}"}, "Find customer", f("Account", ("{{1.type}}", "text:equal", "account"))),
    gql(72, """mutation ($name: String!, $cv: JSON!) {
  c: create_item(board_id: %d, group_id: "topics", item_name: $name, column_values: $cv, create_labels_if_missing: true) { id }
}""" % B_CUS, {"name": "{{1.name}}", "cv": account_cv}, "New customer (account)",
        f("Not on the board yet", ("{{70.body.data.cust.items[1].id}}", "notexist", None))),
]

# ---------------------------------------------------------------- downloaded (first download → order Delivery)
downloaded_route = [
    gql(80, """query ($id: String!) {
  o: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "text_mm806h06", column_values: [$id]}]) { items { id } }
}""" % B_ORD, {"id": "{{1.checkout_order_id}}"}, "Find order", f("Downloaded", ("{{1.type}}", "text:equal", "downloaded"))),
    gql(81, "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id } }" % B_ORD,
        {"id": "{{80.body.data.o.items[1].id}}", "cv": '{"color_mm80ztk6":{"label":"Downloaded"}}'}, "Delivery: Downloaded",
        f("Order found", ("{{80.body.data.o.items[1].id}}", "exist", None))),
]

# ---------------------------------------------------------------- ambassador_status (ended in the shop admin)
ambassador_status_route = [
    gql(90, q_amb_lookup, {"email": "{{1.email}}"}, "Find ambassador",
        f("Ambassador status", ("{{1.type}}", "text:equal", "ambassador_status"))),
    gql(91, """mutation ($id: ID!, $cv: JSON!, $note: String!) {
  c: change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id }
  u: create_update(item_id: $id, body: $note) { id }
}""" % B_AMB, {"id": "{{90.body.data.a.items[1].id}}",
               "cv": '{"color_mm8391jm":{"label":"{{1.status_label}}"},"date_mm83s7ad":{"date":"{{1.ended_on}}"}}',
               "note": "Ambassadorship set to {{1.status_label}} on {{1.ended_on}} in the shop admin."},
        "Update status", f("Found", ("{{90.body.data.a.items[1].id}}", "exist", None))),
]

# ---------------------------------------------------------------- ambassador_terms_pdf (signed terms → file column)
# ---------------------------------------------------------------- tester (approved / removed in the shop admin → Shop Testers)
q_tst_lookup = """query ($email: String!) {
  t: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "email_mm83cv73", column_values: [$email]}]) { items { id } }
}""" % B_TST
tst_cv = ('{"color_mm83c278":{"label":"{{1.status_label}}"},"email_mm83cv73":{"email":"{{1.email}}","text":"{{1.email}}"},'
          '"date_mm837r4w":{"date":"{{1.added_on}}"},"date_mm83wrd9":{"date":"{{1.removed_on}}"},"text_mm833w4f":"{{1.products}}"}')
tester_route = [
    gql(110, q_tst_lookup, {"email": "{{1.email}}"}, "Find tester", f("Tester", ("{{1.type}}", "text:equal", "tester"))),
    router(111, [
        [gql(112, """mutation ($name: String!, $cv: JSON!) {
  c: create_item(board_id: %d, group_id: "topics", item_name: $name, column_values: $cv, create_labels_if_missing: true) { id }
}""" % B_TST, {"name": "{{1.name}}", "cv": tst_cv}, "New tester",
             f("New", ("{{110.body.data.t.items[1].id}}", "notexist", None)))],
        [gql(113, "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv, create_labels_if_missing: true) { id } }" % B_TST,
             {"id": "{{110.body.data.t.items[1].id}}", "cv": tst_cv}, "Update tester",
             f("Already on the board", ("{{110.body.data.t.items[1].id}}", "exist", None)))],
    ]),
]



# ---------------------------------------------------------------- ambassador applications (/beta/ questionnaire)
# ambassador_application → a row on Shop Ambassador Applications (+ tells Matan).
# applications_request   → (every 10 min while some wait) the board goes back to the shop's scheduler.
# application_decided    → the shop acted on a decision: Shop result, and (with GMAIL) the email to the applicant.
B_APP = 5105977396   # Shop Ambassador Applications
GMAIL = int(sys.argv[2]) if len(sys.argv) > 2 else None   # Make's Gmail connection for contact@matanwildphotography.com (11893994)
app_cv = ('{"decision":{"label":"New"},"shop_result":{"label":"Waiting"},"email":{"email":"{{1.email}}","text":"{{1.email}}"},'
          '"language":"{{1.language}}","instagram":"{{1.platforms}}","portfolio":"{{1.work}}","applied":{"date":"{{1.applied_on}}"},'
          '"commitment":"{{1.sounds_good}}","feedback":"{{1.feedback}}","answers":{"text":"{{1.answers_text}}"},'
          '"application_id":"{{1.application_id}}"}')
application_route = [
    gql(120, q_create % B_APP, {"name": "{{1.name}}", "group": "topics", "cv": app_cv}, "New application",
        f("Application", ("{{1.type}}", "text:equal", "ambassador_application"))),
    gql(121, "mutation ($id: ID!, $text: String!) { create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text } }" % MATAN,
        {"id": "{{120.body.data.create_item.id}}",
         "text": "New Ambassador Program application from {{1.name}}. Set Decision to Approved or Declined."},
        "Tell Matan"),
]
q_applications = """query {
  boards(ids: [%d]) { items_page(limit: 500) { items { column_values(ids: ["application_id", "decision"]) { id text } } } }
}""" % B_APP
applications_request_route = [
    gql(125, q_applications, {}, "Read decisions", f("Applications request", ("{{1.type}}", "text:equal", "applications_request"))),
    {"id": 126, "module": "json:TransformToJSON", "version": 1, "parameters": {},
     "mapper": {"object": "{{125.body.data}}"}, "metadata": {"designer": {"x": 0, "y": 0, "name": "Board as JSON"}}},
    {"id": 127, "module": "http:MakeRequest", "version": 4, "parameters": {"authenticationType": "noAuth"},
     "mapper": {"url": "{{1.callback_url}}", "method": "post", "contentType": "json", "inputMethod": "jsonString",
                "jsonStringBodyContent": '{"job":"applications_callback","nonce":"{{1.nonce}}","data":{{126.json}}}',
                "parseResponse": True, "stopOnHttpError": True, "allowRedirects": True, "shareCookies": False,
                "requestCompressedContent": True},
     "metadata": {"designer": {"x": 0, "y": 0, "name": "Send decisions to the shop"}}},
]
q_app_lookup = """query ($id: String!) {
  a: items_page_by_column_values(board_id: %d, limit: 1, columns: [{column_id: "application_id", column_values: [$id]}]) { items { id } }
}""" % B_APP
application_decided_route = [
    gql(130, q_app_lookup, {"id": "{{1.application_id}}"}, "Find application",
        f("Application decided", ("{{1.type}}", "text:equal", "application_decided"))),
    gql(131, "mutation ($id: ID!, $cv: JSON!) { change_multiple_column_values(board_id: %d, item_id: $id, column_values: $cv) { id } }" % B_APP,
        {"id": "{{130.body.data.a.items[1].id}}", "cv": '{"shop_result":{"label":"{{1.result}}"}}'}, "Shop result",
        f("Found", ("{{130.body.data.a.items[1].id}}", "exist", None))),
]
if GMAIL:
    application_decided_route.append(
        {"id": 132, "module": "google-email:sendAnEmail", "version": 4, "parameters": {"__IMTCONN__": GMAIL},
         "mapper": {"to": ["{{1.email}}"], "subject": "{{1.subject}}", "bodyType": "rawHtml", "content": "{{1.body_html}}"},
         "filter": f("Email the applicant", ("{{1.send_email}}", "text:equal", "yes")),
         "metadata": {"designer": {"x": 0, "y": 0, "name": "Email the applicant"}}})

# ---------------------------------------------------------------- feedback (ambassadors and testers, from My downloads)
B_FB = 5105987095   # Shop Feedback
fb_cv = ('{"status":{"label":"New"},"kind":{"label":"{{1.kind}}"},"product":"{{1.product}}","from_role":"{{1.from_role}}",'
         '"email":{"email":"{{1.email}}","text":"{{1.email}}"},"sent":{"date":"{{1.sent_on}}"},'
         '"message":{"text":"{{1.message}}"},"setup":"{{1.setup}}"}')
feedback_route = [
    gql(140, q_create % B_FB, {"name": "{{1.kind}} · {{1.product}} · {{1.name}}", "group": "topics", "cv": fb_cv}, "New feedback",
        f("Feedback", ("{{1.type}}", "text:equal", "feedback"))),
    gql(141, "mutation ($id: ID!, $text: String!) { create_notification(user_id: %d, target_id: $id, text: $text, target_type: Project) { text } }" % MATAN,
        {"id": "{{140.body.data.create_item.id}}", "text": "{{1.kind}} from {{1.name}} ({{1.from_role}}) about {{1.product}}."},
        "Tell Matan"),
]

# ---------------------------------------------------------------- customer_deleted (deleted in Supabase → gone from monday)
# Their rows on every shop board with people (found by email) go to monday's trash.
q_person_rows = """query ($email: String!) {
  c: items_page_by_column_values(board_id: %d, limit: 25, columns: [{column_id: "email_mm80mvf8", column_values: [$email]}]) { items { id } }
  a: items_page_by_column_values(board_id: %d, limit: 25, columns: [{column_id: "email_mm8331he", column_values: [$email]}]) { items { id } }
  t: items_page_by_column_values(board_id: %d, limit: 25, columns: [{column_id: "email_mm83cv73", column_values: [$email]}]) { items { id } }
  p: items_page_by_column_values(board_id: %d, limit: 25, columns: [{column_id: "email", column_values: [$email]}]) { items { id } }
  f: items_page_by_column_values(board_id: %d, limit: 50, columns: [{column_id: "email", column_values: [$email]}]) { items { id } }
}""" % (B_CUS, B_AMB, B_TST, B_APP, B_FB)
customer_deleted_route = [
    gql(150, q_person_rows, {"email": "{{1.email}}"}, "Find their rows",
        f("Customer deleted", ("{{1.type}}", "text:equal", "customer_deleted"))),
    {"id": 151, "module": "builtin:BasicFeeder", "version": 1, "parameters": {},
     "mapper": {"array": "{{merge(150.body.data.c.items; 150.body.data.a.items; 150.body.data.t.items; 150.body.data.p.items; 150.body.data.f.items)}}"},
     "metadata": {"designer": {"x": 0, "y": 0, "name": "Each row"}}},
    gql(152, "mutation ($id: ID!) { delete_item(item_id: $id) { id } }", {"id": "{{151.id}}"}, "Delete row"),
]


def module(mid, name, mod, version, parameters, mapper, filt=None):
    m = {"id": mid, "module": mod, "version": version, "parameters": parameters, "mapper": mapper,
         "metadata": {"designer": {"x": 0, "y": 0, "name": name}}}
    if filt:
        m["filter"] = filt
    return m

terms_pdf_route = [
    gql(100, q_amb_lookup, {"email": "{{1.email}}"}, "Find ambassador",
        f("Signed terms", ("{{1.type}}", "text:equal", "ambassador_terms_pdf"))),
    module(101, "Download the PDF (one-hour private link)", "http:MakeRequest", 4, {"authenticationType": "noAuth"},
           {"url": "{{1.file_url}}", "method": "get", "parseResponse": False, "stopOnHttpError": True,
            "allowRedirects": True, "shareCookies": False, "requestCompressedContent": True},
           f("Found", ("{{100.body.data.a.items[1].id}}", "exist", None))),
    module(102, "Attach to Signed terms", "monday:AddFileToFileColumnValueV2", 2, {"__IMTCONN__": CONN},
           {"boardId": str(B_AMB), "itemId": "{{100.body.data.a.items[1].id}}", "columnId": "file_mm83gkaq",
            "filename": "{{1.file_name}}", "data": "{{101.data}}"}),
]

blueprint = {
    "name": "MWP Shop · Events to monday (orders, products, support, reports)",
    "flow": [
        {"id": 1, "module": "gateway:CustomWebHook", "version": 1,
         "parameters": {"hook": HOOK, "maxResults": 1}, "mapper": {},
         "metadata": {"designer": {"x": 0, "y": 0}}},
        router(2, [order_route, refund_route, support_route, subscribe_route,
                   product_route, approvals_route, weekly_route, payout_route, ambassador_route, account_route, downloaded_route, ambassador_status_route, terms_pdf_route, tester_route,
                   application_route, applications_request_route, application_decided_route, feedback_route, customer_deleted_route,
                   lead_route]),
    ],
    # sequential: False. With it on, one incomplete run (kept for review: dlq) holds every later event until someone
    # resolves it in Make; that froze the shop's monday sync and emails on 13 Oct 2026. Off, a failed run waits for
    # review on its own and the rest keep flowing.
    "metadata": {"version": 1, "scenario": {"roundtrips": 1, "maxErrors": 3, "autoCommit": True, "sequential": False,
                                            "confidential": False, "dataloss": False, "dlq": True}},
}

# lay modules out left to right so the editor shows a readable map
def layout(flow, x=0, y=0):
    for m in flow:
        m["metadata"]["designer"].update({"x": x, "y": y})
        if m.get("routes"):
            for i, r in enumerate(m["routes"]):
                layout(r["flow"], x + 300, y + i * 300)
        x += 300
layout(blueprint["flow"])

print(json.dumps(blueprint, ensure_ascii=False, indent=1))
