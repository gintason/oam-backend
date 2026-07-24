"""
Seed one marketplace listing and one artisan profile, so the chat can be
tested before the browse pages exist.

Both are owned by the ADMIN account, so you can enquire from your second
account and exercise the full flow: enquiry -> accept -> contacts revealed.

Field values are chosen by introspecting each model, because status/condition
choices differ between projects and a hardcoded guess would just fail.

RUN FROM THE BACKEND ROOT:
    python3 manage.py shell < seed_demo.py

REMOVE IT AGAIN LATER:
    python3 manage.py shell -c "
    from apps.marketplace.models import Listing
    from apps.homeservices.models import ArtisanProfile
    Listing.objects.filter(title__startswith='[demo]').delete()
    ArtisanProfile.objects.filter(business_name__startswith='[demo]').delete()
    print('demo data removed')
    "
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify

from apps.homeservices.models import ArtisanProfile, ServiceCategory
from apps.marketplace.models import Category, Listing

User = get_user_model()


def first_choice(model, field_name, prefer=()):
    """Pick a sensible value for a choices field without hardcoding it."""
    field = model._meta.get_field(field_name)
    choices = [c[0] for c in (field.choices or [])]
    if not choices:
        return ""
    for want in prefer:
        if want in choices:
            return want
    return choices[0]


admin = User.objects.filter(is_staff=True).order_by("id").first()
if admin is None:
    print("No staff user found — create one first.")
else:
    print(f"Seeding as: {admin}")

    # ---------------- marketplace ---------------- #
    cat, _ = Category.objects.get_or_create(
        slug="electronics",
        defaults={"name": "Electronics", "description": "Phones, laptops and gadgets",
                  "is_active": True},
    )

    listing, created = Listing.objects.get_or_create(
        title="[demo] Hisense 43\" Smart TV",
        defaults={
            "seller": admin,
            "category": cat,
            "description": "Barely used, full HD smart TV with remote and original box. "
                           "Collection in Abuja, or delivery can be arranged.",
            "price": 145000,
            "currency": "NGN",
            "negotiable": True,
            "condition": first_choice(Listing, "condition", prefer=("used", "fairly_used")),
            "location": "Abuja, FCT",
            "contact_phone": "08031234567",
            "contact_whatsapp": "2348031234567",
            "status": first_choice(Listing, "status", prefer=("active", "published", "approved")),
            "expires_at": timezone.now() + timedelta(days=30),
        },
    )
    print(("created" if created else "exists "), "listing:", listing.title, "|", listing.id)

    # ---------------- artisan ---------------- #
    svc, _ = ServiceCategory.objects.get_or_create(
        slug="plumbing",
        defaults={"name": "Plumbing", "is_active": True},
    )

    artisan, created = ArtisanProfile.objects.get_or_create(
        business_name="[demo] Sure Flow Plumbing",
        defaults={
            "user": admin,
            "category": svc,
            "description": "Burst pipes, water heaters, bathroom fittings and general "
                           "plumbing repairs. Same-day callout across Abuja.",
            "phone": "08039876543",
            "whatsapp": "2348039876543",
            "address": "No 12, Ademola Adetokunbo Crescent",
            "city": "Abuja",
            "state": "FCT",
            "years_experience": 8,
            "is_available": True,
            "status": first_choice(ArtisanProfile, "status", prefer=("active", "approved", "published")),
        },
    )
    print(("created" if created else "exists "), "artisan:", artisan.business_name, "|", artisan.id)

    print("\nNow, signed in as your OTHER account, start a conversation:")
    print(f"  listing id : {listing.id}")
    print(f"  artisan id : {artisan.id}")
