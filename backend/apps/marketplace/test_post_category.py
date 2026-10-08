"""Posting a listing works whether the app sends the category id or its slug."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.marketplace.models import Category, Listing


class PostListingCategoryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="seller@test.test", password="x", is_verified=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.phones = Category.objects.create(name="Phones", slug="phones")
        self.motors = Category.objects.create(name="O.A.M Motors", slug="oam-motors", is_admin_only=True)

    def post(self, category):
        return self.client.post("/api/v1/marketplace/listings/create/", {
            "category": category, "title": "iPhone 18", "description": "Beautiful sleek phone in good condition",
            "price": "950000", "currency": "NGN", "condition": "used", "location": "Lagos",
            "contact_phone": "08030000000", "images": [], "videos": [],
        }, format="json")

    def test_slug_is_accepted(self):
        r = self.post("phones")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Listing.objects.get().category, self.phones)

    def test_id_is_accepted(self):
        r = self.post(str(self.phones.id))
        self.assertEqual(r.status_code, 201, r.data)

    def test_unknown_category_is_a_clear_error(self):
        r = self.post("nonsense")
        self.assertEqual(r.status_code, 400)
        self.assertIn("pick one from the list", str(r.data["category"]))

    def test_admin_only_category_still_blocked_by_slug(self):
        r = self.post("oam-motors")
        self.assertEqual(r.status_code, 403)
