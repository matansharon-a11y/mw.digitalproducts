"""A live preview of MWP Panel in Photoshop for the Panel page (build_products.py, the "No way to ruin it" feature).

The Edit tab is drawn button for button from the real panel (the screenshot assets/pages/img/0f68e984…png): what to edit,
colours, the eight effects, the strength card with Paint in / Paint out, Touches, and the "Your edits" bar. Prepare, Style and
Export list what they hold, in the words of the page (the panel's own buttons there aren't in this repo yet; when the plugin
or screenshots of those tabs arrive, draw them like Edit). The panel's words stay in English: the plugin is in English.
Behaviour (chips, effects, slider, undo, reset, Before / After, tabs) in product-page.js.
"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


ICON = {   # the header's five icons: undo, redo, before / after, help, reset
    "undo": '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    "redo": '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    "ba": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    "help": '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14"/><path d="M12 17h.01"/>',
    "reset": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
}
TITLES = {"undo": "Undo", "redo": "Redo", "ba": "Before / After", "help": "Help", "reset": "Reset MWP"}


def icon(k):
    return (f'<button type="button" class="pw-ic" data-pw="{k}" title="{TITLES[k]}" aria-label="{TITLES[k]}"><svg viewBox="0 0 24 24" width="20" height="20" '
            f'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[k]}</svg></button>')


def chip(t, on=False, dot=None):
    d = f'<i style="background:{dot}"></i>' if dot else ""
    return f'<button type="button" class="pw-chip{" on" if on else ""}" data-pw-target="{esc(t)}">{d}{esc(t)}</button>'


def btn(t, effect=False):
    return f'<button type="button" class="pw-btn"{f' data-pw-effect="{esc(t)}"' if effect else ""}>{esc(t)}</button>'


COLORS = [("Reds", "#e2483d"), ("Yellows", "#e8c22c"), ("Greens", "#43a85a"), ("Cyans", "#3cb6c8"), ("Blues", "#3d6fe0"), ("Magentas", "#c74fc0")]
EFFECTS = ["Pop", "Brighten", "Darken", "Warm", "Cool", "Glow", "Blur", "Sharpen"]
TOUCHES = ["Dodge & Burn", "Vignette", "Stamp", "Camera Raw"]
# Prepare, Style and Export: what each tab holds, from the page's "What's inside" cards
TABS = {
    "Prepare": ["Crop around the animal", "Straighten", "Find and erase dust", "Denoise", "Neutral color in one tap"],
    "Style": ["11 looks, from golden to blue hour to B&W", "Sun glow", "Sunbeams", "Rim light", "Spotlight"],
    "Export": ["Your own watermark", "Instagram, web and print copies", "Apply your edit to a whole series"],
}
CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'


def window(logo):
    tabs = "".join(f'<button type="button" role="tab" data-pw-tab="{t}" aria-selected="{str(t == "Edit").lower()}"{" class=on" if t == "Edit" else ""}>{t}</button>'
                   for t in ("Prepare", "Edit", "Style", "Export"))
    edit = (
        '<p class="pw-h">1 · What to edit</p>'
        f'<div class="pw-chips">{"".join(chip(t, t == "Subject") for t in ("Subject", "Eye", "Sky", "Background", "Lights", "Darks", "Pick"))}</div>'
        '<p class="pw-hint">Hold a chip to preview its mask.</p>'
        '<p class="pw-h">Colors</p>'
        f'<div class="pw-chips">{"".join(chip(t, dot=c) for t, c in COLORS)}</div>'
        '<div class="pw-select">More tones · Brightest to Darkest<span>▾</span></div>'
        '<p class="pw-h">2 · Effect</p>'
        f'<div class="pw-grid">{"".join(btn(e, effect=True) for e in EFFECTS)}</div>'
        '<div class="pw-card"><div class="pw-card-top"><span data-pw-now>No edit yet</span><span>–</span></div>'
        '<input class="pw-range" type="range" min="0" max="100" value="0" aria-label="Strength" disabled>'
        '<div class="pw-paint"><button type="button" class="pw-pill">+ Paint in</button><button type="button" class="pw-pill">− Paint out</button></div></div>'
        '<p class="pw-hint">Every button is one step. Ctrl+Z (Cmd+Z) undoes it.</p>'
        '<p class="pw-h">Touches</p>'
        f'<div class="pw-grid">{"".join(btn(t) for t in TOUCHES)}</div>'
    )
    others = "".join(f'<div class="pw-pane" role="tabpanel" data-pw-pane="{t}" hidden><p class="pw-h">In this tab</p><ul class="pw-list">'
                     + "".join(f"<li>{CHECK}{esc(x)}</li>" for x in items)
                     + '</ul><p class="pw-hint">Every button in it is in the User Manual (PDF) that comes with the panel.</p></div>'
                     for t, items in TABS.items())
    return (f'<div class="pw" lang="en" dir="ltr" data-no-i18n data-pw aria-label="MWP Photoshop Plugin Panel in Photoshop (preview)">'
            f'<div class="pw-top"><span class="pw-logo"><img src="{logo}" alt="" width="22" height="23"></span><b>MW PHOTO TOURS</b>'
            f'<span class="pw-icons">{"".join(icon(k) for k in ("undo", "redo", "ba", "help", "reset"))}</span></div>'
            f'<div class="pw-tabs" role="tablist">{tabs}</div>'
            f'<div class="pw-scroll"><div class="pw-pane" role="tabpanel" data-pw-pane="Edit">{edit}</div>{others}</div>'
            f'<div class="pw-foot">Your edits · <b data-pw-count>0</b><span>▲</span></div></div>')
