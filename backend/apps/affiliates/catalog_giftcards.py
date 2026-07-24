"""Rich-card metadata for gift-card affiliate programs (appended to the catalog)."""

GIFTCARD_PROGRAMS = [
    {
        "slug": "g2a",
        "category": "giftcards",
        "name": "G2A — Gift Cards & Digital Keys",
        "provider": "g2a",
        "logo": "https://www.g2a.com/favicon.ico",
        "description": "Buy discounted gift cards, game keys, software, and digital top-ups from a global marketplace.",
        "offers": [
            "Steam, PlayStation, Xbox & more gift cards",
            "Game keys & software licenses",
            "Mobile top-ups and subscriptions",
        ],
        "params": [
            {"key": "query", "label": "Search (e.g. 'Steam gift card')", "example": "Steam gift card"},
            {"key": "category", "label": "Category (optional)", "example": "gift-cards"},
        ],
    },
]

GIFTCARD_BY_SLUG = {p["slug"]: p for p in GIFTCARD_PROGRAMS}
