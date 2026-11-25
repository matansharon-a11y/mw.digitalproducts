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

LOOKS = [("Classic", [("moody", "Moody"), ("matte", "Matte"), ("clean", "Clean"), ("rich", "Rich color")]),   # B&W left in 1.7.1
         ("Time of day", [("golden", "Golden"), ("bluehour", "Blue hour"), ("night", "Day to night"), ("dusk", "Dusk")]),
         ("Place", [("savanna", "Savanna"), ("forest", "Forest")]),
         ("Season", [("fall", "Fall foliage"), ("winter", "Winter cool"), ("spring", "Spring fresh")]),
         ("Glow", [("softglow", "Soft glow"), ("mist", "Morning mist"), ("backlight", "Backlight")])]   # plugin 1.5, Lightroom Classic 16


def panes():
    cull = (row(slider("Gap (sec)", 1.0, 0.2, 3, "s"), slider("Min frames", 3, 2, 10))
            + btn("Find bursts in the selected photos", "full")
            + row(btn("◀"), '<span class="lw-txt">No bursts yet</span>', btn("▶"), btn("Find sharpest"), btn("Keep this frame"))
            + SEP + row('<b class="lw-txt">MWP marks</b>', btn("Customize…"))
            + grid([btn(t) for t in ("To edit", "Portfolio", "Social", "Competition", "Best of the trip", "Clear")], 3)
            + row('<span class="lw-txt">Label</span>', *[btn(t) for t in ("Red", "Yellow", "Green", "Blue", "Purple")])
            + row('<span class="lw-txt">Stars</span>', *[btn("★" * n) for n in range(1, 6)])
            + row(btn("Trip summary"), btn("Reset…")))
    clean = (note("High ISO? Denoise first, before any mask.")
             + row(slider("Denoise", 50, 0, 100, wide=True), btn("Run Denoise"))
             + btn("Remove reflections", "full")
             + note("Both are Lightroom's own tools, started from here. They run on the photo in Develop."))   # plugin 1.7
    organize = (row(field("Trip name, e.g. Kenya, March 2027", "grow"), btn("Build trip")) + SEP
                + field("Species: type a few letters (fox, roller, Panthera)", "full") + menu("Type 2 or more letters above", "full")
                + row(field("Behaviour"), field("Location"), field("Hide / vehicle"))
                + row(radio("Selected", True), radio("Whole burst"), btn("Apply"))
                + note("See and search these in Library › Metadata › MWP wildlife."))
    steps = [("Neutral color", "Set white balance"), ("Light", "Balance the light"), ("The animal", "Subject · Pop"),
             ("The sky", "Sky · Calm"), ("The background", "Background · Darken")]
    expedition = ('<div class="lw-steps">' + "".join(f'<span class="lw-step">{i}  {esc(t)}</span>{btn(b)}' for i, (t, b) in enumerate(steps, 1)) + "</div>"
                  + note("Top to bottom. Skip what the photo does not need. Hover a step for what it changes.")
                  + SEP + row(slider("Strength", 60, 0, 100, wide=True)) + note("Moves the newest effect, live."))   # plugin 1.7.1
    cats = "".join(f'<option{" selected" if k == 0 else ""}>{esc(c)}</option>' for k, (c, _) in enumerate(LOOKS))
    tiles = "".join(f'<span class="lw-look" data-cat="{esc(c)}"{"" if c == "Classic" else " hidden"}><img src="/assets/pages/img/lrc/look_{key}.png" alt="" width="80" height="50" loading="lazy">{btn(t, "sm")}</span>'
                    for c, looks in LOOKS for key, t in looks)
    looks = (row(f'<select class="lw-menu lw-select" data-lrc-cat aria-label="Look category">{cats}</select>', slider("", 80, 0, 100, wide=True))
             + f'<div class="lw-looks">{tiles}</div>'
             + row(btn("Remove look"), menu("My looks"), btn("Apply"), btn("Save…")))
    edit = (grid([radio(t, t == "Subject") for t in ("Subject", "Sky", "Background", "People", "Selected mask", "Whole photo")], 3)
            + grid([btn(t) for t in ("Pop", "Brighten", "Darken", "Warm", "Cool", "Glow", "Soften", "Sharpen")], 4)
            + row(slider("Strength", 60, 0, 100, wide=True))
            + row('<b class="lw-txt">This edit</b>', btn("Save as preset…"), btn("Copy to selected…"))
            + SEP + row('<b class="lw-txt">Eye</b>', btn("Circle"), btn("Brush"), btn("Selected mask"), btn("Remove"))
            + row(slider("Brightness", 0, -100, 100), slider("Clarity", 0, -100, 100))
            + SEP + row('<b class="lw-txt">Warm fur</b>', note("the animal only"), btn("Remove"))
            + row(slider("Warmth", 0, 0, 100), slider("Detail", 0, 0, 100)))   # plugin 1.7.1: Eye section, Warm fur, masks add up
    color = (row(menu("Green"), btn("Reset color"), btn("Reset all HSL"))
             + slider("Hue", 0, -100, 100, wide=True) + slider("Saturation", 0, -100, 100, wide=True) + slider("Luminance", 0, -100, 100, wide=True)
             + row('<b class="lw-txt">Fixes</b>', slider("Fix strength", 100, 25, 150), btn("All off"))
             + grid([btn(t) for t in ("Calm greens", "Deeper sky", "Clean water", "Natural skin")], 2)
             + note("Whole photo. Click a fix again to take it out. For the animal, the sky or the eye only, use Edit."))
    export = (row('<span class="lw-txt grow">Choose where exports go</span>', btn("Folder…"), btn("Open"))
              + row(menu("No watermark", "grow"), btn("Reload"))
              + grid([btn(t) for t in ("Instagram feed", "Stories and Reels", "Web", "Print", "Competition", "Competition check")], 3)
              + SEP + row(btn("Send to MWP…"), note("Up to 5 photos, prepared in a folder.")))
    return [("cull", "Cull", cull), ("organize", "Organize", organize), ("clean", "Clean", clean), ("looks", "Looks", looks),
            ("guided", "Expedition", expedition), ("edit", "Edit", edit), ("color", "Color", color), ("export", "Export", export)]


def window(start="looks"):
    """The window: title bar, the eight tabs (plugin 1.7.1 order), the chosen tab's controls, the status line, Undo, Redo, Reset photo and Help."""
    ps = panes()
    tabs = "".join(f'<button type="button" role="tab" data-lrc-tab="{k}" aria-selected="{str(k == start).lower()}"{" class=on" if k == start else ""}>{t}</button>'
                   for k, t, _ in ps)
    body = "".join(f'<div class="lw-pane" role="tabpanel" data-lrc-pane="{k}"{"" if k == start else " hidden"}>{html}</div>' for k, _, html in ps)
    return (f'<div class="lw" lang="en" dir="ltr" data-no-i18n aria-label="MWP in Lightroom Classic (preview)">'
            f'<div class="lw-bar"><i></i><i></i><i></i><span>MWP · Lightroom Classic</span></div>'
            f'<div class="lw-tabs" role="tablist">{tabs}</div><div class="lw-body">{body}</div>'
            f'<div class="lw-foot"><span>Select photos in Lightroom, then pick a tab.</span>{btn("Undo")}{btn("Redo")}{btn("Reset photo…")}{btn("Help")}</div></div>')
