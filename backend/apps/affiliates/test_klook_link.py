from urllib.parse import parse_qs, urlparse

from django.test import TestCase, override_settings

from integrations.hotels.klook.adapter import KlookHotels, with_landing

LAND = "https://www.klook.com/en-US/hotels/"


def q(url):
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


class KlookLandingTests(TestCase):
    def test_klook_redirect_without_destination_gets_one(self):
        url = with_landing("https://affiliate.klook.com/redirect?aid=1234&aff_adid=99", LAND)
        self.assertEqual(q(url)["k_site"], LAND)
        self.assertEqual(q(url)["aid"], "1234")                     # attribution kept

    def test_null_destination_replaced_but_real_one_kept(self):
        self.assertEqual(q(with_landing("https://affiliate.klook.com/redirect?aid=1&k_site=null", LAND))["k_site"], LAND)
        keep = "https://www.klook.com/en-US/city/78-dubai-things-to-do/"
        self.assertEqual(q(with_landing(f"https://affiliate.klook.com/redirect?aid=1&k_site={keep}", LAND))["k_site"], keep)

    def test_travelpayouts_click_link_gets_u(self):
        url = with_landing("https://tp.media/r?marker=555&p=4110&trs=1", LAND)
        self.assertEqual((q(url)["u"], q(url)["marker"]), (LAND, "555"))

    def test_other_links_untouched(self):
        self.assertEqual(with_landing("https://www.klook.com/", LAND), "https://www.klook.com/")

    def test_adapter_never_hands_out_tpk_ro_and_always_has_a_landing(self):
        link = KlookHotels({"url": "https://klook.tpk.ro/5WurYtDG"}).build_link(sub_id="u1")
        self.assertNotIn("tpk.ro", link.url)
        link = KlookHotels({"url": "https://affiliate.klook.com/redirect?aid=42", "landing_url": LAND}).build_link(sub_id="u1")
        self.assertEqual((q(link.url)["k_site"], q(link.url)["sub_id"]), (LAND, "u1"))


@override_settings(SECURE_SSL_REDIRECT=False)
class RedirectEndpointTests(TestCase):
    def test_go_klook_redirects_to_link_with_landing(self):
        from django.conf import settings
        cfg = {**settings.PROVIDER_CONFIG, "hotels": {"klook": {"url": "https://affiliate.klook.com/redirect?aid=42"}}}
        with override_settings(PROVIDER_CONFIG=cfg, DEFAULT_PROVIDERS={**settings.DEFAULT_PROVIDERS, "hotels": "klook"}):
            r = self.client.get("/api/v1/affiliates/go/klook/")
        self.assertEqual(r.status_code, 302)
        self.assertTrue(r["Location"].startswith("https://affiliate.klook.com/redirect?"))
        self.assertEqual(q(r["Location"])["k_site"], "https://www.klook.com/en-US/hotels/")
