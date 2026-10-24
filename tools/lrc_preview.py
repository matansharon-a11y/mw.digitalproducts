"""A preview of MWP Panel's Lightroom Classic window for the Panel page (build_products.py, section #lightroom-classic).

Drawn in HTML from the plugin itself (MWP-Panel.lrplugin: Panel.lua for the layout, Data.lua for the labels, img/look_*.png
for the look tiles in assets/pages/img/lrc/), so every tab, button and slider is the real one. The panel's own words stay in
English on both pages: the plugin is in English. Behaviour (tabs, the Looks category, slider numbers) in product-page.js.
When the plugin's tabs or buttons change, change them here too.
"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def btn(t, cls=""):
    return f'<span class="lw-btn{" " + cls if cls else ""}">{esc(t)}</span>'


def row(*items, cls=""):
    return f'<div class="lw-row{" " + cls if cls else ""}">{"".join(items)}</div>'


def grid(items, per):
    return f'<div class="lw-grid" style="--per:{per}">{"".join(items)}</div>'


def slider(label, value, lo, hi, fmt="", wide=False):
    shown = f"{value:.1f}s" if fmt == "s" else str(value)
    return (f'<label class="lw-sl{" wide" if wide else ""}">{f"<span>{esc(label)}</span>" if label else ""}'
            f'<input class="lw-range" type="range" min="{lo}" max="{hi}" step="{0.1 if fmt == "s" else 1}" value="{value}" data-fmt="{fmt}" aria-label="{esc(label or "Strength")}">'
            f'<output>{shown}</output></label>')


def field(ph, cls=""):
    return f'<span class="lw-in{" " + cls if cls else ""}">{esc(ph)}</span>'


def menu(t, cls=""):
    return f'<span class="lw-menu{" " + cls if cls else ""}">{esc(t)}</span>'


def radio(t, on=False):
    return f'<span class="lw-radio{" on" if on else ""}"><i></i>{esc(t)}</span>'


def note(t):
    return f'<p class="lw-note">{esc(t)}</p>'


SEP = '<hr class="lw-sep">'

LOOKS = [("Classic", [("bw", "B&W"), ("moody", "Moody"), ("matte", "Matte"), ("clean", "Clean"), ("rich", "Rich color")]),
         ("Time of day", [("golden", "Golden"), ("bluehour", "Blue hour"), ("night", "Day to night"), ("dusk", "Dusk")]),
         ("Place", [("savanna", "Savanna"), ("forest", "Forest")]),
         ("Season", [("fall", "Fall foliage"), ("winter", "Winter cool"), ("spring", "Spring fresh")])]


def panes():
    cull = (row(slider("Gap (sec)", 1.0, 0.2, 3, "s"), slider("Min frames", 3, 2, 10))
            + btn("Find bursts in the selected photos", "full")
            + row(btn("◀"), '<span class="lw-txt">No bursts yet</span>', btn("▶"), btn("Find sharpest"), btn("Keep this frame"))
            + SEP + grid([btn(t) for t in ("To edit", "Portfolio", "Social", "Competition", "Best of the trip", "Clear")], 3)
            + btn("Trip summary"))
    organize = (row(field("Trip name, e.g. Kenya, March 2027", "grow"), btn("Build trip")) + SEP
                + field("Species: type a few letters (fox, roller, Panthera)", "full") + menu("Type 2 or more letters above", "full")
                + row(field("Behaviour"), field("Location"), field("Hide / vehicle"))
                + row(radio("Selected", True), radio("Whole burst"), btn("Apply"))
                + note("See and search these in Library › Metadata › MWP wildlife."))
    steps = [("Neutral color", "Set white balance"), ("Light", "Balance the light"), ("The animal", "Subject · Pop"),
             ("The sky", "Sky · Darken"), ("The background", "Background · Darken"), ("A look", "Go to Looks")]
    expedition = ('<div class="lw-steps">' + "".join(f'<span class="lw-step">{i}  {esc(t)}</span>{btn(b)}' for i, (t, b) in enumerate(steps, 1)) + "</div>"
                  + note("Top to bottom. Skip what the photo does not need. Hover a step for its tip."))
    cats = "".join(f'<option{" selected" if k == 0 else ""}>{esc(c)}</option>' for k, (c, _) in enumerate(LOOKS))
    tiles = "".join(f'<span class="lw-look" data-cat="{esc(c)}"{"" if c == "Classic" else " hidden"}><img src="/assets/pages/img/lrc/look_{key}.png" alt="" width="80" height="50" loading="lazy">{btn(t, "sm")}</span>'
                    for c, looks in LOOKS for key, t in looks)
    looks = (row(f'<select class="lw-menu lw-select" data-lrc-cat aria-label="Look category">{cats}</select>', slider("", 80, 0, 100, wide=True))
             + f'<div class="lw-looks">{tiles}</div>'
             + row(btn("Remove look"), menu("My looks"), btn("Apply"), btn("Save…")))
    edit = (grid([radio(t, t == "Subject") for t in ("Subject", "Sky", "Background", "People", "Whole photo")], 3)
            + grid([btn(t) for t in ("Pop", "Brighten", "Darken", "Warm", "Cool", "Glow", "Soften", "Sharpen")], 4)
            + row(slider("Strength", 60, 0, 100, wide=True))
            + row(btn("Undo last effect"), note("Denoise first. Masks made before Denoise: Masks panel › Update."))
            + SEP + row('<b class="lw-txt">Subject vignette</b>', btn("Add"))
            + row(slider("Darken", 50, 0, 100), slider("Soften", 50, 0, 100)) + row(slider("Edges", 0, 0, 100)))
    color = (row(menu("Green"), btn("Reset color"), btn("Reset all"))
             + slider("Hue", 0, -100, 100, wide=True) + slider("Saturation", 0, -100, 100, wide=True) + slider("Luminance", 0, -100, 100, wide=True)
             + grid([btn(t) for t in ("Calm greens", "Deeper sky", "Warm fur", "Bright eyes", "Clean water", "Natural skin")], 3)
             + note("Whole photo. For one area, use Edit. Hover a fix to see what it does."))
    export = (row('<span class="lw-txt grow">Choose where exports go</span>', btn("Folder…"), btn("Open"))
              + row(menu("No watermark", "grow"), btn("Reload"))
              + grid([btn(t) for t in ("Instagram feed", "Stories and Reels", "Web", "Print", "Competition", "Competition check")], 3)
              + SEP + row(btn("Send to MWP…"), note("Up to 5 photos, prepared in a folder.")))
    return [("cull", "Cull", cull), ("organize", "Organize", organize), ("guided", "Expedition", expedition), ("looks", "Looks", looks),
            ("edit", "Edit", edit), ("color", "Color", color), ("export", "Export", export)]


def window(start="looks"):
    """The window: title bar, the seven tabs, the chosen tab's controls, the status line and Help."""
    ps = panes()
    tabs = "".join(f'<button type="button" role="tab" data-lrc-tab="{k}" aria-selected="{str(k == start).lower()}"{" class=on" if k == start else ""}>{t}</button>'
                   for k, t, _ in ps)
    body = "".join(f'<div class="lw-pane" role="tabpanel" data-lrc-pane="{k}"{"" if k == start else " hidden"}>{html}</div>' for k, _, html in ps)
    return (f'<div class="lw" lang="en" dir="ltr" data-no-i18n aria-label="MWP in Lightroom Classic (preview)">'
            f'<div class="lw-bar"><i></i><i></i><i></i><span>MWP · Lightroom Classic</span></div>'
            f'<div class="lw-tabs" role="tablist">{tabs}</div><div class="lw-body">{body}</div>'
            f'<div class="lw-foot"><span>Select photos in Lightroom, then pick a tab.</span>{btn("Help")}</div></div>')
