"""Rich-card metadata for hotel/travel-experience affiliate programs."""
HOTEL_PROGRAMS = [
    {
        "slug": "klook",
        "category": "hotels",
        "name": "Klook — Hotels, Tours & Activities",
        "provider": "klook",
        "logo": "https://res.klook.com/image/upload/favicon.ico",
        "description": "Book hotels, tours, activities, attraction tickets and experiences worldwide at great prices.",
        "offers": [
            "Hotels & stays across the globe",
            "Tours, activities & attraction tickets",
            "Airport transfers and experiences",
        ],
        "params": [
            {"key": "destination", "label": "Destination (city/place)", "example": "Dubai"},
            {"key": "check_in", "label": "Check-in date", "example": "2026-08-01"},
            {"key": "check_out", "label": "Check-out date", "example": "2026-08-05"},
            {"key": "guests", "label": "Guests", "example": "2"},
        ],
    },
]

HOTEL_BY_SLUG = {p["slug"]: p for p in HOTEL_PROGRAMS}
