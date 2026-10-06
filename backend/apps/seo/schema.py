"""
Schema.org JSON-LD builders. The web app has the same builders
(src/seo/schema.ts) for pages opened inside the app; these are used for the
HTML the server sends to crawlers and link-preview bots.

Only facts we actually have go in: no invented ratings, prices or addresses.
"""
from __future__ import annotations

import json

from .site import BRAND, LEGAL_NAME, LOGO, SOCIALS, SUPPORT_EMAIL, absolute, site_url

CONDITION = {
    "new": "https://schema.org/NewCondition",
    "used": "https://schema.org/UsedCondition",
    "refurbished": "https://schema.org/RefurbishedCondition",
}


def to_script(data: dict) -> str:
    """<script type=application/ld+json> safe against </script> injection."""
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    body = body.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script type="application/ld+json" data-seo="jsonld">{body}</script>'


def organization() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": f"{site_url()}/#organization",
        "name": BRAND,
        "legalName": LEGAL_NAME,
        "url": site_url() + "/",
        "logo": absolute(LOGO),
        "sameAs": SOCIALS,
        "contactPoint": [{"@type": "ContactPoint", "contactType": "customer support",
                          "email": SUPPORT_EMAIL, "availableLanguage": ["English"]}],
    }


def website() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": f"{site_url()}/#website",
        "name": BRAND,
        "url": site_url() + "/",
        "publisher": {"@id": f"{site_url()}/#organization"},
        "potentialAction": {
            "@type": "SearchAction",
            "target": {"@type": "EntryPoint",
                       "urlTemplate": f"{site_url()}/marketplace?q={{search_term_string}}"},
            "query-input": "required name=search_term_string",
        },
    }


def breadcrumbs(items: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": absolute(path)}
            for i, (name, path) in enumerate(items)
        ],
    }


def product(listing: dict, url: str) -> dict:
    images = [i["url"] for i in listing.get("images") or [] if i.get("url")]
    data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing["title"],
        "description": (listing.get("description") or listing["title"])[:5000],
        "url": url,
        "sku": str(listing["id"]),
        "category": listing.get("category_name") or "",
        "offers": {
            "@type": "Offer",
            "url": url,
            "price": str(listing["price"]),
            "priceCurrency": listing.get("currency") or "NGN",
            "availability": "https://schema.org/InStock",
            "seller": {"@type": "Person", "name": listing.get("seller_name") or "O.A.M seller"},
        },
    }
    if images:
        data["image"] = images
    cond = CONDITION.get(listing.get("condition") or "")
    if cond:
        data["offers"]["itemCondition"] = cond
    if listing.get("location"):
        data["offers"]["areaServed"] = listing["location"]
    if listing.get("expires_at"):
        data["offers"]["priceValidUntil"] = str(listing["expires_at"])[:10]
    return data


def artisan(profile: dict, url: str) -> dict:
    data = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": profile["business_name"],
        "url": url,
        "description": (profile.get("description") or
                        f"{profile.get('category_name') or 'Artisan'} services on O.A.M")[:5000],
        "knowsAbout": profile.get("category_name") or "",
    }
    if profile.get("profile_photo"):
        data["image"] = profile["profile_photo"]
    if profile.get("city") or profile.get("state"):
        data["address"] = {"@type": "PostalAddress", "addressLocality": profile.get("city") or "",
                           "addressRegion": profile.get("state") or ""}
        data["areaServed"] = {"@type": "City", "name": profile.get("city") or profile.get("state")}
    return data
