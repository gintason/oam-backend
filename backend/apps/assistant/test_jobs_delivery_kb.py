"""The knowledge-base fallback must route jobs and delivery questions to the right answer."""
from django.test import SimpleTestCase

from apps.assistant import service
from apps.assistant.knowledge import FAQS, PLATFORM_FACTS

ANSWER_ID = {f["answer"]: f.get("id") for f in FAQS}

CASES = {
    "How do I find a job on OAM?": "jobs_find",
    "How do I apply for a job?": "jobs_apply",
    "What does shortlisted mean?": "jobs_status",
    "can I cancel a job application": "jobs_withdraw",
    "how do I upload my CV": "jobs_profile",
    "how do I set up job alerts": "jobs_alerts",
    "An employer asked me to pay a registration fee, is this a scam?": "jobs_scam",
    "How do I post a job?": "jobs_employer",
    "How much is Premium for jobs?": "jobs_plans",
    "how do I boost my job": "jobs_credits",
    "how do I get my company verified as an employer": "jobs_verify",
    "does my job plan renew automatically": "jobs_renew",
    "How do I send a package?": "dlv_send",
    "How much does delivery cost?": "dlv_price",
    "how do I track my delivery": "dlv_track",
    "How do I cancel a delivery?": "dlv_cancel",
    "No rider has accepted my delivery": "dlv_no_rider",
    "can I pay cash on delivery": "dlv_pay_later",
    "What is the delivery code?": "dlv_code",
    "what's the maximum weight for a package": "dlv_limits",
    "my package was damaged": "dlv_problem",
    "How do I become a rider?": "rider_apply",
    "when do riders get paid": "rider_commission",
    "I'm a rider and not getting delivery requests": "rider_jobs",
    "how much is premium for my marketplace listings": "market_plans",
}


class JobsDeliveryKnowledgeTests(SimpleTestCase):
    def test_questions_reach_the_right_answer(self):
        for question, expected in CASES.items():
            with self.subTest(question=question):
                self.assertEqual(ANSWER_ID.get(service._fallback(question)), expected)

    def test_facts_match_the_plans(self):
        from apps.jobs.plans import PLANS
        self.assertEqual(PLANS["free"].applications_per_job, 50)
        self.assertIn("you can see the first 50 applicants", PLATFORM_FACTS)
        self.assertIn("Riders earn 80% of the delivery fee", PLATFORM_FACTS)
