"""
/sitemap.xml, /robots.txt and server-rendered pages for crawlers and link previews.

WHY THE SERVER RENDERS SOME PAGES
  The web app is a single-page app: its HTML is the same empty shell for every
  URL until JavaScript runs. Google runs JavaScript (slowly); WhatsApp,
  Facebook, X, LinkedIn and most other crawlers don't. So a shared listing
  would preview as the home page. For /marketplace/<id> and /artisans/<id> the
  static site forwards the request here (a Render rewrite); we take the app's
  real index.html, put the right title, description, Open Graph tags, canonical
  and JSON-LD into it, plus a readable summary inside #root, and return it. The
  browser then boots the normal app on top — users see no difference.
"""
from __future__ import annotations

import logging
import re
import uuid
from xml.sax.saxutils import escape as xml_escape

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.utils.html import escape
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from . import schema
from .public_api import artisan_payload, listing_payload, live_listings, public_artisans
from .site import (BRAND, DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE, PRIVATE_PREFIXES,
                   PUBLIC_API_PREFIXES, STATIC_PAGES, absolute, site_url)

logger = logging.getLogger("seo")
MAX_URLS = 45_000


# --------------------------------------------------------------------------- #
# sitemap.xml / robots.txt
# --------------------------------------------------------------------------- #

def _url(loc: str, lastmod=None, changefreq=None, priority=None) -> str:
    parts = [f"<loc>{xml_escape(loc)}</loc>"]
    if lastmod:
        parts.append(f"<lastmod>{lastmod.date().isoformat()}</lastmod>")
    if changefreq:
        parts.append(f"<changefreq>{changefreq}</changefreq>")
    if priority:
        parts.append(f"<priority>{priority}</priority>")
    return "<url>" + "".join(parts) + "</url>"


def build_sitemap() -> str:
    urls = [_url(absolute(p), changefreq=cf, priority=pr) for p, cf, pr, *_ in STATIC_PAGES]
    for lid, updated in live_listings().order_by("-updated_at").values_list("id", "updated_at")[:30_000]:
        urls.append(_url(absolute(f"/marketplace/{lid}"), updated, "weekly", "0.7"))
    verified = public_artisans().filter(is_verified=True).order_by("-updated_at")
    for aid, updated in verified.values_list("id", "updated_at")[:MAX_URLS - len(urls)]:
        urls.append(_url(absolute(f"/artisans/{aid}"), updated, "weekly", "0.7"))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(urls[:MAX_URLS]) + "\n</urlset>\n")


@require_GET
@cache_control(public=True, max_age=3600)
def sitemap_xml(request):
    xml = cache.get("seo:sitemap")
    if xml is None:
        xml = build_sitemap()
        cache.set("seo:sitemap", xml, 60 * 30)
    return HttpResponse(xml, content_type="application/xml; charset=utf-8")


def build_robots() -> str:
    lines = ["# O.A.M — public pages are open to all search engines.", "User-agent: *"]
    lines += [f"Allow: {p}" for p in PUBLIC_API_PREFIXES]   # data the public pages load
    lines += ["Disallow: /api/", "Disallow: /admin/"]
    lines += [f"Disallow: {p}" for p in PRIVATE_PREFIXES if p not in ("/admin/",)]
    lines += ["Allow: /", "", f"Sitemap: {site_url()}/sitemap.xml", ""]
    return "\n".join(lines)


@require_GET
@cache_control(public=True, max_age=86400)
def robots_txt(request):
    return HttpResponse(build_robots(), content_type="text/plain; charset=utf-8")


# --------------------------------------------------------------------------- #
# Server-rendered app shell
# --------------------------------------------------------------------------- #

SHELL_FRESH = 600            # re-fetch index.html every 10 minutes …
SHELL_STALE = 7 * 86400      # … but keep the last good copy for a week if the site is unreachable
_STRIP = [
    re.compile(r"<title>.*?</title>", re.S | re.I),
    re.compile(r'<meta\s+(?:name|property)="(?:description|keywords|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*', re.I),
    re.compile(r'<link\s+rel="canonical"[^>]*>\s*', re.I),
    re.compile(r'<script type="application/ld\+json"[^>]*>.*?</script>\s*', re.S | re.I),
]
FALLBACK_SHELL = ('<!doctype html><html lang="en"><head><meta charset="UTF-8" />'
                  '<meta name="viewport" content="width=device-width, initial-scale=1" /></head>'
                  '<body><div id="root"></div></body></html>')


def app_shell() -> tuple[str, bool]:
    """The web app's index.html (hashed asset names change each deploy)."""
    fresh = cache.get("seo:shell")
    if fresh:
        return fresh, True
    url = getattr(settings, "SEO_SHELL_URL", "") or f"{site_url()}/index.html"
    try:
        r = requests.get(url, timeout=6, headers={"User-Agent": "OAM-SEO-Renderer/1.0"})
        html = r.content.decode("utf-8", errors="replace")   # index.html is UTF-8 even if the header doesn't say so
        if r.ok and '<div id="root">' in html:
            cache.set("seo:shell", html, SHELL_FRESH)
            cache.set("seo:shell:stale", html, SHELL_STALE)
            return html, True
        logger.warning("seo: shell fetch %s -> %s", url, r.status_code)
    except requests.RequestException as exc:
        logger.warning("seo: shell fetch failed — %s", exc)
    stale = cache.get("seo:shell:stale")
    return (stale, True) if stale else (FALLBACK_SHELL, False)


def head_tags(*, title, description, path, image=None, robots="index,follow", og_type="website",
              jsonld=(), keywords="") -> str:
    url = absolute(path)
    img = absolute(image or OG_IMAGE)
    t, d = escape(title), escape(description)
    tags = [
        f"<title>{t}</title>",
        f'<meta name="description" content="{d}" />',
        f'<meta name="robots" content="{robots}" />',
        f'<link rel="canonical" href="{escape(url)}" />',
        f'<meta property="og:site_name" content="{BRAND}" />',
        f'<meta property="og:type" content="{og_type}" />',
        f'<meta property="og:title" content="{t}" />',
        f'<meta property="og:description" content="{d}" />',
        f'<meta property="og:url" content="{escape(url)}" />',
        f'<meta property="og:image" content="{escape(img)}" />',
        '<meta property="og:locale" content="en_NG" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:site" content="@oamplatform" />',
        f'<meta name="twitter:title" content="{t}" />',
        f'<meta name="twitter:description" content="{d}" />',
        f'<meta name="twitter:image" content="{escape(img)}" />',
    ]
    if keywords:
        tags.insert(2, f'<meta name="keywords" content="{escape(keywords)}" />')
    tags += [schema.to_script(j) for j in jsonld]
    return "\n    ".join(tags)


def render_shell(head: str, body_html: str = "", status: int = 200) -> HttpResponse:
    shell, _ok = app_shell()
    for rx in _STRIP:
        shell = rx.sub("", shell)
    shell = shell.replace("</head>", f"    {head}\n  </head>", 1)
    if body_html:
        shell = re.sub(r'<div id="root">\s*</div>', f'<div id="root">{body_html}</div>', shell, count=1)
    resp = HttpResponse(shell, status=status, content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = "public, max-age=300"
    return resp


def _clip(text: str, n: int = 158) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def _money(amount, currency) -> str:
    sym = {"NGN": "₦", "USD": "$", "GBP": "£", "EUR": "€"}.get(currency or "NGN", (currency or "") + " ")
    try:
        return f"{sym}{float(amount):,.0f}"
    except (TypeError, ValueError):
        return f"{sym}{amount}"


def _as_uuid(value: str):
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError):
        return None


def _static_page(path: str):
    for p, _cf, _pr, title, desc in STATIC_PAGES:
        if p == path:
            return title, desc
    return None


def _generic(request, path: str):
    """Non-detail paths under /marketplace/ or /artisans/ (browse, sell, find, me…)."""
    private = any(path.startswith(p) for p in PRIVATE_PREFIXES)
    section = "/marketplace" if path.startswith("/marketplace") else "/artisans"
    title, desc = _static_page(section) or (DEFAULT_TITLE, DEFAULT_DESCRIPTION)
    head = head_tags(title=title, description=desc, path=section if not private else path,
                     robots="noindex,follow" if private else "index,follow")
    return render_shell(head)


@require_GET
def marketplace_page(request, rest: str = ""):
    path = "/marketplace/" + rest.strip("/")
    lid = _as_uuid(rest.strip("/"))
    if lid is None:
        return _generic(request, path)
    listing = (live_listings().select_related("category", "seller")
               .prefetch_related("images", "videos").filter(id=lid).first())
    if listing is None:
        head = head_tags(title=f"Item no longer available | {BRAND} Marketplace",
                         description="This item has been sold or removed. Browse similar items on the O.A.M marketplace.",
                         path=path, robots="noindex,follow")
        return render_shell(head, status=404)
    data = listing_payload(listing, request)
    price = _money(data["price"], data.get("currency"))
    where = f" in {data['location']}" if data.get("location") else ""
    title = f"{data['title']} — {price}{where} | {BRAND} Marketplace"
    desc = _clip(f"{data['title']} for sale{where} at {price}. "
                 f"{data.get('description') or ''} Chat with the seller safely on O.A.M.")
    image = next((i["url"] for i in data.get("images") or [] if i.get("is_primary")), None) or \
        next((i["url"] for i in data.get("images") or []), None)
    url = absolute(path)
    jsonld = [schema.product(data, url),
              schema.breadcrumbs([("Home", "/"), ("Marketplace", "/marketplace"),
                                  (data.get("category_name") or "Item", f"/marketplace?category={listing.category.slug}"),
                                  (data["title"], path)])]
    body = (f'<main><article><h1>{escape(data["title"])}</h1>'
            f'<p><strong>{escape(price)}</strong>{escape(where)}'
            f'{" · " + escape(data["category_name"]) if data.get("category_name") else ""}</p>'
            + (f'<img src="{escape(image)}" alt="{escape(data["title"])} for sale{escape(where)}" width="600" />' if image else "")
            + f'<p>{escape(data.get("description") or "")}</p>'
            f'<p><a href="/marketplace">Browse more items on the O.A.M marketplace</a></p></article></main>')
    head = head_tags(title=title, description=desc, path=path, image=image, og_type="product",
                     jsonld=jsonld, keywords=f"{data['title']}, buy {data.get('category_name') or ''} "
                                             f"{data.get('location') or 'Nigeria'}, O.A.M marketplace")
    return render_shell(head, body)


@require_GET
def artisan_page(request, rest: str = ""):
    path = "/artisans/" + rest.strip("/")
    aid = _as_uuid(rest.strip("/"))
    if aid is None:
        return _generic(request, path)
    profile = public_artisans().select_related("category").filter(id=aid).first()
    if profile is None:
        head = head_tags(title=f"Profile not available | {BRAND}",
                         description="This artisan profile isn't available. Find other verified artisans on O.A.M.",
                         path=path, robots="noindex,follow")
        return render_shell(head, status=404)
    data = artisan_payload(profile)
    trade = data.get("category_name") or "Artisan"
    where = ", ".join(x for x in (data.get("city"), data.get("state")) if x)
    in_where = f" in {where}" if where else ""
    title = f"{data['business_name']} — {trade}{in_where} | Hire on {BRAND}"
    desc = _clip(f"Hire {data['business_name']}, {'a verified ' if data.get('is_verified') else 'a '}"
                 f"{trade.lower()}{in_where}. {data.get('description') or ''} Send an enquiry on O.A.M.")
    url = absolute(path)
    jsonld = [schema.artisan(data, url),
              schema.breadcrumbs([("Home", "/"), ("Artisans", "/artisans"), (data["business_name"], path)])]
    body = (f'<main><article><h1>{escape(data["business_name"])}</h1>'
            f'<p>{escape(trade)}{escape(in_where)}{" · Verified" if data.get("is_verified") else ""}</p>'
            + (f'<img src="{escape(data["profile_photo"])}" alt="{escape(data["business_name"])}, {escape(trade.lower())}{escape(in_where)}" width="200" />'
               if data.get("profile_photo") else "")
            + f'<p>{escape(data.get("description") or "")}</p>'
            f'<p><a href="/artisans">Find more artisans on O.A.M</a></p></article></main>')
    head = head_tags(title=title, description=desc, path=path, image=data.get("profile_photo"),
                     og_type="profile", jsonld=jsonld,
                     robots="index,follow" if data.get("is_verified") else "noindex,follow",
                     keywords=f"hire {trade.lower()} {data.get('city') or 'Nigeria'}, {trade.lower()} near me, "
                              f"{data['business_name']}")
    return render_shell(head, body)
