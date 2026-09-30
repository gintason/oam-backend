"""Likes, views and comments on job posts (mirrors the marketplace)."""
from django.core.cache import cache
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from apps.jobs.models import JobComment, JobLike, JobListing

from .test_jobs import JobsFlowTests


class JobEngagementTests(TransactionTestCase):
    # Reuse the flow tests' fixtures/helpers without re-running their tests.
    make_employer = JobsFlowTests.make_employer
    make_job = JobsFlowTests.make_job

    def setUp(self):
        JobsFlowTests.setUp(self)
        cache.clear()
        self.make_employer()
        self.job = self.make_job()
        self.url = f"/api/v1/jobs/listings/{self.job['id']}"

    def test_like_toggles_and_counts(self):
        r = self.api_seeker.post(f"{self.url}/like/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json(), {"liked": True, "likes_count": 1})
        # Detail + list show it, with `liked` for this user.
        d = self.api_seeker.get(f"{self.url}/").json()
        self.assertEqual((d["likes_count"], d["liked"]), (1, True))
        card = self.api_seeker.get("/api/v1/jobs/listings/").json()["results"][0]
        self.assertEqual((card["likes_count"], card["liked"]), (1, True))
        # Toggle off.
        self.assertEqual(self.api_seeker.post(f"{self.url}/like/").json(), {"liked": False, "likes_count": 0})
        self.assertFalse(JobLike.objects.exists())

    def test_likes_from_two_users(self):
        self.api_seeker.post(f"{self.url}/like/")
        other = APIClient(); other.force_authenticate(self.other)
        self.assertEqual(other.post(f"{self.url}/like/").json()["likes_count"], 2)

    def test_anonymous_can_read_but_not_like_or_comment(self):
        anon = APIClient()
        self.assertEqual(anon.get(f"{self.url}/comments/").status_code, 200)
        self.assertIn(anon.post(f"{self.url}/like/").status_code, (401, 403))
        self.assertIn(anon.post(f"{self.url}/comments/", {"body": "hi"}, format="json").status_code, (401, 403))
        card = anon.get("/api/v1/jobs/listings/").json()["results"][0]
        self.assertIsNone(card["liked"])            # unknown for signed-out visitors
        self.assertIn("views_count", card)

    def test_comment_flow(self):
        r = self.api_seeker.post(f"{self.url}/comments/", {"body": "  Is this role open to juniors?  "}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["body"], "Is this role open to juniors?")
        self.assertFalse(r.json()["is_employer"])
        reply = self.api_boss.post(f"{self.url}/comments/", {"body": "Yes, 2+ years is fine."}, format="json").json()
        self.assertTrue(reply["is_employer"])
        rows = APIClient().get(f"{self.url}/comments/").json()
        self.assertEqual([c["body"] for c in rows], ["Yes, 2+ years is fine.", "Is this role open to juniors?"])
        self.assertEqual(JobListing.objects.get(pk=self.job["id"]).comments_count, 2)

    def test_empty_comment_rejected_and_rate_limited(self):
        self.assertEqual(self.api_seeker.post(f"{self.url}/comments/", {"body": "   "}, format="json").status_code, 400)
        for i in range(10):
            self.assertEqual(self.api_seeker.post(f"{self.url}/comments/", {"body": f"c{i}"}, format="json").status_code, 201)
        self.assertEqual(self.api_seeker.post(f"{self.url}/comments/", {"body": "one more"}, format="json").status_code, 429)
        self.assertEqual(JobComment.objects.count(), 10)

    def test_views_counted_for_visitors_not_owner(self):
        self.api_seeker.get(f"{self.url}/")
        APIClient().get(f"{self.url}/")
        self.api_boss.get(f"{self.url}/")            # the employer's own views don't count
        self.assertEqual(JobListing.objects.get(pk=self.job["id"]).views_count, 2)

    def test_owner_sees_counts_on_manage(self):
        self.api_seeker.post(f"{self.url}/like/")
        self.api_seeker.post(f"{self.url}/comments/", {"body": "Interested!"}, format="json")
        m = self.api_boss.get(f"{self.url}/manage/").json()
        self.assertEqual((m["likes_count"], m["comments_count"]), (1, 1))
