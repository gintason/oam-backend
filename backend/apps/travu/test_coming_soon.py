"""
    python manage.py test apps.travu.test_coming_soon
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class BusComingSoonTests(TestCase):
    def setUp(self):
        u = get_user_model().objects.create_user(email="rider@test.test", password="x", is_verified=True)
        self.api = APIClient()
        self.api.force_authenticate(u)

    @override_settings(BUS_TICKETS_LIVE=False)
    def test_search_and_book_blocked_while_off(self):
        for path in ("/api/v1/bus/trips/", "/api/v1/bus/book/"):
            r = self.api.post(path, {}, format="json")
            self.assertEqual(r.status_code, 503, path)
            self.assertEqual(r.json()["detail"], "Bus tickets are coming soon. Please check back shortly.")
        # past bookings still viewable
        self.assertEqual(self.api.get("/api/v1/bus/bookings/").status_code, 200)

    @override_settings(BUS_TICKETS_LIVE=True)
    def test_search_works_when_on(self):
        with mock.patch("apps.travu.views.TravuClient") as client:
            client.return_value.check_trips.return_value = []
            r = self.api.post("/api/v1/bus/trips/", {"departure_state": "Lagos", "destination_state": "Abuja",
                                                      "trip_date": "2026-12-01"}, format="json")
        self.assertNotEqual(r.status_code, 503)

    def test_sitemap_and_assistant_follow_the_switch(self):
        from apps.assistant import knowledge
        with override_settings(BUS_TICKETS_LIVE=False):
            self.assertIn("coming soon", knowledge.bus_facts().lower())
            try:
                from apps.seo.views import build_sitemap
            except ImportError:
                return
            self.assertNotIn("/travel/bus<", build_sitemap())
        with override_settings(BUS_TICKETS_LIVE=True):
            self.assertIn("/travel/bus<", build_sitemap())
