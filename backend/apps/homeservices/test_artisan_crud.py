from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.homeservices.models import ArtisanProfile, BoostPayment, ServiceCategory

ME = "/api/v1/homeservices/artisans/me/"
REGISTER = "/api/v1/homeservices/artisans/register/"


@override_settings(SECURE_SSL_REDIRECT=False)
class ArtisanSelfServiceTests(TestCase):
    def setUp(self):
        self.mech = ServiceCategory.objects.create(name="Mechanic", slug="mechanic")
        self.elec = ServiceCategory.objects.create(name="Electrician", slug="electrician")
        self.user = get_user_model().objects.create_user(email="art@oam.test", password="x-Pass-12345", is_verified=True)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def fresh(self):
        # Each real request loads the user anew; mirror that so a cached
        # user.artisan_profile from an earlier call doesn't linger.
        self.api.force_authenticate(get_user_model().objects.get(pk=self.user.pk))

    def register(self, category="mechanic"):
        return self.api.post(REGISTER, {"category": category, "business_name": "Emeka Auto", "phone": "+2348030000000",
                                        "city": "Abuja", "description": "Engines", "years_experience": 5}, format="json")

    def test_register_accepts_trade_slug_or_id(self):
        r = self.register("mechanic")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(ArtisanProfile.objects.get(user=self.user).category, self.mech)
        ArtisanProfile.objects.filter(user=self.user).delete()
        self.fresh()
        self.assertEqual(self.register(str(self.elec.id)).status_code, 201)

    def test_unknown_trade_has_clear_message(self):
        r = self.register("astronaut")
        self.assertEqual(r.status_code, 400)
        self.assertIn("That trade isn't available", str(r.json()["category"]))

    def test_edit_own_profile(self):
        self.register()
        r = self.api.patch(ME, {"business_name": "Emeka Motors", "category": "electrician", "is_available": False}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        p = ArtisanProfile.objects.get(user=self.user)
        self.assertEqual((p.business_name, p.category, p.is_available), ("Emeka Motors", self.elec, False))
        self.assertEqual(self.api.get(ME).json()["business_name"], "Emeka Motors")

    def test_delete_own_profile_keeps_payments_and_allows_relisting(self):
        self.register()
        BoostPayment.objects.create(user=self.user, days=30, amount=2500, reference="B-1")
        payments_before = BoostPayment.objects.filter(user=self.user).count()
        r = self.api.delete(ME)
        self.assertEqual(r.status_code, 204)
        self.fresh()
        self.assertFalse(ArtisanProfile.objects.filter(user=self.user).exists())
        self.assertEqual(BoostPayment.objects.filter(user=self.user).count(), payments_before)
        self.assertEqual(self.api.get(ME).status_code, 404)
        self.assertEqual(self.api.delete(ME).status_code, 404)
        self.assertEqual(self.register().status_code, 201)  # can list again

    def test_delete_only_touches_own_profile(self):
        other = get_user_model().objects.create_user(email="o@oam.test", password="x-Pass-12345", is_verified=True)
        ArtisanProfile.objects.create(user=other, category=self.mech, business_name="Other", phone="1", city="Lagos")
        self.register()
        self.api.delete(ME)
        self.assertTrue(ArtisanProfile.objects.filter(user=other).exists())
