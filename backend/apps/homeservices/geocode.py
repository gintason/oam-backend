"""
Give artisans coordinates from their city, automatically.

Find-an-artisan search is distance-based and skips any artisan without
latitude/longitude. Registration doesn't always capture a precise location, so
without this an artisan can register and never appear in search.

A post_save signal fills in coordinates from the artisan's city whenever they're
missing (it never overwrites a precise location the artisan set themselves). A
companion data migration backfills every existing artisan.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ArtisanProfile

# City centres for the places the app lets people search. Keep in sync with the
# frontend CITIES list; extras here are harmless.
CITY_COORDS = {
    "abuja": (9.0765, 7.3986),
    "lagos": (6.5244, 3.3792),
    "port harcourt": (4.8156, 7.0498),
    "kano": (12.0022, 8.5920),
    "ibadan": (7.3775, 3.9470),
    "benin city": (6.3350, 5.6037),
    "benin": (6.3350, 5.6037),
    "enugu": (6.5244, 7.5086),
    "kaduna": (10.5222, 7.4383),
    "jos": (9.8965, 8.8583),
    "uyo": (5.0377, 7.9128),
    "warri": (5.5167, 5.7500),
    "abeokuta": (7.1557, 3.3451),
    "onitsha": (6.1667, 6.7833),
    "aba": (5.1167, 7.3667),
    "owerri": (5.4836, 7.0333),
    "calabar": (4.9757, 8.3417),
    "maiduguri": (11.8333, 13.1500),
    "zaria": (11.0855, 7.7199),
    "ilorin": (8.4966, 4.5426),
    "akure": (7.2508, 5.1931),
    "osogbo": (7.7667, 4.5667),
    "abakaliki": (6.3249, 8.1137),
    "makurdi": (7.7333, 8.5333),
    "minna": (9.6139, 6.5569),
    "sokoto": (13.0059, 5.2476),
    "bauchi": (10.3103, 9.8439),
    "asaba": (6.1980, 6.7280),
    "awka": (6.2100, 7.0700),
    "umuahia": (5.5250, 7.4930),
    "lokoja": (7.8023, 6.7333),
    "ado ekiti": (7.6210, 5.2210),
    "ado-ekiti": (7.6210, 5.2210),
}


def coords_for_city(city):
    """Return (lat, lng) for a city string, tolerating extra words / case."""
    if not city:
        return None
    c = " ".join(str(city).strip().lower().split())
    if c in CITY_COORDS:
        return CITY_COORDS[c]
    # "Lagos State", "Ikeja, Lagos" → match the contained known city.
    # Check longer names first so "port harcourt" wins over any short token.
    for name in sorted(CITY_COORDS, key=len, reverse=True):
        if name in c:
            return CITY_COORDS[name]
    return None


@receiver(post_save, sender=ArtisanProfile)
def fill_coords_from_city(sender, instance, **kwargs):
    if instance.latitude is not None and instance.longitude is not None:
        return
    coords = coords_for_city(instance.city)
    if not coords:
        return
    # update() avoids re-triggering this signal (no recursion).
    ArtisanProfile.objects.filter(pk=instance.pk).update(
        latitude=coords[0], longitude=coords[1]
    )
