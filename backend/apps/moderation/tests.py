from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.marketplace.models import Category, Listing
from apps.messaging.models import Conversation, Message
from apps.moderation.models import Block, Report


@override_settings(SECURE_SSL_REDIRECT=False)
class ReportBlockTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.cat = Category.objects.create(name="Phones", slug="phones")
        self.seller = U.objects.create_user(email="s@oam.test", password="x-Pass-12345", is_verified=True)
        self.buyer = U.objects.create_user(email="b@oam.test", password="x-Pass-12345", is_verified=True)
        self.listing = Listing.objects.create(
            seller=self.seller, category=self.cat, title="iPhone", price=1000, location="Ikeja",
            contact_phone="0803", condition="used", status=Listing.Status.ACTIVE,
            expires_at=timezone.now() + timedelta(days=10))
        self.api = APIClient(); self.api.force_authenticate(self.buyer)
        self.api_s = APIClient(); self.api_s.force_authenticate(self.seller)

    def _titles(self):
        r = self.api.get("/api/v1/marketplace/listings/")
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        rows = body["results"] if isinstance(body, dict) else body
        return [l["title"] for l in rows]

    def test_report_listing(self):
        r = self.api.post("/api/v1/moderation/reports/",
                          {"target_type": "listing", "target_id": str(self.listing.id),
                           "reason": "scam", "details": "asks for deposit"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        rep = Report.objects.get()
        self.assertEqual((rep.reported_user, rep.reason), (self.seller, "scam"))

    def test_cannot_report_own_or_missing(self):
        r = self.api_s.post("/api/v1/moderation/reports/",
                            {"target_type": "listing", "target_id": str(self.listing.id)}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.post("/api/v1/moderation/reports/",
                          {"target_type": "listing", "target_id": "nope"}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_block_hides_listings_and_unblock_restores(self):
        self.assertIn("iPhone", self._titles())
        r = self.api.post("/api/v1/moderation/blocks/",
                          {"target_type": "listing", "target_id": str(self.listing.id)}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertNotIn("iPhone", self._titles())
        blocks = self.api.get("/api/v1/moderation/blocks/").json()["results"]
        self.assertEqual(len(blocks), 1)
        self.assertEqual(self.api.delete(f"/api/v1/moderation/blocks/{self.seller.id}/").status_code, 204)
        self.assertIn("iPhone", self._titles())

    def test_block_from_chat_hides_thread_and_stops_messages(self):
        c = Conversation.objects.create(kind="listing", listing=self.listing,
                                        customer=self.buyer, provider=self.seller)
        Message.objects.create(conversation=c, sender=self.seller, body="hi")
        r = self.api.post("/api/v1/moderation/reports/",
                          {"target_type": "conversation", "target_id": str(c.id),
                           "reason": "harassment", "block": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["blocked"])
        self.assertTrue(Block.objects.filter(blocker=self.buyer, blocked=self.seller).exists())
        self.assertEqual(self.api.get("/api/v1/messaging/conversations/").json()["count"], 0)
        # the blocked seller can no longer message the buyer
        r = self.api_s.post(f"/api/v1/messaging/conversations/{c.id}/messages/",
                            {"body": "hello?"}, format="json")
        self.assertEqual(r.status_code, 403)
        # nor can a new chat be started
        r = self.api.post("/api/v1/messaging/conversations/",
                          {"kind": "listing", "id": str(self.listing.id), "body": "x"}, format="json")
        self.assertEqual(r.status_code, 403)
