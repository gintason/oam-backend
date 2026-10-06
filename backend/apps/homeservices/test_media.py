"""
    python manage.py test apps.homeservices.test_media
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.homeservices.models import ArtisanProfile, ServiceCategory
from apps.homeservices.work_videos import ArtisanWorkVideo
from apps.marketplace.models import Category, Listing, ListingImage, ListingVideo

VID = "https://res.cloudinary.com/demo/video/upload/v1/oam/artisans/video/clip.mp4"


@override_settings(CLOUDINARY_CLOUD_NAME="demo")
class MediaTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(email="art@test.test", password="x", is_verified=True)
        self.viewer = User.objects.create_user(email="cust@test.test", password="x", is_verified=True)
        cat = ServiceCategory.objects.create(name="Plumbing", slug="plumbing")
        self.artisan = ArtisanProfile.objects.create(user=self.owner, category=cat,
                                                     business_name="Pipes Ltd", phone="0803")
        self.a_owner, self.a_viewer = APIClient(), APIClient()
        self.a_owner.force_authenticate(self.owner)
        self.a_viewer.force_authenticate(self.viewer)

    def upload(self, url=VID):
        return self.a_owner.post("/api/v1/homeservices/artisans/work-videos/",
                                 {"video_url": url, "caption": "Kitchen sink"}, format="json")

    def test_upload_goes_live_and_shows_on_public_profile(self):
        r = self.upload()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["status"], "approved")
        d = self.a_viewer.get(f"/api/v1/homeservices/artisans/{self.artisan.id}/").json()
        self.assertEqual([v["url"] for v in d["work_videos"]], [VID])
        self.assertEqual(d["work_videos"][0]["caption"], "Kitchen sink")

    def test_rejected_and_pending_videos_are_hidden(self):
        self.upload()
        ArtisanWorkVideo.objects.update(status=ArtisanWorkVideo.Status.REJECTED)
        d = self.a_viewer.get(f"/api/v1/homeservices/artisans/{self.artisan.id}/").json()
        self.assertEqual(d["work_videos"], [])

    @override_settings(ARTISAN_VIDEOS_AUTO_APPROVE=False)
    def test_moderation_mode_keeps_pending(self):
        self.assertEqual(self.upload().json()["status"], "pending")
        d = self.a_viewer.get(f"/api/v1/homeservices/artisans/{self.artisan.id}/").json()
        self.assertEqual(d["work_videos"], [])

    def test_foreign_urls_refused(self):
        r = self.upload("https://evil.example.com/video.mp4")
        self.assertEqual(r.status_code, 400)
        r = self.upload("https://res.cloudinary.com/other/video/upload/x.mp4")
        self.assertEqual(r.status_code, 400)

    def test_client_cannot_set_status_and_owner_can_delete(self):
        r = self.a_owner.post("/api/v1/homeservices/artisans/work-videos/",
                              {"video_url": VID, "status": "approved"}, format="json")
        vid = r.json()["id"]
        self.assertEqual(self.a_viewer.delete(f"/api/v1/homeservices/artisans/work-videos/{vid}/").status_code, 404)
        self.assertEqual(self.a_owner.delete(f"/api/v1/homeservices/artisans/work-videos/{vid}/").status_code, 204)

    def test_listing_card_has_video_flag_and_detail_returns_videos(self):
        mcat = Category.objects.create(name="Phones", slug="phones")
        with_vid = Listing.objects.create(seller=self.owner, category=mcat, title="iPhone", description="x",
                                          price=100, contact_phone="0803", location="Lagos")
        ListingImage.objects.create(listing=with_vid, url="https://res.cloudinary.com/demo/image/upload/a.jpg", is_primary=True)
        ListingVideo.objects.create(listing=with_vid, url="https://res.cloudinary.com/demo/video/upload/a.mp4")
        Listing.objects.create(seller=self.owner, category=mcat, title="Case", description="x",
                               price=5, contact_phone="0803", location="Lagos")
        rows = self.a_viewer.get("/api/v1/marketplace/listings/").json()
        rows = rows.get("results", rows)
        flags = {r["title"]: r["has_video"] for r in rows}
        self.assertEqual(flags, {"iPhone": True, "Case": False})
        d = self.a_viewer.get(f"/api/v1/marketplace/listings/{with_vid.id}/").json()
        self.assertEqual(len(d["videos"]), 1)
        pub = self.client.get("/api/v1/marketplace/public/listings/").json()
        self.assertIn("has_video", pub["results"][0])
