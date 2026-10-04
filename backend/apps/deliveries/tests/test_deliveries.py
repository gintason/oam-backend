"""
    python manage.py test apps.deliveries
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.deliveries import pricing
from apps.deliveries.models import (
    DeliveryRequest,
    DeliveryTransaction,
    DeliveryZone,
    DispatchOffer,
    DispatchSettings,
    RiderProfile,
    SurgePricing,
)
from apps.wallet.services import WalletService

TEST_SETTINGS = dict(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
    DELIVERIES_PAYMENT_GATEWAY="mock",
    DELIVERIES_CRON_SECRET="tick-secret",
    CLOUDINARY_CLOUD_NAME="demo",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
from django.conf import settings as _s  # noqa: E402
TEST_SETTINGS["DEFAULT_PROVIDERS"] = {**getattr(_s, "DEFAULT_PROVIDERS", {}), "payouts": "mock"}

PICKUP = (Decimal("6.428100"), Decimal("3.421900"))      # Victoria Island
DROPOFF = (Decimal("6.455000"), Decimal("3.394100"))     # Ikoyi, ~4 km straight

ORDER = {
    "pickup_address": "1 Adeola Odeku St, VI", "pickup_lat": "6.4281", "pickup_lng": "3.4219",
    "dropoff_address": "5 Bourdillon Rd, Ikoyi", "dropoff_lat": "6.455", "dropoff_lng": "3.3941",
    "recipient_name": "Bola", "recipient_phone": "08031234567",
    "package_description": "Envelope with contracts", "package_category": "documents",
    "weight_kg": "1",
}


@override_settings(**TEST_SETTINGS)
class DeliveriesTests(TransactionTestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        User = get_user_model()
        self.customer = User.objects.create_user(email="cust@test.test", password="x",
                                                 first_name="Ada", is_verified=True)
        self.admin = User.objects.create_user(email="admin@test.test", password="x",
                                              is_verified=True, is_staff=True)
        self.api = APIClient()
        self.api.force_authenticate(self.customer)
        self.api_admin = APIClient()
        self.api_admin.force_authenticate(self.admin)
        self.wallet = WalletService.get_or_create_wallet(self.customer, "NGN")
        WalletService.credit(self.wallet, Decimal("50000"))

    # -- helpers ------------------------------------------------------------ #

    def rider(self, name, lat, lng, *, status="approved", online=True, fresh=True,
              vehicle="motorcycle", rating="4.5"):
        User = get_user_model()
        u = User.objects.create_user(email=f"{name.lower()}@riders.test", password="x",
                                     first_name=name, is_verified=True)
        r = RiderProfile.objects.create(
            user=u, full_name=name, phone="0800000000", vehicle_type=vehicle,
            verification_status=status, availability="online" if online else "offline",
            lat=Decimal(str(lat)), lng=Decimal(str(lng)), rating_avg=Decimal(rating),
            location_updated_at=timezone.now() - (timedelta(0) if fresh else timedelta(hours=2)))
        c = APIClient()
        c.force_authenticate(u)
        r.client = c
        return r

    def order(self, **over):
        r = self.api.post("/api/v1/deliveries/requests/", {**ORDER, **over}, format="json")
        return r

    def balance(self, user=None):
        w = WalletService.get_or_create_wallet(user or self.customer, "NGN")
        w.refresh_from_db()
        return w.cached_balance

    # -- pricing ------------------------------------------------------------ #

    def test_pricing_defaults_and_rounding(self):
        q = pricing.quote(pickup_lat=PICKUP[0], pickup_lng=PICKUP[1], dropoff_lat=DROPOFF[0],
                          dropoff_lng=DROPOFF[1], weight_kg=1, category="documents")
        straight = pricing.haversine_km(*PICKUP, *DROPOFF)
        self.assertAlmostEqual(float(q.distance_km), straight * 1.3, places=1)
        expected = Decimal("800") + Decimal("150") * q.distance_km
        self.assertEqual(q.fee % 50, 0)
        self.assertGreaterEqual(q.fee, expected)
        self.assertLess(q.fee - expected, 50)
        self.assertEqual(q.platform_fee + q.rider_payout, q.fee)
        self.assertEqual(q.platform_fee, (q.fee * Decimal("0.2")).quantize(Decimal("0.01")))

    def test_pricing_zone_weight_category_surge_cap(self):
        DeliveryZone.objects.create(name="Lagos Island", center_lat=PICKUP[0], center_lng=PICKUP[1],
                                    radius_km=10, base_fare=1000, per_km=200, per_kg=50,
                                    min_fare=1500, zone_multiplier=Decimal("1.10"))
        DeliveryZone.objects.create(name="Lagos", center_lat=PICKUP[0], center_lng=PICKUP[1],
                                    radius_km=50, base_fare=1, per_km=1, min_fare=1)
        SurgePricing.objects.create(multiplier=Decimal("4.00"), reason="Rain")
        q = pricing.quote(pickup_lat=PICKUP[0], pickup_lng=PICKUP[1], dropoff_lat=DROPOFF[0],
                          dropoff_lng=DROPOFF[1], weight_kg=9, category="fragile")
        self.assertEqual(q.zone_name, "Lagos Island")            # smallest containing zone
        self.assertEqual(q.weight_fare, Decimal("200.00"))       # (9 − 5 free) × 50
        self.assertEqual(q.category_multiplier, Decimal("1.20"))
        self.assertEqual(q.surge_multiplier, Decimal("2.50"))     # capped at max_surge
        self.assertEqual(q.surge_reason, "Rain")
        raw = (Decimal("1000") + Decimal("200") * q.distance_km + 200) * Decimal("1.1") \
            * Decimal("1.2") * Decimal("2.5")
        self.assertGreaterEqual(q.fee, raw)
        self.assertLess(q.fee - raw, 50)

    def test_min_fare_and_invalid_routes(self):
        near = pricing.quote(pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                             dropoff_lat=PICKUP[0] + Decimal("0.003"), dropoff_lng=PICKUP[1])
        self.assertEqual(near.fee, Decimal("1200.00"))
        self.assertTrue(near.min_fare_applied)
        with self.assertRaises(pricing.PricingError):
            pricing.quote(pickup_lat=PICKUP[0], pickup_lng=PICKUP[1], dropoff_lat=PICKUP[0],
                          dropoff_lng=PICKUP[1])
        r = self.api.post("/api/v1/deliveries/requests/quote/",
                          {"pickup_lat": 6.4281, "pickup_lng": 3.4219, "dropoff_lat": 9.07,
                           "dropoff_lng": 7.49}, format="json")      # Lagos → Abuja
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["code"], "invalid_route")

    def test_quote_endpoint(self):
        r = self.api.post("/api/v1/deliveries/requests/quote/",
                          {"pickup_lat": 6.428123456, "pickup_lng": 3.4219, "dropoff_lat": 6.455,
                           "dropoff_lng": 3.3941, "weight_kg": 2, "package_category": "small"},
                          format="json")
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        for k in ("fee", "distance_km", "duration_min", "rider_payout", "platform_fee",
                  "surge_multiplier", "currency"):
            self.assertIn(k, body)
        self.assertEqual(body["currency"], "NGN")

    # -- create + dispatch -------------------------------------------------- #

    def test_wallet_hold_and_offers_go_to_nearest_eligible(self):
        DispatchSettings.objects.update_or_create(pk=1, defaults={"offer_batch": 2})
        near = self.rider("Near", 6.4300, 3.4230)
        mid = self.rider("Mid", 6.4400, 3.4219)
        self.rider("Third", 6.4450, 3.4219)                                  # 3rd closest
        self.rider("Far", 6.6000, 3.3500)                                    # ~20 km
        self.rider("Offline", 6.4282, 3.4220, online=False)
        self.rider("Pending", 6.4282, 3.4220, status="pending")
        self.rider("Stale", 6.4282, 3.4220, fresh=False)
        self.rider("Bike", 6.4282, 3.4220, vehicle="bicycle")               # fine for 1 kg docs

        r = self.order()
        self.assertEqual(r.status_code, 201, r.content)
        d = r.json()
        fee = Decimal(d["fee"])
        self.assertEqual(d["payment_status"], "paid")
        self.assertEqual(self.balance(), Decimal("50000") - fee)
        self.assertEqual(len(d["delivery_code"]), 4)
        offered = set(DispatchOffer.objects.values_list("rider__full_name", flat=True))
        self.assertEqual(offered, {"Bike", "Near"})
        self.assertNotIn("Mid", offered)
        self.assertTrue(DeliveryTransaction.objects.filter(delivery_id=d["id"], status="held").exists())
        # Rider sees the offer with payout but not the delivery code.
        offers = near.client.get("/api/v1/deliveries/rider/offers/").json()
        self.assertEqual(len(offers), 1)
        self.assertNotIn("delivery_code", offers[0]["delivery"])
        self.assertEqual(mid.client.get("/api/v1/deliveries/rider/offers/").json(), [])

    def test_large_items_need_car_or_van(self):
        self.rider("Moto", 6.4300, 3.4230)
        self.rider("Van", 6.4400, 3.4219, vehicle="van")
        r = self.order(package_category="large", weight_kg="30")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(list(DispatchOffer.objects.values_list("rider__full_name", flat=True)),
                         ["Van"])

    def test_insufficient_funds(self):
        WalletService.debit(self.wallet, Decimal("49900"))
        r = self.order()
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.json()["code"], "insufficient_funds")
        self.assertFalse(DeliveryRequest.objects.exists())
        self.assertEqual(self.balance(), Decimal("100"))

    def test_price_changed_guard(self):
        r = self.order(expected_fee="10.00")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["code"], "price_changed")
        self.assertFalse(DeliveryRequest.objects.exists())

    def test_accept_race_first_wins(self):
        a = self.rider("A", 6.4300, 3.4230)
        b = self.rider("B", 6.4301, 3.4231)
        d = self.order().json()
        oa = DispatchOffer.objects.get(rider=a)
        ob = DispatchOffer.objects.get(rider=b)
        r1 = a.client.post(f"/api/v1/deliveries/rider/offers/{oa.id}/accept/")
        self.assertEqual(r1.status_code, 200, r1.content)
        r2 = b.client.post(f"/api/v1/deliveries/rider/offers/{ob.id}/accept/")
        self.assertEqual(r2.status_code, 409)
        self.assertIn(r2.json()["code"], ("offer_gone", "taken"))
        ob.refresh_from_db()
        self.assertEqual(ob.status, "withdrawn")
        detail = self.api.get(f"/api/v1/deliveries/requests/{d['id']}/").json()
        self.assertEqual(detail["status"], "accepted")
        self.assertEqual(detail["rider"]["full_name"], "A")

    def test_reject_moves_to_next_round_and_radius(self):
        DispatchSettings.objects.update_or_create(pk=1, defaults={"offer_batch": 1})
        a = self.rider("A", 6.4300, 3.4230)                  # ~0.25 km
        b = self.rider("B", 6.4281, 3.4900)                  # ~7.5 km → round 2 (10 km)
        d = self.order().json()
        offer = DispatchOffer.objects.get()
        self.assertEqual((offer.rider_id, offer.round), (a.id, 1))
        r = a.client.post(f"/api/v1/deliveries/rider/offers/{offer.id}/reject/")
        self.assertEqual(r.status_code, 200)
        nxt = DispatchOffer.objects.get(status="offered")
        self.assertEqual((nxt.rider_id, nxt.round), (b.id, 2))
        b.client.post(f"/api/v1/deliveries/rider/offers/{nxt.id}/reject/")
        detail = self.api.get(f"/api/v1/deliveries/requests/{d['id']}/").json()
        self.assertTrue(detail["dispatch_exhausted"])
        self.assertEqual(detail["status"], "pending")

    def test_lazy_expiry_reoffers(self):
        DispatchSettings.objects.update_or_create(pk=1, defaults={"offer_batch": 1})
        a = self.rider("A", 6.4300, 3.4230)
        b = self.rider("B", 6.4400, 3.4219)
        self.order()
        DispatchOffer.objects.filter(rider=a).update(expires_at=timezone.now() - timedelta(seconds=1))
        offers = b.client.get("/api/v1/deliveries/rider/offers/").json()
        self.assertEqual(len(offers), 1)
        self.assertEqual(DispatchOffer.objects.get(rider=a).status, "expired")

    def test_no_riders_flags_exhausted_and_rider_coming_online_gets_it(self):
        d = self.order().json()
        self.assertTrue(d["dispatch_exhausted"])
        late = self.rider("Late", 6.4300, 3.4230, online=False)
        r = late.client.post("/api/v1/deliveries/rider/availability/",
                             {"online": True, "lat": 6.43, "lng": 3.423}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(late.client.get("/api/v1/deliveries/rider/offers/").json()), 1)

    # -- execution + money -------------------------------------------------- #

    def test_full_flow_settles_rider_and_revenue(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        d = self.order().json()
        fee = Decimal(d["fee"])
        offer = DispatchOffer.objects.get()
        base = "/api/v1/deliveries/rider/deliveries/" + d["id"]
        self.assertEqual(rider.client.post(f"{base}/deliver/", {"code": d["delivery_code"]}).status_code, 404)
        self.assertEqual(rider.client.post(f"/api/v1/deliveries/rider/offers/{offer.id}/accept/").status_code, 200)
        active = rider.client.get("/api/v1/deliveries/rider/active/").json()
        self.assertEqual(active["delivery"]["id"], d["id"])
        self.assertEqual(rider.client.post(f"{base}/start/").status_code, 409)     # pickup first
        self.assertEqual(rider.client.post(f"{base}/pickup/").json()["status"], "picked_up")
        # Customer can't cancel once picked up.
        self.assertEqual(self.api.post(f"/api/v1/deliveries/requests/{d['id']}/cancel/").status_code, 409)
        self.assertEqual(rider.client.post(f"{base}/start/").json()["status"], "in_transit")
        r = rider.client.post(f"{base}/deliver/", {})
        self.assertEqual(r.json()["code"], "proof_required")
        wrong = "0000" if d["delivery_code"] != "0000" else "1111"
        self.assertEqual(rider.client.post(f"{base}/deliver/", {"code": wrong}).json()["code"], "bad_code")
        r = rider.client.post(f"{base}/deliver/", {"code": d["delivery_code"]})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["status"], "delivered")

        payout = (fee * Decimal("0.8")).quantize(Decimal("0.01"))
        self.assertEqual(self.balance(rider.user), payout)
        self.assertEqual(self.balance(), Decimal("50000") - fee)
        self.assertEqual(WalletService.revenue_balance("NGN"), fee - payout)
        self.assertEqual(WalletService.account_balance("deliveries:rider_clearing", "NGN"), 0)
        txn = DeliveryTransaction.objects.get()
        self.assertEqual((txn.status, txn.rider_id), ("settled", rider.id))
        rider.refresh_from_db()
        self.assertEqual((rider.completed_deliveries, rider.total_earnings), (1, payout))

        e = rider.client.get("/api/v1/deliveries/rider/earnings/").json()
        self.assertEqual(Decimal(e["wallet_balance"]), payout)
        self.assertEqual(Decimal(e["today"]), payout)
        self.assertEqual(len(e["ledger"]), 1)

        r = self.api.post(f"/api/v1/deliveries/requests/{d['id']}/rate/", {"rating": 5}, format="json")
        self.assertEqual(r.status_code, 200)
        rider.refresh_from_db()
        self.assertEqual((rider.rating_avg, rider.rating_count), (Decimal("5.00"), 1))
        statuses = [ev["status"] for ev in r.json()["events"]]
        for s in ("pending", "accepted", "picked_up", "in_transit", "delivered"):
            self.assertIn(s, statuses)

    def test_photo_proof_and_settle_once(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        d = self.order().json()
        rider.client.post(f"/api/v1/deliveries/rider/offers/{DispatchOffer.objects.get().id}/accept/")
        base = "/api/v1/deliveries/rider/deliveries/" + d["id"]
        rider.client.post(f"{base}/pickup/")
        r = rider.client.post(f"{base}/deliver/", {"photo_url": "https://res.cloudinary.com/demo/p.jpg"})
        self.assertEqual(r.json()["status"], "delivered")
        self.assertEqual(rider.client.post(f"{base}/deliver/", {"code": d["delivery_code"]}).status_code, 409)
        self.assertEqual(self.balance(rider.user), Decimal(d["fee"]) * Decimal("0.8"))

    def test_cancel_refunds_and_frees_rider(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        d = self.order().json()
        rider.client.post(f"/api/v1/deliveries/rider/offers/{DispatchOffer.objects.get().id}/accept/")
        r = self.api.post(f"/api/v1/deliveries/requests/{d['id']}/cancel/", {"reason": "Changed plans"},
                          format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.json()["status"], r.json()["payment_status"]), ("cancelled", "refunded"))
        self.assertEqual(self.balance(), Decimal("50000"))
        self.assertIsNone(rider.client.get("/api/v1/deliveries/rider/active/").json()["delivery"])
        self.assertEqual(self.api.post(f"/api/v1/deliveries/requests/{d['id']}/cancel/").status_code, 409)

    def test_rider_release_redispatches(self):
        a = self.rider("A", 6.4300, 3.4230)
        b = self.rider("B", 6.4400, 3.4219)
        DispatchSettings.objects.update_or_create(pk=1, defaults={"offer_batch": 1})
        d = self.order().json()
        a.client.post(f"/api/v1/deliveries/rider/offers/{DispatchOffer.objects.get(rider=a).id}/accept/")
        r = a.client.post(f"/api/v1/deliveries/rider/deliveries/{d['id']}/release/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(DispatchOffer.objects.get(status="offered").rider_id, b.id)

    def test_other_users_cannot_see_or_act(self):
        d = self.order().json()
        stranger = self.rider("Stranger", 6.4300, 3.4230, online=False)
        self.assertEqual(stranger.client.get(f"/api/v1/deliveries/requests/{d['id']}/").status_code, 404)
        self.assertEqual(stranger.client.post(
            f"/api/v1/deliveries/rider/deliveries/{d['id']}/pickup/").status_code, 404)
        self.assertEqual(self.api.get("/api/v1/deliveries/admin/overview/").status_code, 403)

    # -- card payments ------------------------------------------------------ #

    def test_card_checkout_then_verify(self):
        self.rider("Musa", 6.4300, 3.4230)
        r = self.order(payment_method="card")
        self.assertEqual(r.status_code, 201, r.content)
        d = r.json()
        self.assertEqual(d["payment_status"], "unpaid")
        self.assertTrue(d["payment_url"].startswith("https://mock.local/pay/DLV-"))
        self.assertFalse(DispatchOffer.objects.exists())
        r = self.api.post(f"/api/v1/deliveries/requests/{d['id']}/verify-payment/")
        self.assertEqual(r.json()["payment_status"], "paid")
        self.assertEqual(self.balance(), Decimal("50000"))      # card money credited then held
        self.assertEqual(DispatchOffer.objects.count(), 1)
        # Idempotent.
        self.api.post(f"/api/v1/deliveries/requests/{d['id']}/verify-payment/")
        self.assertEqual(self.balance(), Decimal("50000"))

    # -- rider onboarding + admin ------------------------------------------ #

    def test_rider_apply_and_admin_review(self):
        User = get_user_model()
        u = User.objects.create_user(email="new@riders.test", password="x", is_verified=True)
        c = APIClient()
        c.force_authenticate(u)
        bad = c.post("/api/v1/deliveries/rider/apply/", {
            "full_name": "Emeka", "phone": "08030000000", "vehicle_type": "motorcycle",
            "documents": [{"kind": "id_card", "url": "https://res.cloudinary.com/demo/id.jpg"}]},
            format="json")
        self.assertEqual(bad.status_code, 400)                  # plate + licence needed
        r = c.post("/api/v1/deliveries/rider/apply/", {
            "full_name": "Emeka", "phone": "08030000000", "vehicle_type": "motorcycle",
            "vehicle_plate": "LAG-123-XY", "bank_code": "058", "account_number": "0123456789",
            "documents": [{"kind": "id_card", "url": "https://res.cloudinary.com/demo/id.jpg"},
                          {"kind": "license", "url": "https://res.cloudinary.com/demo/lic.jpg"}]},
            format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["verification_status"], "pending")
        self.assertEqual(r.json()["payout_account"]["account_number"], "••••••6789")
        self.assertEqual(r.json()["payout_account"]["account_name"], "MOCK ACCOUNT HOLDER")
        on = c.post("/api/v1/deliveries/rider/availability/", {"online": True, "lat": 6.43, "lng": 3.42},
                    format="json")
        self.assertEqual(on.json()["code"], "not_approved")

        lst = self.api_admin.get("/api/v1/deliveries/admin/riders/?status=pending").json()
        self.assertEqual(lst["count"], 1)
        rid = lst["results"][0]["id"]
        self.assertEqual(len(lst["results"][0]["documents"]), 2)
        r = self.api_admin.post(f"/api/v1/deliveries/admin/riders/{rid}/review/", {"action": "approve"},
                                format="json")
        self.assertEqual(r.json()["verification_status"], "approved")
        on = c.post("/api/v1/deliveries/rider/availability/", {"online": True, "lat": 6.43, "lng": 3.42},
                    format="json")
        self.assertEqual(on.json()["availability"], "online")
        r = self.api_admin.post(f"/api/v1/deliveries/admin/riders/{rid}/review/",
                                {"action": "suspend", "note": "Complaints"}, format="json")
        self.assertEqual((r.json()["verification_status"], r.json()["availability"]),
                         ("suspended", "offline"))
        self.assertEqual(c.post("/api/v1/deliveries/rider/location/", {"lat": 6.4, "lng": 3.4},
                                format="json").status_code, 403)

    def test_admin_config_and_monitoring(self):
        r = self.api_admin.post("/api/v1/deliveries/admin/zones/", {
            "name": "Lekki", "center_lat": "6.4474", "center_lng": "3.4720", "radius_km": "8",
            "base_fare": "900", "per_km": "170", "per_kg": "100", "min_fare": "1300"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        r = self.api_admin.post("/api/v1/deliveries/admin/surges/", {
            "zone": r.json()["id"], "multiplier": "1.5", "reason": "Friday rush"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()["is_live"])
        r = self.api_admin.patch("/api/v1/deliveries/admin/settings/", {"commission_rate": "0.150",
                                                                         "offer_batch": 2}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["commission_rate"], "0.150")
        self.assertEqual(self.api_admin.patch("/api/v1/deliveries/admin/settings/", {"max_rounds": 99},
                                              format="json").status_code, 400)

        self.rider("Musa", 6.4300, 3.4230)
        d = self.order().json()
        self.assertEqual(Decimal(d["fee"]) * Decimal("0.15"),
                         DeliveryRequest.objects.get().platform_fee)
        ov = self.api_admin.get("/api/v1/deliveries/admin/overview/").json()
        self.assertEqual(len(ov["online_riders"]), 1)
        self.assertEqual(len(ov["active_deliveries"]), 1)
        lst = self.api_admin.get("/api/v1/deliveries/admin/deliveries/?status=pending").json()
        self.assertEqual(lst["count"], 1)
        r = self.api_admin.post(f"/api/v1/deliveries/admin/deliveries/{d['id']}/redispatch/")
        self.assertEqual(r.status_code, 200, r.content)
        r = self.api_admin.post(f"/api/v1/deliveries/admin/deliveries/{d['id']}/cancel/", {}, format="json")
        self.assertEqual(r.json()["payment_status"], "refunded")
        self.assertEqual(self.balance(), Decimal("50000"))

    # -- maintenance -------------------------------------------------------- #

    def test_tick_secret_and_auto_refund(self):
        anon = APIClient()
        self.assertEqual(anon.post("/api/v1/deliveries/internal/tick/").status_code, 403)
        d = self.order().json()
        DeliveryRequest.objects.filter(pk=d["id"]).update(created_at=timezone.now() - timedelta(hours=3))
        r = anon.post("/api/v1/deliveries/internal/tick/", HTTP_X_CRON_SECRET="tick-secret")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["ran"]["auto_cancelled"], 1)
        self.assertEqual(self.balance(), Decimal("50000"))


    # -- bank payouts + cash ------------------------------------------------ #

    def bank(self, rider, number="0123456789"):
        r = rider.client.post("/api/v1/deliveries/rider/bank/", {"bank_code": "058", "account_number": number},
                              format="json")
        self.assertEqual(r.status_code, 200, r.content)

    def run_job(self, rider, d):
        offer = DispatchOffer.objects.get(delivery_id=d["id"], rider=rider)
        rider.client.post(f"/api/v1/deliveries/rider/offers/{offer.id}/accept/")
        base = "/api/v1/deliveries/rider/deliveries/" + d["id"]
        rider.client.post(f"{base}/pickup/")
        r = rider.client.post(f"{base}/deliver/", {"code": d["delivery_code"]})
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_in_app_payment_sends_80_percent_to_rider_bank(self):
        from apps.payouts.models import WithdrawalOrder
        rider = self.rider("Musa", 6.4300, 3.4230)
        self.bank(rider)
        d = self.order().json()
        self.run_job(rider, d)
        fee = Decimal(d["fee"])
        payout = (fee * Decimal("0.8")).quantize(Decimal("0.01"))
        txn = DeliveryTransaction.objects.get()
        self.assertEqual(txn.payout_status, "sent")
        order = WithdrawalOrder.objects.get(reference=txn.payout_reference)
        self.assertEqual((order.amount, order.status), (payout, "success"))
        self.assertEqual(self.balance(rider.user), Decimal("0"))            # all of it went to the bank
        self.assertEqual(WalletService.revenue_balance("NGN"), fee - payout)  # OAM keeps 20%, no transfer fee
        e = rider.client.get("/api/v1/deliveries/rider/earnings/").json()
        self.assertEqual(e["ledger"][0]["payout_status"], "sent")
        self.assertTrue(e["payout_account"]["account_number"].endswith("6789"))

    def test_failed_transfer_keeps_money_in_wallet(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        self.bank(rider)
        d = self.order().json()
        DeliveryRequest.objects.filter(pk=d["id"]).update(rider_payout=Decimal("1000.99"))   # mock fails .99
        DeliveryTransaction.objects.filter(delivery_id=d["id"]).update(rider_payout=Decimal("1000.99"))
        self.run_job(rider, d)
        self.assertEqual(DeliveryTransaction.objects.get().payout_status, "failed")
        self.assertEqual(self.balance(rider.user), Decimal("1000.99"))

    def test_no_bank_account_keeps_earnings_in_wallet(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        d = self.order().json()
        self.run_job(rider, d)
        self.assertEqual(DeliveryTransaction.objects.get().payout_status, "wallet")
        self.assertEqual(self.balance(rider.user), (Decimal(d["fee"]) * Decimal("0.8")).quantize(Decimal("0.01")))

    def test_bad_bank_account_rejected(self):
        rider = self.rider("Musa", 6.4300, 3.4230)
        r = rider.client.post("/api/v1/deliveries/rider/bank/", {"bank_code": "058", "account_number": "1234560000"},
                              format="json")
        self.assertEqual(r.json()["code"], "bank_invalid")

    def test_cash_delivery_commission_due_then_paid(self):
        DispatchSettings.objects.update_or_create(pk=1, defaults={
            "oam_bank_name": "GTBank", "oam_account_number": "0011223344", "oam_account_name": "OAM Ltd"})
        rider = self.rider("Musa", 6.4300, 3.4230)
        d = self.order(payment_method="cash").json()
        self.assertEqual(d["payment_status"], "cash")
        self.assertEqual(self.balance(), Decimal("50000"))                   # nothing taken from the wallet
        job = rider.client.get(f"/api/v1/deliveries/rider/offers/").json()[0]["delivery"]
        self.assertEqual(job["payment_method"], "cash")
        self.run_job(rider, d)
        fee = Decimal(d["fee"]); commission = (fee * Decimal("0.2")).quantize(Decimal("0.01"))
        rider.refresh_from_db()
        self.assertEqual(rider.cash_commission_due, commission)
        e = rider.client.get("/api/v1/deliveries/rider/earnings/").json()
        self.assertEqual(Decimal(e["cash_commission_due"]), commission)
        self.assertEqual(e["oam_bank"]["account_number"], "0011223344")
        # pay from wallet
        r = rider.client.post("/api/v1/deliveries/rider/commission/pay-wallet/")
        self.assertEqual(r.json()["code"], "insufficient_funds")
        WalletService.credit(WalletService.get_or_create_wallet(rider.user, "NGN"), Decimal("5000"))
        r = rider.client.post("/api/v1/deliveries/rider/commission/pay-wallet/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Decimal(r.json()["cash_commission_due"]), 0)
        self.assertEqual(WalletService.revenue_balance("NGN"), commission)
        self.assertEqual(DeliveryTransaction.objects.get().status, "settled")

    def test_admin_records_commission_and_debt_limit_blocks_cash_jobs(self):
        DispatchSettings.objects.update_or_create(pk=1, defaults={"cash_debt_limit": Decimal("100")})
        rider = self.rider("Musa", 6.4300, 3.4230)
        RiderProfile.objects.filter(pk=rider.pk).update(cash_commission_due=Decimal("500"))
        self.order(payment_method="cash")
        self.assertFalse(DispatchOffer.objects.exists())                     # owes too much for cash jobs
        r = self.api_admin.post(f"/api/v1/deliveries/admin/riders/{rider.id}/commission/", {"amount": "500"},
                                format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Decimal(r.json()["cash_commission_due"]), 0)
        self.assertEqual(WalletService.revenue_balance("NGN"), Decimal("500"))
        self.order(payment_method="cash")
        self.assertEqual(DispatchOffer.objects.count(), 1)
