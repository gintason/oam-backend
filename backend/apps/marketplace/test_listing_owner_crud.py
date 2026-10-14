from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.marketplace.models import Category, Listing


@override_settings(SECURE_SSL_REDIRECT=False)
class ListingOwnerCrudTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.cat = Category.objects.create(name="Phones & Tablets", slug="phones")
        self.seller = U.objects.create_user(email="s@oam.test", password="x-Pass-12345", is_verified=True)
        self.other = U.objects.create_user(email="o@oam.test", password="x-Pass-12345", is_verified=True)
        self.listing = Listing.objects.create(seller=self.seller, category=self.cat, title="iPhone 12", price=300000,
                                              location="Ikeja", contact_phone="0803", condition="used")
        self.api, self.api_other = APIClient(), APIClient()
        self.api.force_authenticate(self.seller)
        self.api_other.force_authenticate(self.other)
        self.url = f"/api/v1/marketplace/listings/{self.listing.id}/"

    def test_my_listings_lists_own_only(self):
        Listing.objects.create(seller=self.other, category=self.cat, title="Not mine", price=1, location="x", contact_phone="1")
        titles = [l["title"] for l in self.api.get("/api/v1/marketplace/my-listings/").json()["results"]]
        self.assertEqual(titles, ["iPhone 12"])

    def test_owner_can_edit(self):
        r = self.api.patch(self.url, {"title": "iPhone 12 Pro", "price": "350000", "images": ["https://res.cloudinary.com/demo/a.jpg"]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.listing.refresh_from_db()
        self.assertEqual((self.listing.title, int(self.listing.price)), ("iPhone 12 Pro", 350000))
        self.assertEqual(self.listing.images.count(), 1)

    def test_others_cannot_edit_or_delete(self):
        self.assertEqual(self.api_other.patch(self.url, {"title": "hacked"}, format="json").status_code, 404)
        self.assertEqual(self.api_other.delete(self.url).status_code, 404)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.title, "iPhone 12")

    def test_owner_can_delete(self):
        self.assertEqual(self.api.delete(self.url).status_code, 204)
        self.assertFalse(Listing.objects.filter(id=self.listing.id).exists())
