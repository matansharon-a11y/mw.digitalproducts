"""Field Guides-style motion for the home page: sections fade up as they enter, numbers count up,
a slow wall of Matan's photos, a soft spotlight that follows the cursor on cards, and gentle depth
on the hero. Everything switches off for people who ask their system for reduced motion."""

IMG = "assets/pages/img/"
# Real photos by Matan, the same set the Field Guides page uses for its photo wall.
ROW1 = ["2c79f949f816ee693322cfce98f61afc", "9583692af9aca77b648b4e2ff3733f72", "aaa6b678f12b2bc6866e736281498d1c",
        "070e7608dbefe0693b217fc9c0a64234", "cff5b2d414538979bb1efe787e67de9f"]
ROW2 = ["32909dca904452841a5b6ea7a187f4aa", "b7cfa28802573f545067cc876c19f44e", "a7adf42375708a6165c1498e3e170f8e",
        "5578f8776625aac5bc0ebc1673fe549a", "3c19b4355bad5a4a5cf99bf0881b4e8b"]

def _row(ids, rev=False):
    imgs = "".join(f'<img src="{IMG}{i}.jpg" alt="" loading="lazy">' for i in ids * 2)
    return f'<div class="mqt{" rev" if rev else ""}" aria-hidden="true">{imgs}</div>'

WALL = f"""<section class="wallsec" aria-label="Photos by Matan Wild">
<p class="kick wall-kick">Every photo by Matan Wild</p>
<div class="mq">{_row(ROW1)}{_row(ROW2, True)}</div>
</section>"""

from brand import BUNDLE_CSS
CSS = BUNDLE_CSS + """
.plan{position:relative;--mx:50%;--my:0%}
.plan::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(420px circle at var(--mx) var(--my),rgba(244,175,86,.12),transparent 45%);z-index:1}
.plan:hover::before{opacity:1}
/* the landing hero sits under the transparent top bar */
.st-hero{margin-top:-80px}
@media (max-width:600px){.st-hero{margin-top:-64px}}
@media (prefers-reduced-motion:reduce){.plan::before{display:none}}
"""

JS = """<script>
// Landing motion: sections fade up as they come into view; a soft spotlight follows the cursor on cards.
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  if (!("IntersectionObserver" in window) || reduce) { root.classList.add("nofx"); return; }
  root.classList.add("fx");
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) {
    if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
  }); }, { threshold: .15, rootMargin: "0px 0px -8% 0px" });
  var SEL = ".st-ch-head,#bundles .head,#faq .head,.plan,.trust > *,.faq details";
  document.querySelectorAll(SEL).forEach(function (el) {
    el.classList.add("rv");
    var i = Array.prototype.indexOf.call(el.parentElement.children, el);
    if (/plan/.test(el.className) || el.parentElement.classList.contains("trust")) el.style.setProperty("--d", (i * 0.1) + "s");
    io.observe(el);
  });
  // Arriving through a menu link (#bundles, #faq…): that section is shown at once, so the jump never
  // lands on an empty, still-fading area.
  function showTarget() {
    var id = decodeURIComponent(location.hash.slice(1)), sec = id && document.getElementById(id);
    if (!sec) return;
    sec.querySelectorAll(".rv").forEach(function (el) { el.style.transitionDelay = "0s"; el.classList.add("in"); io.unobserve(el); });
  }
  showTarget();
  addEventListener("hashchange", showTarget);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"], a[href^="/#"]');
    if (!a || (a.getAttribute("href").charAt(0) === "/" && location.pathname !== "/")) return;
    var sec = document.getElementById(a.getAttribute("href").split("#")[1]);
    if (sec) sec.querySelectorAll(".rv").forEach(function (el) { el.style.transitionDelay = "0s"; el.classList.add("in"); io.unobserve(el); });
  }, true);
  document.addEventListener("pointermove", function (e) {
    var t = e.target.closest && e.target.closest(".plan"); if (!t) return;
    var r = t.getBoundingClientRect(); t.style.setProperty("--mx", (e.clientX - r.left) + "px"); t.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
})();
</script>"""
