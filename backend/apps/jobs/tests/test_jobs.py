"""
End-to-end tests for the jobs app.

    python manage.py test apps.jobs --settings=config.settings.test
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import json

from asgiref.sync import async_to_sync
from asgiref.testing import ApplicationCommunicator
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.jobs.models import (
    ApplicationStatus,
    CandidateProfile,
    ChatMessage,
    EmployerProfile,
    JobAlertDelivery,
    JobApplication,
    JobFlag,
    JobListing,
    JobPostCredit,
    SavedSearch,
)
from apps.jobs.services import AlertService, MaintenanceService

class WebsocketCommunicator(ApplicationCommunicator):
    """Minimal copy of channels.testing.WebsocketCommunicator (that package
    imports daphne, which this project doesn't install)."""

    def __init__(self, application, path):
        path, _, qs = path.partition("?")
        super().__init__(application, {"type": "websocket", "path": path,
                                       "query_string": qs.encode(), "headers": [],
                                       "subprotocols": []})

    async def connect(self, timeout=5):
        await self.send_input({"type": "websocket.connect"})
        resp = await self.receive_output(timeout)
        if resp["type"] == "websocket.close":
            return False, resp.get("code", 1000)
        return True, None

    async def send_json_to(self, data):
        await self.send_input({"type": "websocket.receive", "text": json.dumps(data)})

    async def receive_json_from(self, timeout=5):
        resp = await self.receive_output(timeout)
        return json.loads(resp["text"])

    async def disconnect(self, code=1000, timeout=1):
        await self.send_input({"type": "websocket.disconnect", "code": code})
        await self.wait(timeout)


TEST_SETTINGS = dict(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
    JOBS_PAYMENT_PROVIDER="mock",
    JOBS_USE_CELERY=False,
    CLOUDINARY_CLOUD_NAME="demo",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)

JOB = {
    "title": "Senior React Native Engineer",
    "description": "Build and ship the OAM mobile app used by thousands of customers "
                   "across Nigeria. You will own features end to end.",
    "requirements": "5+ years building mobile apps with React Native and TypeScript.",
    "skills": ["React Native", "TypeScript", "Redux", "Jest"],
    "category": "technology",
    "employment_type": "full_time",
    "experience_level": "senior",
    "min_years_experience": 5,
    "location_type": "remote",
    "country": "NG",
    "salary_min": "800000",
    "salary_max": "1500000",
    "salary_currency": "NGN",
    "salary_period": "month",
}


@override_settings(**TEST_SETTINGS)
class JobsFlowTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.boss = User.objects.create_user(email="boss@acme.test", password="x",
                                             first_name="Ada", is_verified=True)
        self.seeker = User.objects.create_user(email="seeker@test.test", password="x",
                                               first_name="Tunde", is_verified=True)
        self.other = User.objects.create_user(email="other@test.test", password="x",
                                              is_verified=True)
        self.api_boss = APIClient()
        self.api_boss.force_authenticate(self.boss)
        self.api_seeker = APIClient()
        self.api_seeker.force_authenticate(self.seeker)

    # -- helpers -------------------------------------------------------------- #

    def make_employer(self, client=None, name="Acme Ltd"):
        r = (client or self.api_boss).post("/api/v1/jobs/employers/me/",
                                            {"company_name": name, "country": "ng"},
                                            format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def make_job(self, publish=True, **over):
        r = self.api_boss.post("/api/v1/jobs/listings/", {**JOB, **over, "publish": publish},
                               format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def make_candidate(self):
        r = self.api_seeker.patch("/api/v1/jobs/candidates/me/", {
            "headline": "React Native developer",
            "summary": "Mobile engineer shipping fintech apps with React Native.",
            "skills": ["ReactJS", "react native", "TypeScript", "Jest"],
            "years_experience": 6,
            "cv_url": "https://res.cloudinary.com/demo/raw/upload/cv.pdf",
            "desired_location_types": ["remote"],
            "country": "ng",
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    # -- tests ------------------------------------------------------------------ #

    def test_employer_profile_and_free_plan_limit(self):
        emp = self.make_employer()
        self.assertEqual(emp["subscription_tier"], "free")
        self.assertEqual(emp["country"], "NG")

        job = self.make_job()
        self.assertEqual(job["status"], "active")
        self.assertIsNotNone(job["expires_at"])

        # free plan = 1 active job; the second publish must hit the limit
        second = self.make_job(publish=False, title="Backend Engineer (Django)")
        r = self.api_boss.post(f"/api/v1/jobs/listings/{second['id']}/publish/")
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.json()["code"], "job_limit_reached")

        r = self.api_boss.get(f"/api/v1/jobs/listings/{second['id']}/manage/")
        self.assertEqual(r.json()["status"], "draft")
        self.assertEqual(r.json()["salary_min"], "800000.00")
        r = self.api_seeker.get(f"/api/v1/jobs/listings/{second['id']}/manage/")
        self.assertEqual(r.status_code, 404)

        # a pay-per-job credit unlocks exactly one more
        JobPostCredit.objects.create(employer=EmployerProfile.objects.get(owner=self.boss),
                                     quantity=1, expires_at=timezone.now() + timedelta(days=30))
        r = self.api_boss.post(f"/api/v1/jobs/listings/{second['id']}/publish/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()["posted_with_credit"])

    def test_search_filters_and_full_text(self):
        self.make_employer()
        self.make_job()
        anon = APIClient()
        r = anon.get("/api/v1/jobs/listings/", {"q": "react native", "location_type": "remote"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)
        r = anon.get("/api/v1/jobs/listings/", {"q": "accountant"})
        self.assertEqual(r.json()["count"], 0)
        r = anon.get("/api/v1/jobs/listings/", {"location_type": "on_site"})
        self.assertEqual(r.json()["count"], 0)
        r = anon.get("/api/v1/jobs/listings/", {"salary_min": 1000000, "skills": "typescript"})
        self.assertEqual(r.json()["count"], 1)
        r = anon.get("/api/v1/jobs/meta/")
        self.assertIn("pipeline", r.json()["choices"])

    def test_apply_pipeline_and_chat(self):
        self.make_employer()
        job = self.make_job()
        self.make_candidate()

        r = self.api_seeker.post("/api/v1/jobs/applications/", {"job": job["id"]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        app = r.json()
        self.assertGreaterEqual(app["match_score"], 60)
        self.assertIn("react-native", app["match_details"]["matched_skills"])

        r = self.api_seeker.post("/api/v1/jobs/applications/", {"job": job["id"]}, format="json")
        self.assertEqual(r.json()["code"], "already_applied")

        # employer opens it -> auto "under review"
        r = self.api_boss.get(f"/api/v1/jobs/applications/{app['id']}/")
        self.assertEqual(r.json()["status"], "under_review")
        self.assertEqual(r.json()["candidate"]["email"], "seeker@test.test")

        # illegal jump
        r = self.api_boss.post(f"/api/v1/jobs/applications/{app['id']}/status/",
                               {"status": "hired"}, format="json")
        self.assertEqual(r.json()["code"], "invalid_transition")

        r = self.api_boss.post(f"/api/v1/jobs/applications/{app['id']}/status/",
                               {"status": "shortlisted", "note": "Strong RN portfolio"},
                               format="json")
        self.assertEqual(r.status_code, 200, r.content)

        # candidate can't move their own application
        r = self.api_seeker.post(f"/api/v1/jobs/applications/{app['id']}/status/",
                                 {"status": "offer"}, format="json")
        self.assertEqual(r.status_code, 403)

        # kanban
        r = self.api_boss.get("/api/v1/jobs/applications/pipeline/", {"job": job["id"]})
        cols = {c["status"]: c["count"] for c in r.json()["columns"]}
        self.assertEqual(cols["shortlisted"], 1)

        # candidate timeline hides employer notes
        r = self.api_seeker.get("/api/v1/jobs/applications/")
        mine = r.json()["results"][0]
        self.assertEqual([e["to_status"] for e in mine["events"]],
                         ["applied", "under_review", "shortlisted"])
        self.assertNotIn("employer_notes", mine)

        # chat
        r = self.api_boss.post(f"/api/v1/jobs/applications/{app['id']}/thread/")
        thread = r.json()["id"]
        r = self.api_boss.post(f"/api/v1/jobs/threads/{thread}/messages/",
                               {"body": "Hi Tunde, free for a call?", "client_id": "c1"},
                               format="json")
        self.assertEqual(r.status_code, 201, r.content)
        # idempotent retry
        self.api_boss.post(f"/api/v1/jobs/threads/{thread}/messages/",
                           {"body": "Hi Tunde, free for a call?", "client_id": "c1"},
                           format="json")
        self.assertEqual(ChatMessage.objects.filter(thread_id=thread, client_id="c1").count(), 1)
        # foreign attachment host rejected
        r = self.api_seeker.post(f"/api/v1/jobs/threads/{thread}/messages/",
                                 {"attachment": {"url": "https://evil.example/x.pdf"}},
                                 format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api_seeker.get("/api/v1/jobs/threads/")
        self.assertEqual(r.json()["results"][0]["unread"], 1)
        # outsider can't read
        outsider = APIClient()
        outsider.force_authenticate(self.other)
        r = outsider.get(f"/api/v1/jobs/threads/{thread}/messages/")
        self.assertEqual(r.status_code, 404)

    def test_free_plan_locks_applicants_beyond_cap(self):
        from apps.jobs.plans import PLANS
        self.make_employer()
        job = JobListing.objects.get(pk=self.make_job()["id"])
        User = get_user_model()
        cap = PLANS["free"].applications_per_job
        for i in range(cap + 2):
            u = User.objects.create_user(email=f"c{i}@t.test", password="x")
            c = CandidateProfile.objects.create(user=u, cv_url="https://x.test/cv.pdf")
            JobApplication.objects.create(job=job, candidate=c)
        r = self.api_boss.get("/api/v1/jobs/applications/pipeline/", {"job": str(job.id)})
        self.assertEqual(r.json()["locked_count"], 2)

    def test_candidate_search_is_plan_gated(self):
        self.make_employer()
        self.make_candidate()
        r = self.api_boss.get("/api/v1/jobs/candidates/", {"skills": "react"})
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.json()["code"], "upgrade_required")

    def test_checkout_and_verify_plan_upgrade(self):
        self.make_employer()
        r = self.api_boss.post("/api/v1/jobs/billing/checkout/",
                               {"purpose": "plan", "plan": "pro"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        ref = r.json()["reference"]
        self.assertTrue(ref.startswith("JOB-"))
        self.assertEqual(Decimal(r.json()["amount"]), Decimal("40000"))
        r = self.api_boss.post("/api/v1/jobs/billing/verify/", {"reference": ref}, format="json")
        self.assertEqual(r.json()["status"], "paid")
        self.assertEqual(r.json()["usage"]["subscription"]["active_plan"], "pro")
        # now candidate search works
        self.make_candidate()
        r = self.api_boss.get("/api/v1/jobs/candidates/", {"skills": "react native"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)
        self.assertNotIn("email", r.json()["results"][0])

    def test_saved_search_alerts(self):
        self.make_employer()
        r = self.api_seeker.post("/api/v1/jobs/saved-searches/", {
            "name": "Remote RN", "query": "react native",
            "filters": {"location_type": ["remote"]}, "frequency": "instant",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.make_job()   # publish -> instant alert runs inline after commit
        self.assertEqual(JobAlertDelivery.objects.count(), 1)

        saved = SavedSearch.objects.get()
        saved.frequency = SavedSearch.Frequency.DAILY
        saved.last_alerted_at = timezone.now() - timedelta(days=2)
        saved.save()
        self.assertEqual(AlertService.send_due_digests()["jobs"], 0)   # no duplicates

    def test_scam_listing_is_held(self):
        self.make_employer()
        job = self.make_job(title="Data entry clerk", experience_level="entry",
                            description="Earn daily from home! Pay a registration fee of "
                                        "N5000 via western union to start. WhatsApp only.",
                            salary_max="9000000", salary_min="100000")
        self.assertEqual(job["status"], "pending_review")
        self.assertTrue(JobFlag.objects.filter(job_id=job["id"]).exists())

    def test_expiry_maintenance(self):
        self.make_employer()
        job = self.make_job()
        JobListing.objects.filter(pk=job["id"]).update(expires_at=timezone.now()
                                                       - timedelta(minutes=1))
        self.assertEqual(MaintenanceService.expire_listings(), 1)
        self.assertEqual(JobListing.objects.get(pk=job["id"]).status, "expired")
        call_command("jobs_maintenance", verbosity=0)

    def test_websocket_chat_roundtrip(self):
        self.make_employer()
        job = self.make_job()
        self.make_candidate()
        app_id = self.api_seeker.post("/api/v1/jobs/applications/", {"job": job["id"]},
                                      format="json").json()["id"]
        thread = self.api_boss.post(f"/api/v1/jobs/applications/{app_id}/thread/").json()["id"]

        from config.asgi import application

        async def scenario():
            boss = WebsocketCommunicator(application,
                                         f"/ws/jobs/?token={AccessToken.for_user(self.boss)}")
            seeker = WebsocketCommunicator(application,
                                           f"/ws/jobs/?token={AccessToken.for_user(self.seeker)}")
            ok1, _ = await boss.connect()
            ok2, _ = await seeker.connect()
            assert ok1 and ok2
            await seeker.send_json_to({"type": "chat.send", "thread": thread,
                                       "body": "Hello!", "client_id": "m1"})
            got = await boss.receive_json_from(timeout=5)
            assert got["type"] == "chat.message", got
            assert got["data"]["body"] == "Hello!"
            events = [await seeker.receive_json_from(timeout=5) for _ in range(2)]
            assert {e["type"] for e in events} == {"chat.message", "chat.ack"}, events
            anon = WebsocketCommunicator(application, "/ws/jobs/?token=bad")
            ok3, code = await anon.connect()
            assert not ok3 and code == 4401
            await boss.disconnect()
            await seeker.disconnect()

        async_to_sync(scenario)()

    def test_home_feed_puts_paid_employers_first(self):
        from apps.jobs.models import EmployerSubscription
        self.make_employer()                                   # free employer
        self.make_job(title="Warehouse Supervisor")
        api_other = APIClient()
        api_other.force_authenticate(self.other)
        self.make_employer(client=api_other, name="Pro Corp")
        sub = EmployerSubscription.objects.get(employer__company_name="Pro Corp")
        sub.plan, sub.current_period_end = "pro", timezone.now() + timedelta(days=30)
        sub.save()
        r = api_other.post("/api/v1/jobs/listings/", {**JOB, "title": "Head of Engineering",
                                                      "publish": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)

        r = APIClient().get("/api/v1/jobs/listings/home-feed/")   # anonymous
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual([j["title"] for j in data["featured"]], ["Head of Engineering"])
        self.assertEqual([j["title"] for j in data["latest"]], ["Warehouse Supervisor"])
        self.assertEqual(data["total_live"], 2)
        # a lapsed paid plan no longer counts as featured
        sub.current_period_end = timezone.now() - timedelta(days=1)
        sub.save()
        self.assertEqual(APIClient().get("/api/v1/jobs/listings/home-feed/").json()["featured"], [])

    def test_application_status_is_enum(self):
        self.assertIn("interview", ApplicationStatus.values)


@override_settings(**TEST_SETTINGS)
class MaintenanceTriggerTests(TransactionTestCase):
    url = "/api/v1/jobs/internal/maintenance/"

    def test_disabled_without_secret(self):
        with override_settings(JOBS_CRON_SECRET=""):
            self.assertEqual(APIClient().post(self.url).status_code, 404)

    def test_secret_required_and_runs(self):
        with override_settings(JOBS_CRON_SECRET="s3cret"):
            self.assertEqual(APIClient().post(self.url, HTTP_X_CRON_SECRET="nope").status_code,
                             403)
            r = APIClient().post(self.url + "?only=expire,alerts", HTTP_X_CRON_SECRET="s3cret")
            self.assertEqual(r.status_code, 200, r.content)
            self.assertEqual(set(r.json()["ran"]), {"expire", "alerts"})
