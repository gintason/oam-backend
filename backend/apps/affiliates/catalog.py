"""Rich-card metadata for the travel affiliate programs. This drives the in-app
cards (logo, description, what they offer) and tells the frontend which
deep-link search params each program accepts.

The affiliate URLs themselves live in settings/.env (PROVIDER_CONFIG[...]["url"]);
this is just presentation + the param contract.
"""

TRAVEL_PROGRAMS = [
    {
        "slug": "flights",
        "category": "flights",
        "name": "Aviasales — Flight Booking",
        "provider": "travelpayouts",
        "logo": "https://www.aviasales.com/static/logo.png",
        "description": "Compare and book cheap flights from hundreds of airlines and agencies worldwide.",
        "offers": [
            "Compare 100s of airlines & agencies",
            "Find the cheapest dates to fly",
            "Book domestic and international flights",
        ],
        "params": [
            {"key": "origin", "label": "From (city/airport)", "example": "LOS"},
            {"key": "destination", "label": "To (city/airport)", "example": "LHR"},
            {"key": "depart_date", "label": "Departure date", "example": "2026-08-01"},
            {"key": "return_date", "label": "Return date (optional)", "example": "2026-08-15"},
            {"key": "adults", "label": "Passengers", "example": "1"},
        ],
    },
    {
        "slug": "carhire",
        "category": "carhire",
        "name": "GetRentacar — Car Hire",
        "provider": "travelpayouts",
        "logo": "https://getrentacar.com/logo.png",
        "description": "Rent a car in thousands of locations worldwide at competitive rates.",
        "offers": [
            "10,000+ pickup locations globally",
            "Economy to luxury vehicles",
            "Free cancellation on many bookings",
        ],
        "params": [
            {"key": "location", "label": "Pickup city/location", "example": "Lagos"},
            {"key": "pickup_date", "label": "Pickup date", "example": "2026-08-01"},
            {"key": "dropoff_date", "label": "Drop-off date", "example": "2026-08-05"},
        ],
    },
    {
        "slug": "transfers",
        "category": "transfers",
        "name": "Welcome Pickups — Airport Transfers",
        "provider": "travelpayouts",
        "logo": "https://www.welcomepickups.com/logo.png",
        "description": "Book reliable, fixed-price airport pickups and private transfers with friendly local drivers.",
        "offers": [
            "Fixed-price airport pickups",
            "Friendly English-speaking drivers",
            "Flight tracking & meet-and-greet",
        ],
        "params": [
            {"key": "airport", "label": "Airport", "example": "LOS"},
            {"key": "destination", "label": "Drop-off address", "example": "Victoria Island"},
            {"key": "date", "label": "Pickup date/time", "example": "2026-08-01T14:30"},
            {"key": "passengers", "label": "Passengers", "example": "2"},
        ],
    },
]

TRAVEL_BY_SLUG = {p["slug"]: p for p in TRAVEL_PROGRAMS}
