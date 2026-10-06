"""
    python manage.py test apps.seo
"""
import json
import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.homeservices.models import ArtisanProfile, ServiceCategory
from apps.marketplace.models import Category, Listing, ListingImage

SHELL = ('<!doctype html><html lang="en"><head><meta charset="UTF-8" /><!-- O.A.M — ₦ -->'
         '<meta name="description" content="old" /><meta property="og:title" content="old" />'
         '<title>Old</title><script type="module" src="/assets/index-abc123.js"></script></head>'
         '<body><div id="root"></div></body></html>')


def fake_get(url, **kw):
    # No charset in the header (like many static hosts): must still be read as UTF-8.
    return mock.Mock(ok=True, status_code=200, content=SHELL.encode("utf-8"), text=SHELL.encode("utf-8").decode("latin-1"))


@override_settings(SEO_SITE_URL="https://www.oam-app.com",
                   CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class SeoTests(TestCase):
    def setUp(self):
        cache.clear()
        U = get_user_model()
        self.seller = U.objects.create_user(email="seller@test.test", password="x", first_name="Ngozi",
                                            phone="+2348030000000", is_verified=True)
        cat = Category.objects.create(name="Phones", slug="phones")
        self.live = Listing.objects.create(seller=self.seller, category=cat, title="iPhone 13 <Pro>",
                                           description="Clean phone. Battery 89%.", price=650000,
                                           contact_phone="08030000000", location="Ikeja, Lagos", condition="used")
        ListingImage.objects.create(listing=self.live, url="https://res.cloudinary.com/demo/image/upload/a.jpg", is_primary=True)
        self.expired = Listing.objects.create(seller=self.seller, category=cat, title="Old TV", description="x",
                                              price=10, contact_phone="0803", expires_at=timezone.now() - timedelta(days=1))
        self.sold = Listing.objects.create(seller=self.seller, category=cat, title="Sold bike", description="x",
                                           price=10, contact_phone="0803", status="sold")
        sc = ServiceCategory.objects.create(name="Plumbing", slug="plumbing")
        u2 = U.objects.create_user(email="art@test.test", password="x", is_verified=True)
        u3 = U.objects.create_user(email="art2@test.test", password="x", is_verified=True)
        self.verified = ArtisanProfile.objects.create(user=u2, category=sc, business_name="Pipes Ltd", phone="08031111111",
                                                      whatsapp="08031111111", address="12 Secret Close", city="Abuja",
                                                      state="FCT", latitude=9.07, longitude=7.39, is_verified=True,
                                                      description="Leak repairs and installs.")
        self.unverified = ArtisanProfile.objects.create(user=u3, category=sc, business_name="New Plumber", phone="0803",
                                                        city="Lagos", is_verified=False)
        self.api = APIClient()

    # ---- sitemap / robots -------------------------------------------------
    def test_sitemap_has_static_pages_live_listings_and_verified_artisans_only(self):
        r = self.client.get("/sitemap.xml")
        self.assertEqual(r.status_code, 200)
        self.assertIn("application/xml", r["Content-Type"])
        xml = r.content.decode()
        self.assertTrue(xml.startswith('<?xml version="1.0" encoding="UTF-8"?>'))
        locs = re.findall(r"<loc>(.*?)</loc>", xml)
        for p in ("/", "/marketplace", "/artisans", "/bills", "/travel", "/services/electricity", "/send-package"):
            self.assertIn("https://www.oam-app.com" + p, locs)
        self.assertIn(f"https://www.oam-app.com/marketplace/{self.live.id}", locs)
        self.assertNotIn(f"https://www.oam-app.com/marketplace/{self.expired.id}", locs)
        self.assertNotIn(f"https://www.oam-app.com/marketplace/{self.sold.id}", locs)
        self.assertIn(f"https://www.oam-app.com/artisans/{self.verified.id}", locs)
        self.assertNotIn(f"https://www.oam-app.com/artisans/{self.unverified.id}", locs)
        self.assertIn("<priority>1.0</priority>", xml)
        self.assertIn("<changefreq>hourly</changefreq>", xml)
        import xml.dom.minidom
        xml.dom.minidom.parseString(r.content)  # well-formed

    def test_robots(self):
        txt = self.client.get("/robots.txt").content.decode()
        self.assertIn("User-agent: *", txt)
        self.assertIn("Disallow: /api/", txt)
        self.assertIn("Allow: /api/v1/public/", txt)
        for p in ("/dashboard", "/wallet", "/checkout", "/admin/"):
            self.assertIn(f"Disallow: {p}", txt)
        self.assertIn("Sitemap: https://www.oam-app.com/sitemap.xml", txt)
        self.assertNotIn("Disallow: /marketplace\n", txt)

    # ---- public API ----------------------------------------------------------
    def test_public_listings_no_contact_details(self):
        r = self.api.get("/api/v1/public/listings/?q=iphone")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["title"] for x in r.json()["results"]], ["iPhone 13 <Pro>"])
        d = self.api.get(f"/api/v1/public/listings/{self.live.id}/").json()
        body = json.dumps(d)
        self.assertEqual(d["seller_name"], "Ngozi")
        for secret in ("0803", "seller@test.test", "contact_phone", "is_owner"):
            self.assertNotIn(secret, body)
        self.assertEqual(self.api.get(f"/api/v1/public/listings/{self.expired.id}/").status_code, 404)

    def test_public_artisans_hide_phone_and_address(self):
        rows = self.api.get("/api/v1/public/artisans/").json()["results"]
        self.assertEqual(rows[0]["business_name"], "Pipes Ltd")       # verified first
        d = self.api.get(f"/api/v1/public/artisans/{self.verified.id}/").json()
        body = json.dumps(d)
        for secret in ("08031111111", "Secret Close", "latitude", "longitude"):
            self.assertNotIn(secret, body)
        self.assertEqual(d["city"], "Abuja")

    # ---- server-rendered previews ---------------------------------------------
    @mock.patch("apps.seo.views.requests.get", side_effect=fake_get)
    def test_listing_preview(self, _get):
        r = self.client.get(f"/marketplace/{self.live.id}")
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        self.assertIn("<title>iPhone 13 &lt;Pro&gt; — ₦650,000 in Ikeja, Lagos | O.A.M Marketplace</title>", html)
        self.assertEqual(html.count("<title>"), 1)
        self.assertNotIn('content="old"', html)
        self.assertIn(f'<link rel="canonical" href="https://www.oam-app.com/marketplace/{self.live.id}" />', html)
        self.assertIn('<meta property="og:image" content="https://res.cloudinary.com/demo/image/upload/a.jpg" />', html)
        self.assertIn('<meta name="twitter:card" content="summary_large_image" />', html)
        self.assertIn('/assets/index-abc123.js', html)              # the real app still boots
        self.assertIn("<!-- O.A.M — ₦ -->", html)                     # decoded as UTF-8, not mojibake
        self.assertIn("<h1>iPhone 13 &lt;Pro&gt;</h1>", html)
        blocks = re.findall(r'<script type="application/ld\+json" data-seo="jsonld">(.*?)</script>', html)
        product = json.loads(blocks[0])
        self.assertEqual(product["@type"], "Product")
        self.assertEqual(product["offers"]["priceCurrency"], "NGN")
        self.assertEqual(product["offers"]["price"], "650000.00")
        self.assertEqual(product["offers"]["itemCondition"], "https://schema.org/UsedCondition")
        self.assertNotIn("<Pro>", blocks[0])                        # escaped inside the script
        self.assertEqual(json.loads(blocks[1])["@type"], "BreadcrumbList")

    @mock.patch("apps.seo.views.requests.get", side_effect=fake_get)
    def test_missing_listing_is_404_noindex(self, _get):
        r = self.client.get(f"/marketplace/{self.sold.id}")
        self.assertEqual(r.status_code, 404)
        self.assertIn('content="noindex,follow"', r.content.decode())

    @mock.patch("apps.seo.views.requests.get", side_effect=fake_get)
    def test_private_subpaths_noindex_and_browse_indexed(self, _get):
        self.assertIn("noindex", self.client.get("/marketplace/sell").content.decode())
        browse = self.client.get("/marketplace/browse").content.decode()
        self.assertIn('content="index,follow"', browse)
        self.assertIn('href="https://www.oam-app.com/marketplace"', browse)

    @mock.patch("apps.seo.views.requests.get", side_effect=fake_get)
    def test_artisan_preview(self, _get):
        html = self.client.get(f"/artisans/{self.verified.id}").content.decode()
        self.assertIn("Pipes Ltd — Plumbing in Abuja, FCT | Hire on O.A.M", html)
        self.assertIn('content="index,follow"', html)
        self.assertNotIn("Secret Close", html)
        data = json.loads(re.findall(r'data-seo="jsonld">(.*?)</script>', html)[0])
        self.assertEqual(data["@type"], "ProfessionalService")
        self.assertEqual(data["address"]["addressLocality"], "Abuja")
        self.assertNotIn("aggregateRating", data)
        un = self.client.get(f"/artisans/{self.unverified.id}").content.decode()
        self.assertIn('content="noindex,follow"', un)

    @mock.patch("apps.seo.views.requests.get", side_effect=Exception("down"))
    def test_shell_falls_back_to_last_good_copy(self, _get):
        cache.set("seo:shell:stale", SHELL, 100)
        import requests as rq
        with mock.patch("apps.seo.views.requests.get", side_effect=rq.RequestException("down")):
            html = self.client.get(f"/marketplace/{self.live.id}").content.decode()
        self.assertIn("/assets/index-abc123.js", html)

    def test_api_and_admin_unaffected(self):
        self.assertEqual(self.client.get("/api/v1/marketplace/public/listings/").status_code, 200)
        self.assertIn(self.client.get("/admin/").status_code, (200, 302))
