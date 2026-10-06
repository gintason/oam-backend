#!/usr/bin/env python
"""
O.A.M Assistant: teach it about Jobs and Delivery & Dispatch (plus the new
marketplace/artisan videos and zoomable photos).

Run from the backend root (the folder with manage.py):
    python3 apply_assistant_knowledge.py

  apps/assistant/knowledge.py   facts for the AI mode, pages to point to,
                                ready answers for the no-AI fallback, greeting
  apps/assistant/service.py     "where is my package / application" → account answer
Backup: *.bak-kb. No migration. Every figure below matches the code as built
(job plan prices from apps/jobs/plans.py; delivery rules from apps/deliveries).
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def patch(rel, marker, reps):
    p = ROOT / rel
    if not p.exists():
        problems.append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:70]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    bak = p.with_name(p.name + ".bak-kb")
    if not bak.exists():
        shutil.copy2(p, bak)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "manage.py").exists():
    print("Run this from the backend root (the folder containing manage.py).")
    sys.exit(1)

FACTS_NEW = '''JOBS (find work / hire)
For job seekers (free):
- Build a profile with your CV, headline, skills and the kind of work you want
- Search jobs by keyword and filter by remote / hybrid / on-site, employment type
  (full-time, part-time, contract, temporary, internship, freelance), experience
  level, category, salary and country
- Apply in one click with your profile, or send a full application with a cover
  letter. Some employers apply on their own website instead.
- Track every application in My applications. Statuses: Applied, Under review,
  Shortlisted, Interview, Offer, Hired, or Rejected. You can withdraw an
  application at any point before you're hired.
- Save jobs, and save searches with alerts (instantly, daily or weekly)
- Chat privately with employers in the app; you can send files such as a CV
- Legitimate employers never charge you to apply. Listings are screened for
  scam signs (e.g. "registration fee", "WhatsApp only"), and suspicious ones are
  held for review. Never pay anyone to get a job; report the listing instead.
For employers:
- Create a company page (it can be verified by OAM), post jobs with a step-by-
  step form, and manage applicants on a pipeline board
- Plans (monthly, paid by card; they do NOT renew automatically — you get a
  reminder 3 days before the end and renew if you want to):
  - Free: 1 active job, live for 30 days, up to 50 applications per job
  - Premium: 15,000 NGN (or $15 / £12 / €14) a month — 10 active jobs, live 45
    days, 2 featured jobs, search the candidate database (50 profile views a
    month), analytics and recommended candidates
  - Pro: 40,000 NGN (or $39 / £32 / €36) a month — unlimited jobs, live 60 days,
    10 featured jobs, unlimited candidate views, and you can message candidates
    who haven't applied
- Pay per job: 5,000 NGN ($5 / £4 / €5) for one extra job listing, usable for 30 days
- Boost a job to the top of search: 3,000 NGN for 7 days or 9,000 NGN for 30 days
  ($3/$9, £3/£7, €3/€8)
- Expired listings can be renewed

DELIVERY & DISPATCH (Send a Package)
For customers:
- Send documents, parcels, food, fragile or large items across town, same day.
  Choose pickup and drop-off on the map, add the recipient's name and phone, the
  package type and weight.
- You see the full price before you pay. It depends on distance, weight,
  package type and the area, and can be higher at very busy times. If the price
  changes before you confirm, you're shown the new price to accept first.
- Ways to pay: OAM Wallet; card (Flutterwave checkout); Pay on delivery (the
  rider shows a secure payment link at the door, or you pay cash then — the
  package is handed over once paid); or Cash at pickup (pay the rider in cash
  when they collect).
- The nearest verified rider (bicycle, motorcycle, car or van, to suit the
  package) is matched automatically. Track the rider live on the map with status
  updates: Finding a rider, Accepted, Picked up, On the way, Delivered.
- Your delivery has a 4-digit delivery code. Share it with the recipient; the
  rider enters it at the door to confirm hand-over (or takes a photo as proof).
- You can cancel free of charge until the rider picks the package up. Wallet and
  card payments come back to your OAM wallet in full. If no rider accepts within
  90 minutes, the delivery is cancelled and refunded automatically.
- Rate your rider after delivery. Your deliveries are listed under My deliveries.
For riders ("Ride & Earn" in the OAM mobile app):
- Apply with your details, vehicle, documents (government ID, licence, vehicle
  papers, a selfie with your ID) and the bank account your earnings are paid to.
  A person on the OAM team reviews the application before you can take jobs.
- Go online to receive delivery requests nearby, and accept the ones you want.
- Riders earn 80% of the delivery fee; OAM keeps 20%. For wallet, card and
  pay-on-delivery link payments, the rider's 80% is sent automatically to their
  bank account after each completed delivery.
- For cash deliveries the rider keeps the cash and owes OAM's 20% commission.
  Pay it from your OAM wallet in the app, or by bank transfer to OAM's account
  shown on the rider dashboard. Riders with too much unpaid commission don't get
  new cash jobs until it's paid.
- Earnings, payouts and commission owed are shown under Earnings.

'''

patch("apps/assistant/knowledge.py", "DELIVERY & DISPATCH (Send a Package)", [
    # marketplace: videos + zoom
    ('''  only when the seller accepts the enquiry.
''',
     '''  only when the seller accepts the enquiry.
- Sellers can add up to 5 photos and a short video (up to 2 minutes). Buyers can
  watch the video on the listing, and tap a photo to view it full screen and
  pinch or double-tap to zoom.
'''),
    # artisans: work videos
    ('''- Contact details work the same as the marketplace: shared only after the
  artisan accepts the job
''',
     '''- Contact details work the same as the marketplace: shared only after the
  artisan accepts the job
- Artisans can upload videos of previous work (10 seconds to 3 minutes each,
  up to 12) under "Videos of my work"; customers watch them on the artisan's
  profile. OAM can remove a video that breaks the rules.
'''),
    ("SECURITY\n- Card details are entered", FACTS_NEW + "SECURITY\n- Card details are entered"),
    # pages
    ('''- /messages — conversations with buyers, sellers and artisans
''',
     '''- /messages — conversations with buyers, sellers and artisans
- /jobs — Jobs home; /jobs/search to find jobs; /jobs/applications to track
  applications; /jobs/saved for saved jobs and alerts; /jobs/profile for your CV
- /jobs/employer — employer dashboard; /jobs/employer/post to post a job;
  /jobs/employer/plans for plans, pay-per-job and boosts
- /deliveries/new — send a package; /deliveries — my deliveries and tracking
- Riders: "Ride & Earn" in the OAM mobile app (apply, go online, earnings)
'''),
    # fallback answers
    ('''GREETING = (''',
     '''FAQS += [
    {
        "keywords": ["send package", "send a package", "delivery", "dispatch", "courier",
                     "parcel", "send parcel", "rider fee", "delivery fee", "delivery cost"],
        "answer": (
            "OAM Dispatch delivers documents, parcels, food and more across town the same day.\\n\\n"
            "Go to Send a Package (/deliveries/new), set pickup and drop-off on the map, add the "
            "recipient and package details, and you'll see the full price before you pay. Pay "
            "from your wallet, by card, on delivery, or in cash at pickup.\\n\\n"
            "A nearby verified rider is matched automatically and you can follow them live on the "
            "map. Share the 4-digit delivery code with the recipient — the rider needs it at the door."
        ),
    },
    {
        "keywords": ["track", "where is my package", "where is my delivery", "rider location",
                     "package status", "delivery status"],
        "answer": (
            "Open My deliveries (/deliveries) and tap the delivery to see the rider on the map and "
            "every status update: Finding a rider, Accepted, Picked up, On the way, Delivered.\\n\\n"
            "If something looks wrong with a specific delivery, email info@oam-app.com with the "
            "delivery reference (it starts with DLV-) and a person will look into it."
        ),
    },
    {
        "keywords": ["cancel", "cancel delivery", "cancel my delivery", "delivery refund", "cancel package",
                     "no rider"],
        "answer": (
            "You can cancel a delivery free of charge until the rider picks the package up — open it "
            "in My deliveries (/deliveries) and tap Cancel. Wallet and card payments go back to your "
            "OAM wallet in full.\\n\\n"
            "If no rider accepts within 90 minutes, the delivery is cancelled and refunded "
            "automatically. Once the package has been picked up it can't be cancelled in the app; "
            "email info@oam-app.com with the reference."
        ),
    },
    {
        "keywords": ["pay on delivery", "on delivery", "cash on delivery", "pay at the door", "cash at pickup",
                     "pay rider cash"],
        "answer": (
            "Two ways to pay later:\\n\\n"
            "• Pay on delivery — at the door the rider shows a secure payment link (card or bank), "
            "or you can pay cash. The package is handed over once it's paid.\\n"
            "• Cash at pickup — pay the rider in cash when they collect the package.\\n\\n"
            "You can also pay upfront from your wallet or by card."
        ),
    },
    {
        "keywords": ["rider", "become a rider", "ride and earn", "ride & earn", "dispatch rider",
                     "drive for oam", "earn as rider"],
        "answer": (
            "Open \\"Ride & Earn\\" in the OAM mobile app and apply with your details, vehicle "
            "(bicycle, motorcycle, car or van), documents — government ID, licence, vehicle papers "
            "and a selfie with your ID — and the bank account you want to be paid into. The OAM team "
            "reviews every application.\\n\\n"
            "Once approved, go online to receive nearby requests. You earn 80% of each delivery fee, "
            "sent automatically to your bank account after each completed delivery paid by wallet, "
            "card or payment link."
        ),
    },
    {
        "keywords": ["commission", "rider", "my commission", "rider commission", "cash commission", "owe oam", "pay commission",
                     "oam bank account", "rider payout", "rider earnings"],
        "answer": (
            "Riders earn 80% of the delivery fee and OAM keeps 20%.\\n\\n"
            "For deliveries paid by wallet, card or payment link, your 80% is sent to your bank "
            "account automatically. For cash deliveries you keep the cash and owe OAM's 20%: pay it "
            "from your wallet in the app, or by bank transfer to the OAM account shown on your rider "
            "dashboard. If too much commission is unpaid, new cash jobs pause until it's cleared.\\n\\n"
            "Your Earnings screen shows payouts and anything owed."
        ),
    },
    {
        "keywords": ["job", "jobs", "find a job", "find work", "vacancy", "vacancies", "apply",
                     "application", "cv", "resume", "career"],
        "answer": (
            "OAM Jobs is free for job seekers. Set up your profile and CV at /jobs/profile, then "
            "search at /jobs/search — filter by remote, hybrid or on-site, job type, experience, "
            "category, salary and country.\\n\\n"
            "Apply in one click or with a full application, and follow each one in My applications "
            "(/jobs/applications): Applied, Under review, Shortlisted, Interview, Offer, then Hired "
            "or Rejected. Save searches to get alerts instantly, daily or weekly.\\n\\n"
            "A real employer never asks you to pay to apply. If one does, don't pay — report it."
        ),
    },
    {
        "keywords": ["post a job", "hire", "hiring", "employer", "recruit", "job plan", "jobs plan",
                     "job boost", "boost job", "candidate"],
        "answer": (
            "Employers start at /jobs/employer: create a company page, post jobs and manage "
            "applicants on a pipeline board.\\n\\n"
            "• Free — 1 active job (30 days), up to 50 applications\\n"
            "• Premium — ₦15,000/month: 10 jobs, 2 featured, 50 candidate profile views a month\\n"
            "• Pro — ₦40,000/month: unlimited jobs, 10 featured, unlimited candidate views and "
            "messaging candidates who haven't applied\\n\\n"
            "Or pay ₦5,000 for a single extra job, and boost a job for ₦3,000 (7 days) or ₦9,000 "
            "(30 days). Plans don't renew automatically. Details at /jobs/employer/plans."
        ),
    },
    {
        "keywords": ["video", "upload", "a video", "upload video", "listing video", "work video", "zoom", "photo zoom"],
        "answer": (
            "Sellers can add a video of up to 2 minutes to a listing, alongside up to 5 photos. "
            "Buyers watch it on the listing, and can tap any photo to open it full screen and "
            "pinch or double-tap to zoom.\\n\\n"
            "Artisans can add videos of previous work (10 seconds to 3 minutes) under \\"Videos of my "
            "work\\" in the Artisans section; they appear on their public profile."
        ),
    },
]

GREETING = ('''),
    ('''an artisan, travel, bus tickets and more. What would you like to know?"''',
     '''an artisan, jobs, sending a package, travel, bus tickets and more. What would you like to know?"'''),
])

# "where is my package / my application" should get the account answer if no FAQ fits.
patch("apps/assistant/service.py", "delivery|package|application", [
    ('''    r"account|purchase|withdraw)\\b",''',
     '''    r"account|purchase|withdraw|delivery|package|application)\\b",'''),
])

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nCommit and push; Render redeploys. No migration needed.")
