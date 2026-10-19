#!/usr/bin/env python3
"""Build the Lantern Hunt site.

Page bodies live in src/*.html. Each starts with a small header block:

    <!--
    title: How It Works
    description: One sentence for search results and link previews.
    nav: how
    -->

Run `python3 tools/build.py` from the repo root. It writes finished pages
(index.html, how-it-works.html, ...) to the repo root, plus sitemap.xml.
To move to the custom domain, change SITE_URL below and rebuild.
"""
import re
import json
import pathlib
import datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

SITE_URL = "https://lanternhunt.org/"
APP_STORE = "https://apps.apple.com/us/app/lantern-hunt/id6813626463"
CONTACT = "partners@lanternhunt.org"
# Address shown for partnership inquiries on the Partners page.
# partners@lanternhunt.org needs the domain and email forwarding set up
# before it can receive mail (see LAUNCH.md).
PARTNERS_EMAIL = CONTACT
STATS_FILE = ROOT / "data" / "stats.json"

PAGES = [
    # (source, output, nav key)
    ("home.html", "index.html"),
    ("how-it-works.html", "how-it-works.html"),
    ("impact.html", "impact.html"),
    ("accountability.html", "accountability.html"),
    ("partners.html", "partners.html"),
    ("about.html", "about.html"),
    ("support.html", "support.html"),
    ("privacy.html", "privacy.html"),
    ("credits.html", "credits.html"),
    ("404.html", "404.html"),
]

NAV = [
    ("about", "about.html", "About"),
    ("how", "how-it-works.html", "How It Works"),
    ("impact", "impact.html", "Impact"),
    ("accountability", "accountability.html", "Accountability"),
    ("partners", "partners.html", "Partners"),
    ("support", "support.html", "Support"),
]

MARK = (
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'
    '<rect x="12.5" y="2.5" width="7" height="3" rx="1" fill="#e9eee8"/>'
    '<path d="M9 7.5h14l-1.6 3.2v12.6L23 26.5H9l1.6-3.2V10.7z" fill="#e9eee8"/>'
    '<path d="M13.2 11.5h5.6v10.8h-5.6z" fill="#f2b33d"/>'
    '<rect x="7.5" y="26.5" width="17" height="3" rx="1" fill="#a9b9ac"/>'
    "</svg>"
)

FAVICON = (
    "data:image/svg+xml,%3Csvg viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E"
    "%3Crect width='32' height='32' rx='7' fill='%230c1410'/%3E"
    "%3Crect x='13' y='4' width='6' height='2.6' rx='1' fill='%23e9eee8'/%3E"
    "%3Cpath d='M10 8h12l-1.4 2.8v11L22 24.6H10l1.4-2.8v-11z' fill='%23e9eee8'/%3E"
    "%3Cpath d='M13.6 11.6h4.8v9.4h-4.8z' fill='%23f2b33d'/%3E"
    "%3Crect x='9' y='24.6' width='14' height='2.6' rx='1' fill='%23a9b9ac'/%3E%3C/svg%3E"
)

APPLE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.37 12.8c-.02-2.22 1.82-3.29 1.9-3.34-1.04-1.52-2.65-1.72-3.22-1.75-1.37-.14-2.68.81-3.37.81-.7 0-1.77-.79-2.9-.77-1.49.02-2.87.87-3.64 2.2-1.55 2.69-.4 6.67 1.11 8.85.74 1.07 1.62 2.26 2.77 2.22 1.11-.04 1.53-.72 2.88-.72 1.34 0 1.72.72 2.9.7 1.2-.02 1.96-1.08 2.69-2.16.85-1.24 1.2-2.44 1.22-2.5-.03-.01-2.33-.9-2.34-3.54zM14.17 6.27c.61-.75 1.03-1.78.91-2.81-.88.04-1.96.59-2.59 1.33-.57.66-1.07 1.71-.94 2.72.99.08 2-.5 2.62-1.24z"/></svg>'


def header(nav_key: str) -> str:
    items = []
    for key, href, label in NAV:
        cur = ' aria-current="page"' if key == nav_key else ""
        items.append(f'<li><a href="{href}"{cur}>{label}</a></li>')
    items.append(f'<li class="nav-cta"><a href="{APP_STORE}" rel="noopener">Get the app</a></li>')
    home_cur = ' aria-current="page"' if nav_key == "home" else ""
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html"{home_cur}>{MARK}<span>Lantern Hunt</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>{''.join(items)}</ul>
    </nav>
  </div>
</header>"""


def footer() -> str:
    year = datetime.date.today().year
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="grid">
      <div>
        <a class="brand" href="index.html">{MARK}<span>Lantern Hunt</span></a>
        <p>A decentralized, people-powered campaign to protect native habitats and eradicate invasive species. Lantern Hunt is independent. It is not affiliated with, endorsed by, or acting on behalf of any government agency or environmental organization.</p>
      </div>
      <div>
        <h2>Site</h2>
        <ul>
          <li><a href="about.html">About</a></li>
          <li><a href="how-it-works.html">How It Works</a></li>
          <li><a href="impact.html">Impact</a></li>
          <li><a href="accountability.html">Accountability</a></li>
          <li><a href="partners.html">Partners</a></li>
          <li><a href="support.html">Support</a></li>
        </ul>
      </div>
      <div>
        <h2>Help</h2>
        <ul>
          <li><a href="{APP_STORE}" rel="noopener">Lantern Hunt on the App Store</a></li>
          <li><a href="support.html">Support</a></li>
          <li><a href="privacy.html">Privacy Policy</a></li>
          <li><a href="mailto:{CONTACT}">{CONTACT}</a></li>
        </ul>
      </div>
    </div>
    <div class="fine">
      <span>&copy; {year} Lantern Hunt</span>
      <a href="credits.html">Photo credits</a>
    </div>
  </div>
</footer>"""


def page(meta: dict, body: str, out_name: str) -> str:
    title = meta["title"]
    full_title = "Lantern Hunt" if title == "Lantern Hunt" else f"{title} | Lantern Hunt"
    desc = meta["description"]
    url = SITE_URL + ("" if out_name == "index.html" else out_name)
    robots = '<meta name="robots" content="noindex">\n' if out_name == "404.html" else ""
    canonical = "" if out_name == "404.html" else f'<link rel="canonical" href="{url}">\n'
    map_js = '<script src="assets/js/map.js" defer></script>' if 'data-map' in body else ''
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{full_title}</title>
<meta name="description" content="{desc}">
{robots}{canonical}<meta name="theme-color" content="#0c1410">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lantern Hunt">
<meta property="og:title" content="{full_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}assets/img/social-card.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Spotted lanternflies on a tree trunk beside the words: Invasive species spread one backyard at a time. So does the response.">
<meta name="twitter:card" content="summary_large_image">
<meta name="apple-itunes-app" content="app-id=6813626463">
<link rel="icon" href="{FAVICON}">
<link rel="preload" href="assets/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
<script src="assets/js/site.js" defer></script>
{map_js}
</head>
<body>
{header(meta.get('nav', ''))}
<main id="main">
{body.strip()}
</main>
{footer()}
</body>
</html>
"""


def stats_block() -> str:
    """Render the headline statistics from data/stats.json."""
    data = json.loads(STATS_FILE.read_text())
    as_of = datetime.date.fromisoformat(data["as_of"])
    as_of_text = f"{as_of:%B} {as_of.day}, {as_of.year}"
    items = []
    for i, fig in enumerate(data["figures"]):
        cls = "stat stat--primary" if i == 0 else "stat"
        items.append(f'<div class="{cls}"><dt>{fig["label"]}</dt><dd class="num">{fig["value"]}</dd></div>')
    first, rest = items[0], "".join(items[1:])
    return (f'<div class="stats"><dl class="stats__primary">{first}</dl><dl class="stats__support">{rest}</dl></div>\n'
            f'<p class="stats__asof label">As of <time datetime="{data["as_of"]}">{as_of_text}</time></p>')


def parse(src: str):
    m = re.match(r"\s*<!--(.*?)-->", src, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip()
    body = src[m.end():]
    body = body.replace("{{APP_STORE}}", APP_STORE).replace("{{CONTACT}}", CONTACT).replace("{{APPLE_ICON}}", APPLE_ICON)
    body = body.replace("{{PARTNERS_EMAIL}}", PARTNERS_EMAIL)
    stats = json.loads(STATS_FILE.read_text())
    as_of = datetime.date.fromisoformat(stats["as_of"])
    body = body.replace("{{STAT_ASOF}}", f"{as_of:%B} {as_of.day}, {as_of.year}")
    launch = datetime.date.fromisoformat(stats["launch_date"])
    body = body.replace("{{LAUNCH_DATE}}", f"{launch:%B} {launch.day}, {launch.year}")
    body = body.replace("{{DAYS_TO_SNAPSHOT}}", str((as_of - launch).days))
    ms = stats.get("milestone") or {}
    if ms.get("date"):
        md = datetime.date.fromisoformat(ms["date"])
        body = body.replace("{{MILESTONE_DATE}}", f"{md:%B} {md.day}, {md.year}")
        body = body.replace("{{DAYS_TO_MILESTONE}}", str((md - launch).days))
    for name in ("map-full", "map-preview"):
        token = "{{%s}}" % name.upper().replace("-", "_")
        if token in body:
            body = body.replace(token, (SRC / "partials" / f"{name}.html").read_text())
    for i, fig in enumerate(stats["figures"]):
        body = body.replace("{{STAT_VALUE_%d}}" % i, fig["value"])
    if "{{STATS}}" in body:
        body = body.replace("{{STATS}}", stats_block())
    return meta, body


def root_relative(html: str) -> str:
    """GitHub Pages serves 404.html at whatever missing path was requested,
    e.g. /lantern-hunt-site/a/b/c. Relative links would then resolve under /a/b/,
    so the 404 page uses links from the site root instead (derived from SITE_URL)."""
    base = "/" + SITE_URL.split("://", 1)[1].split("/", 1)[1]
    return re.sub(r'(href|src)="(?!#|[a-z]+:|/)', lambda m: f'{m.group(1)}="{base}', html)


def main():
    urls = []
    for src_name, out_name in PAGES:
        meta, body = parse((SRC / src_name).read_text())
        html = page(meta, body, out_name)
        if out_name == "404.html":
            html = root_relative(html)
        (ROOT / out_name).write_text(html)
        if out_name != "404.html":
            urls.append(SITE_URL + ("" if out_name == "index.html" else out_name))
        print("built", out_name)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"  <url><loc>{u}</loc></url>" for u in urls]
    sm.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n")


if __name__ == "__main__":
    main()
