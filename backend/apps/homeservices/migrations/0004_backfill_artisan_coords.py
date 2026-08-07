"""Backfill latitude/longitude for existing artisans from their city, so they
appear in distance search without needing to re-save their profile."""
from django.db import migrations

CITY_COORDS = {
    "abuja": (9.0765, 7.3986), "lagos": (6.5244, 3.3792),
    "port harcourt": (4.8156, 7.0498), "kano": (12.0022, 8.5920),
    "ibadan": (7.3775, 3.9470), "benin city": (6.3350, 5.6037),
    "benin": (6.3350, 5.6037), "enugu": (6.5244, 7.5086),
    "kaduna": (10.5222, 7.4383), "jos": (9.8965, 8.8583),
    "uyo": (5.0377, 7.9128), "warri": (5.5167, 5.7500),
    "abeokuta": (7.1557, 3.3451), "onitsha": (6.1667, 6.7833),
    "aba": (5.1167, 7.3667), "owerri": (5.4836, 7.0333),
    "calabar": (4.9757, 8.3417), "maiduguri": (11.8333, 13.1500),
    "zaria": (11.0855, 7.7199), "ilorin": (8.4966, 4.5426),
    "akure": (7.2508, 5.1931), "osogbo": (7.7667, 4.5667),
    "abakaliki": (6.3249, 8.1137), "makurdi": (7.7333, 8.5333),
    "minna": (9.6139, 6.5569), "sokoto": (13.0059, 5.2476),
    "bauchi": (10.3103, 9.8439), "asaba": (6.1980, 6.7280),
    "awka": (6.2100, 7.0700), "umuahia": (5.5250, 7.4930),
    "lokoja": (7.8023, 6.7333), "ado ekiti": (7.6210, 5.2210),
    "ado-ekiti": (7.6210, 5.2210),
}


def _coords_for_city(city):
    if not city:
        return None
    c = " ".join(str(city).strip().lower().split())
    if c in CITY_COORDS:
        return CITY_COORDS[c]
    for name in sorted(CITY_COORDS, key=len, reverse=True):
        if name in c:
            return CITY_COORDS[name]
    return None


def backfill(apps, schema_editor):
    ArtisanProfile = apps.get_model("homeservices", "ArtisanProfile")
    qs = ArtisanProfile.objects.filter(latitude__isnull=True) | ArtisanProfile.objects.filter(
        longitude__isnull=True
    )
    for artisan in qs.distinct():
        coords = _coords_for_city(artisan.city)
        if coords:
            artisan.latitude, artisan.longitude = coords
            artisan.save(update_fields=["latitude", "longitude"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("homeservices", "0003_artisanworkvideo")]
    operations = [migrations.RunPython(backfill, noop)]
