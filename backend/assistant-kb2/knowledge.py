"""
What the assistant knows about OAM.

This is the single source of truth for both modes — it's injected into the LLM
prompt when an API key is configured, and searched directly when one isn't. One
copy means the two modes can't tell people different things.

Everything here is true of the platform as built. That matters more than it
might seem: an assistant on a money app that invents a refund policy or a
delivery time creates an expectation the product then fails, and the customer
is rightly annoyed at you rather than at the bot.
"""

PLATFORM_FACTS = """
OAM is a multi-service platform operated by O.A.M Motors Limited. It offers:

BILLS AND UTILITIES
- Airtime and data top-ups for all major Nigerian networks (MTN, Airtel, Glo, 9mobile)
- International airtime: top up phones in other countries. In the airtime screen,
  switch from "Local" to "International", pick the country and network, choose an
  amount, and pay. The price is shown in Naira before you confirm.
- Electricity units (prepaid tokens and postpaid) across Nigerian discos
  (e.g. IKEDC, EKEDC, IBEDC, AEDC and others)
- Cable TV subscriptions (DStv, GOtv, StarTimes and others)
- The price shown is the price paid. There is NO separate fee at checkout; OAM's
  margin is included in the price.

WALLET
- Multi-currency (NGN, USD, GBP, EUR), with NGN as the default
- Funded by card through Paystack
- Card payments credit the wallet first, and the wallet then pays for the
  purchase. This is deliberate: if a delivery fails, the money is already safe
  in the wallet as a balance the customer can spend or withdraw.
- Transfers between OAM users are instant and free
- Withdrawals go to a bank account in the customer's own name
- The wallet can also be funded by bank transfer and by a dedicated virtual account,
  in addition to card

BETTING WALLET TOP-UP
- Fund sports betting accounts instantly across top betting providers in Nigeria

BUS TICKETS
- Search and book intercity bus tickets for travel across Nigeria: choose route and
  date, pick your seats, enter passenger details, and pay from wallet or by card

E-COMMERCE
- Shop from top international partner stores (such as Amazon, Temu and Alibaba)
  through the OAM interface

ELECTRICITY TOKENS
- Tokens usually arrive within a minute or two, occasionally longer
- While an order says "processing", the payment has gone through and the order
  is with the provider. Buying again charges for the same meter twice.
- Order history checks with the provider every few seconds and shows the token
  as soon as it is issued
- The token is also emailed, and stored permanently in Order history
- Nigerian prepaid meters are 11 digits; verification only runs once all 11 are
  entered

MARKETPLACE
- Buy and sell items. Free plan allows 3 active listings.
- Premium is 2,500 NGN for 20 listings plus featured placement
- Pro is 5,000 NGN for unlimited listings plus featured placement and priority
- These are one-off payments for a period; nothing renews automatically
- Phone numbers are NEVER published. Buyers and sellers use built-in, in-app
  messaging to negotiate and communicate securely; contact details are exchanged
  only when the seller accepts the enquiry.
- Sellers can add up to 5 photos and a short video (up to 2 minutes). Buyers can
  watch the video on the listing, and tap a photo to view it full screen and
  pinch or double-tap to zoom.

HOME SERVICES / ARTISANS
- Find plumbers, electricians, mechanics, cleaners and other trades
- Artisans can be verified: they submit photos of their work, a short video and
  an identity document, which a person on the OAM team reviews before granting
  the badge
- Only verified artisans appear in Featured on the home page
- Artisans can boost visibility: Premium 2,500 NGN for 30 days, Pro 5,000 NGN
  for 90 days. One-off payments, no auto-renewal.
- Contact details work the same as the marketplace: shared only after the
  artisan accepts the job
- Artisans can upload videos of previous work (10 seconds to 3 minutes each,
  up to 12) under "Videos of my work"; customers watch them on the artisan's
  profile. OAM can remove a video that breaks the rules.

O.A.M MOTORS
- Vehicles sold directly by O.A.M Motors, listed in the marketplace under the
  O.A.M Motors category

TRAVEL (FLIGHTS, HOTELS, CAR HIRE)
- Flights: compare and book domestic and international flights from hundreds of airlines
- Hotels: search and book stays in over 100 countries with instant confirmation
- Car hire: rent cars with or without a driver at thousands of locations worldwide
- Airport pickups are also available. Travel is booked through partner sites, so the
  booking contract is with the partner, not with OAM.

JOBS & RECRUITMENT (OAM Jobs — find work / hire)
Where: "Jobs" on the dashboard (web: /jobs; mobile app: the Jobs tile). It works
in every language the app supports.
For job seekers (always free):
- Build a profile and CV at /jobs/profile: headline, summary, skills (they drive
  your match score), experience, education, the kind of work you want, and an
  uploaded CV file (PDF or Word, up to 10 MB). A more complete profile gets better
  matches and enables 1-tap / 1-click apply.
- "Open to work" and "Let employers find my profile" control whether employers
  with Premium or Pro can find you in the candidate database. Switch them off and
  you can still apply to jobs as normal.
- Search at /jobs/search by keyword (title, skill or company) and filter by work
  setting (remote, hybrid, on-site), job type (full-time, part-time, contract,
  temporary, internship, freelance), experience level (entry, mid, senior, lead /
  manager, executive), category, city/location, minimum pay and how recently it
  was posted. Sort by most relevant, newest or highest pay. Jobs show a match
  score (great / good / fair / low match) based on your skills.
- Apply: most jobs are "Apply on OAM" — send your OAM CV in one tap, optionally
  with a cover note and answers to the employer's screening questions (up to 10).
  Some employers use "Apply on company site", which opens their own website; OAM
  can't track those applications.
- Track every OAM application in My applications (/jobs/applications), live.
  Statuses: Applied, Under review, Shortlisted, Interview, Offer, Hired,
  Rejected, Withdrawn. You can withdraw any time up to the Offer stage (not after
  you're hired); the employer sees that you withdrew. OAM doesn't decide who is
  hired and can't speed up an employer's decision.
- Save jobs (bookmark) and save searches as job alerts — instantly, daily or
  weekly, in the app and optionally by email (/jobs/saved).
- Message employers privately in Job messages (files up to 15 MB can be
  attached). Job posts also have public comments, likes and sharing — don't put
  personal details in a public comment.
- Safety: a genuine employer never charges you to apply, for training, for a
  "registration fee" or for a uniform. Listings are screened automatically and
  anything asking candidates for money is removed; suspicious listings are held
  for review. Use "Report this listing" (scam, asking for money, misleading or
  duplicate) and never pay anyone to get a job.
For employers (/jobs/employer):
- Set up a company page (name, logo, cover, website, size, industry, about).
  Get the "Verified employer" badge by uploading your CAC certificate (or the
  equivalent business registration) under Verify company; documents are usually
  reviewed within 2 working days. Verified employers get more applicants and
  their listings skip manual review.
- Post a job in about three minutes with the step-by-step form: title,
  description (at least 50 characters), location and pay, skills (3–8 recommended
  for matching), screening questions (optional, up to 10), and how to apply (on
  OAM — recommended, with the pipeline board, matching and chat — or on your own
  website). Showing the salary gets more applicants.
- Manage applicants on the pipeline board (Applied → Under review → Shortlisted
  → Interview → Offer → Hired, or Rejected), rate them and keep private notes,
  and chat with them in the app.
- Plans (paid through Flutterwave — card, bank transfer or USSD; each plan lasts
  one month and does NOT renew automatically — you get a reminder 3 days before
  it ends and renew only if you want to):
  - Free: 1 active job, live for 30 days; you can see the first 50 applicants per
    job (more can still apply — they're unlocked when you upgrade)
  - Premium: 15,000 NGN (or $15 / £12 / €14) a month — 10 active jobs, live 45
    days, 2 featured jobs, every applicant, search the candidate database (50
    profile views a month), recruitment analytics and smart candidate matching
  - Pro: 40,000 NGN (or $39 / £32 / €36) a month — unlimited active jobs, live 60
    days, 10 featured jobs, unlimited candidate profile views, analytics and
    matching, and messaging any candidate, including ones who haven't applied
- Pay per job (no subscription): 5,000 NGN ($5 / £4 / €5) per job credit; each
  credit publishes one extra job, live for at least 30 days.
- Boost a job to the top of search: 3,000 NGN for 7 days or 9,000 NGN for 30 days
  ($3/$9, £3/£7, €3/€8).
- Listings expire at the end of their period; expired listings can be renewed
  and live ones extended. Jobs can be paused, closed or edited.
- Never charge applicants: listings that ask candidates for money are removed.
- Employer pages: /jobs/employer (dashboard), /jobs/employer/post (post a job),
  /jobs/employer/plans (plans, job credits, boosts, payment history).

DELIVERY & DISPATCH (OAM Dispatch — Send a Package)
Where: "Send Package" on the dashboard (web: /deliveries/new; mobile app: the
Send Package tile). My deliveries: /deliveries.
For customers:
- Send documents, small or medium parcels, large items, food or fragile items
  across town, the same day. Set pickup and drop-off on the map, add the
  recipient's name and phone, the package type and weight, and any notes for the
  rider. Up to 200 kg and 150 km per delivery.
- You see the full price before you pay. It's worked out from the distance, the
  weight, the package type and the area, and can be higher at very busy times.
  The price you confirm is the price you pay; if it changes before you confirm,
  you're shown the new price to accept first.
- Ways to pay: OAM Wallet; card or bank (Flutterwave checkout); Pay on delivery
  (at the door the rider shows a secure payment link, or you pay cash — the
  package is handed over once paid); or Cash at pickup (pay the rider in cash
  when they collect). A card checkout that's never completed is cancelled after
  2 hours, and nothing is charged.
- The nearest verified, online rider with a suitable vehicle (bicycle,
  motorcycle, car or van) is matched automatically. Track the rider live on the
  map with status updates: Finding a rider, Accepted (rider on the way to
  pickup), Picked up, On the way, Delivered. Every delivery has a reference that
  starts with DLV-.
- Your delivery has a 4-digit delivery code. Share it with the recipient; the
  rider enters it at the door to confirm hand-over (or takes a photo as proof).
  Don't share the code before the rider arrives.
- You can cancel free of charge until the rider picks the package up. Wallet and
  card payments come back to your OAM wallet in full. If no rider accepts within
  90 minutes, the delivery is cancelled and refunded automatically. After
  pick-up it can't be cancelled in the app — contact info@oam-app.com with the
  DLV- reference.
- Rate your rider (1–5 stars) after delivery.
- Lost, damaged or wrongly delivered packages, or a rider problem: email
  info@oam-app.com with the DLV- reference; a person investigates. Don't promise
  compensation amounts — the support team decides case by case.
For riders ("Ride & Earn" in the OAM mobile app only):
- Apply with your details, city, vehicle (bicycle, motorcycle, car or van) and
  plate number, documents (government ID, rider's/driver's licence, vehicle
  papers, a selfie holding your ID) and the bank account your earnings are paid
  into. A person on the OAM team reviews every application; you can't take jobs
  until you're approved.
- Go online to receive nearby delivery requests (each offer is open for a short
  time) and accept the ones you want. Keep location on while online.
- Riders earn 80% of the delivery fee; OAM keeps 20%. For wallet, card and
  pay-on-delivery link payments, the rider's 80% goes to their OAM wallet and is
  then sent automatically to their bank account after each completed delivery,
  with no transfer fee. If a bank transfer fails, the money stays safely in the
  rider's OAM wallet.
- For cash deliveries the rider keeps the cash and owes OAM's 20% commission.
  Pay it from your OAM wallet in the app, or by bank transfer to OAM's account
  shown on the rider dashboard. Riders with too much unpaid commission don't get
  new cash jobs until it's paid.
- Earnings, payouts and commission owed are shown under Earnings.

SECURITY
- Card details are entered on Paystack's checkout and are never seen or stored
  by OAM
- Passwords are stored hashed
- Resetting a password signs the account out on every other device
- OAM will NEVER ask for a password, card PIN or one-time code. Anyone who does
  is not from OAM.

SUPPORT
- info@oam-app.com
- Help Centre at /help, Contact at /contact
"""

# Bus tickets are "coming soon" until BUS_TICKETS_LIVE is switched on.
_BUS_LIVE_TEXT = """BUS TICKETS
- Search and book intercity bus tickets for travel across Nigeria: choose route and
  date, pick your seats, enter passenger details, and pay from wallet or by card
"""
_BUS_SOON_TEXT = """BUS TICKETS (COMING SOON)
- Intercity bus ticket booking is coming soon and can't be used yet. If asked,
  say it's launching soon and suggest flights or car hire in the meantime. Don't
  promise a launch date.
"""


def bus_facts() -> str:
    from django.conf import settings
    return _BUS_LIVE_TEXT if getattr(settings, "BUS_TICKETS_LIVE", False) else _BUS_SOON_TEXT


PLATFORM_FACTS = PLATFORM_FACTS.replace(_BUS_LIVE_TEXT, bus_facts())

WHERE_TO_GO = """
Useful pages:
- /dashboard — balance and quick actions
- /wallet — full balance, transactions, add money
- /wallet/send — transfer to another OAM user
- /wallet/withdraw — withdraw to a bank account
- /orders — every purchase, with electricity tokens and receipts
- /services/airtime, /services/data, /services/electricity, /services/cable
- /marketplace — buy and sell
- /artisans — find or offer home services
- /messages — conversations with buyers, sellers and artisans
- /jobs — Jobs home; /jobs/search to find jobs; /jobs/applications to track
  applications; /jobs/saved for saved jobs and alerts; /jobs/profile for your CV;
  /jobs/messages for job chats
- /jobs/employer — employer dashboard; /jobs/employer/post to post a job;
  /jobs/employer/plans for plans, pay-per-job credits and boosts
- /deliveries/new — send a package; /deliveries — my deliveries and tracking
- Riders: "Ride & Earn" in the OAM mobile app (apply, go online, earnings)
- In the mobile app the same features are on the home screen tiles (Jobs, Send
  Package) — paths above are for the website
- /help — Help Centre
- /contact — how to reach a person
"""

# Matched by the fallback when no LLM is configured. Keyword lists are
# deliberately generous: someone with a missing token types "where is my token",
# "no token", "token never came" and expects the same answer.
FAQS = [
    {
        "keywords": ["token", "electricity", "units", "meter", "prepaid", "no token", "missing token"],
        "answer": (
            "If you've paid for electricity and the token hasn't appeared yet, please don't "
            "buy again — the payment has gone through and the order is with your provider, "
            "so a second purchase would charge you twice for the same meter.\n\n"
            "Open Order history (/orders). While an order is completing you'll see "
            "\"Token on the way\", and the page checks with your provider every few seconds. "
            "Tokens usually arrive within a minute or two.\n\n"
            "The token is also emailed to you, and it stays in Order history permanently, so "
            "you can find it again any time."
        ),
    },
    {
        "keywords": ["fee", "fees", "charge", "hidden", "extra cost", "commission"],
        "answer": (
            "There are no hidden fees. The total shown before you pay is exactly what you "
            "pay — the fee line reads ₦0 because there isn't one.\n\n"
            "OAM's margin is built into the price of bills, so nothing is added at checkout."
        ),
    },
    {
        "keywords": ["wallet", "why wallet", "card payment", "balance", "funded", "top up"],
        "answer": (
            "Card payments credit your wallet first, and the wallet then pays for what you "
            "bought. It looks like an extra step, and it's deliberate.\n\n"
            "If a delivery fails, the money is already sitting safely in your wallet as a "
            "balance you can spend or withdraw. Paying a provider directly would leave your "
            "money stranded with no clean way back."
        ),
    },
    {
        "keywords": ["phone number", "contact", "seller number", "artisan number", "whatsapp"],
        "answer": (
            "Phone numbers are never published on OAM.\n\n"
            "Send a message about the item or job, and once the seller or artisan accepts, "
            "you'll both see each other's contact details.\n\n"
            "It's slightly slower, and it's the most effective protection available: published "
            "numbers get harvested and reused for impersonation scams."
        ),
    },
    {
        "id": "market_plans", "topic": "marketplace",
        "keywords": ["listing", "sell", "how many", "plan", "premium", "pro", "subscription"],
        "answer": (
            "The Free plan allows 3 active listings, indefinitely, with no card required.\n\n"
            "Premium (₦2,500) allows up to 20 listings plus featured placement. "
            "Pro (₦5,000) is unlimited, with featured placement and priority in search.\n\n"
            "Both are one-off payments for a period — nothing renews automatically."
        ),
    },
    {
        "id": "artisan_verify", "topic": "artisans",
        "keywords": ["verified", "verification", "badge", "artisan verify", "get verified"],
        "answer": (
            "Verified artisans have submitted photos of their work, a short video and an "
            "identity document, and a person on the OAM team has reviewed all three before "
            "granting the badge.\n\n"
            "Only verified artisans appear in Featured on the home page. If you're an artisan, "
            "start at /artisans/verify — your profile stays live in search while you wait."
        ),
    },
    {
        "keywords": ["withdraw", "withdrawal", "bank", "cash out", "payout"],
        "answer": (
            "Withdrawals go to a bank account in your own name, from /wallet/withdraw.\n\n"
            "They usually arrive within minutes, though bank downtime can delay them. If a "
            "withdrawal fails, the amount returns to your wallet automatically — it isn't "
            "lost, and you can try again."
        ),
    },
    {
        "keywords": ["transfer", "send money", "another user", "p2p"],
        "answer": (
            "You can send money to another OAM user instantly and free from /wallet/send.\n\n"
            "Enter their email or phone number and their name appears before you confirm. "
            "Check that name carefully — completed transfers can't be reversed."
        ),
    },
    {
        "keywords": ["password", "reset", "forgot", "locked out", "can't sign in"],
        "answer": (
            "Use \"Forgot password?\" on the sign-in page. We'll send a code to the email or "
            "phone on your account, and you can set a new password with it.\n\n"
            "Resetting signs you out on every other device — so if someone else had access to "
            "your account, that removes it."
        ),
    },
    {
        "keywords": ["safe", "scam", "fraud", "trust", "security", "safety"],
        "answer": (
            "A few things worth knowing:\n\n"
            "• OAM will never ask for your password, card PIN or a one-time code. Anyone who "
            "does — by call, SMS or WhatsApp — is not from OAM.\n"
            "• Card details are entered on Paystack's own checkout and are never stored by OAM.\n"
            "• When buying or selling, meet in a public place, inspect before paying, and never "
            "send money in advance to someone you haven't met.\n"
            "• Treat any request to move the conversation off OAM \"for a better price\" as a "
            "warning sign."
        ),
    },
]

# --------------------------------------------------------------------------- #
# Jobs & recruitment, Delivery & dispatch.
# "topic" lets the fallback prefer the right area when a question mentions it
# ("how much is Premium for jobs" must not get the marketplace plans answer).
# --------------------------------------------------------------------------- #
FAQS += [
    # ---------------- Jobs: job seekers ----------------
    {
        "id": "jobs_find", "topic": "jobs",
        "keywords": ["find a job", "find work", "looking for a job", "looking for work", "job search",
                     "search jobs", "search for jobs", "vacancy", "vacancies", "career", "openings", "get a job", "need a job",
                     "oam jobs", "jobs"],
        "answer": (
            "OAM Jobs is free for job seekers. Set up your profile and CV at /jobs/profile, then "
            "search at /jobs/search — filter by remote, hybrid or on-site, job type, experience "
            "level, category, location, minimum pay and how recently it was posted. Each job shows "
            "how well it matches your skills.\n\n"
            "Apply in one tap with your OAM CV and follow every application live in My applications "
            "(/jobs/applications). In the mobile app it's the Jobs tile on the home screen.\n\n"
            "A real employer never asks you to pay to apply. If one does, don't pay — report it."
        ),
    },
    {
        "id": "jobs_apply", "topic": "jobs",
        "keywords": ["how to apply", "how do i apply", "how can i apply", "apply for", "apply", "cover note",
                     "cover letter", "screening question", "one tap", "1-tap", "1-click", "one click",
                     "company site", "company website", "external"],
        "answer": (
            "Open the job and tap Apply now. Most jobs use \"Apply on OAM\": your OAM CV is sent in "
            "one tap, and you can add a short cover note and answer the employer's screening "
            "questions if there are any.\n\n"
            "Some employers use \"Apply on company site\" instead — that opens their own website, so "
            "the application isn't tracked on OAM.\n\n"
            "Tip: a complete profile with your skills (/jobs/profile) gets better matches and makes "
            "1-tap apply possible."
        ),
    },
    {
        "id": "jobs_status", "topic": "jobs",
        "keywords": ["application status", "status of my application", "under review", "shortlisted",
                     "interview", "offer", "rejected", "hired", "heard back", "no response", "no reply",
                     "track my application", "track application", "what does", "mean"],
        "answer": (
            "Every OAM application is in My applications (/jobs/applications) and updates live:\n\n"
            "• Applied — sent to the employer\n"
            "• Under review — the employer is looking at it\n"
            "• Shortlisted — you're on their shortlist\n"
            "• Interview — they want to interview you (check Job messages for details)\n"
            "• Offer — they've made you an offer\n"
            "• Hired, Rejected or Withdrawn — the final outcome\n\n"
            "The employer decides who moves forward and when — OAM can't see or speed up their "
            "decision. You can message them from the application if you have a question."
        ),
    },
    {
        "id": "jobs_withdraw", "topic": "jobs",
        "keywords": ["withdraw application", "withdraw my application", "cancel application",
                     "cancel my application", "take back", "remove application", "withdraw", "cancel"],
        "answer": (
            "Open the application in My applications (/jobs/applications) and tap Withdraw. You can "
            "withdraw at any stage up to an offer — not once you've been hired. The employer will "
            "see that you withdrew, and it can't be undone, but you can apply to other jobs freely."
        ),
    },
    {
        "id": "jobs_profile", "topic": "jobs",
        "keywords": ["cv", "resume", "upload cv", "my profile", "job profile", "match score", "skills",
                     "open to work", "employers find", "find my profile", "hide my profile", "visible",
                     "visibility", "complete"],
        "answer": (
            "Your job profile lives at /jobs/profile: headline, summary, skills, experience, education, "
            "what you're looking for, and a CV file (PDF or Word, up to 10 MB). Add at least 3 skills — "
            "they drive your match score.\n\n"
            "\"Open to work\" and \"Let employers find my profile\" decide whether employers on Premium "
            "or Pro can find you in the candidate database. Switch them off to stay hidden — you can "
            "still apply to jobs as normal."
        ),
    },
    {
        "id": "jobs_alerts", "topic": "jobs",
        "keywords": ["job alert", "alerts", "alert", "notify me", "notification", "saved search",
                     "save search", "saved jobs", "save a job", "bookmark", "email me", "daily", "weekly"],
        "answer": (
            "Run a search at /jobs/search and tap \"Get alerts\" — choose instantly, daily or weekly, "
            "and tick \"Also email me\" if you want them by email too. To keep a single job, tap its "
            "bookmark.\n\n"
            "Saved jobs and all your alerts (to change or delete them) are at /jobs/saved."
        ),
    },
    {
        "id": "jobs_scam", "topic": "jobs",
        "keywords": ["scam", "fake job", "fake", "pay to apply", "registration fee", "asking for money",
                     "asked me to pay", "asked for money", "report", "report job", "report listing",
                     "fraud", "legit", "genuine", "suspicious"],
        "answer": (
            "Never pay anyone to get a job. A genuine employer doesn't charge application, "
            "registration, training or uniform fees.\n\n"
            "OAM screens listings automatically and removes anything asking candidates for money; "
            "suspicious ones are held for review. If something feels wrong, open the job, tap "
            "\"Report this listing\", choose the reason and tell us what happened — our team reviews "
            "every report. Keep the conversation on OAM rather than moving to WhatsApp."
        ),
    },
    {
        "id": "jobs_messages", "topic": "jobs",
        "keywords": ["message employer", "chat with employer", "contact employer", "contact the employer",
                     "message candidate", "chat with candidate", "contact candidate", "job messages",
                     "job chat", "message the employer", "message", "chat", "talk to"],
        "answer": (
            "Job conversations are in Job messages (/jobs/messages). Job seekers can message the "
            "employer from a job or an application; employers can chat with any applicant from the "
            "pipeline. Files up to 15 MB (such as a CV) can be attached.\n\n"
            "On Pro, employers can also message candidates who haven't applied."
        ),
    },
    # ---------------- Jobs: employers ----------------
    {
        "id": "jobs_employer", "topic": "jobs",
        "keywords": ["post a job", "post job", "posting a job", "advertise a job", "hire", "hiring",
                     "employer", "recruit", "recruiting", "company page", "pipeline", "applicants",
                     "staff", "workers"],
        "answer": (
            "Employers start at /jobs/employer: set up your company page, then post a job — it takes "
            "about three minutes with the step-by-step form (title, description, location and pay, "
            "skills, optional screening questions, and how people should apply).\n\n"
            "Applicants land on your pipeline board (Applied → Under review → Shortlisted → Interview → "
            "Offer → Hired), where you can rate them, keep private notes and chat with them.\n\n"
            "The Free plan includes 1 active job. Plans, job credits and boosts are at "
            "/jobs/employer/plans."
        ),
    },
    {
        "id": "jobs_plans", "topic": "jobs",
        "keywords": ["job plan", "jobs plan", "employer plan", "plan", "plans", "premium", "pro", "free plan",
                     "price", "pricing", "cost", "how much", "subscription", "upgrade"],
        "answer": (
            "Employer plans (monthly, paid through Flutterwave by card, bank transfer or USSD):\n\n"
            "• Free — 1 active job (live 30 days); you see the first 50 applicants per job\n"
            "• Premium — ₦15,000/month: 10 active jobs (live 45 days), 2 featured, every applicant, "
            "50 candidate profile views a month, analytics and smart matching\n"
            "• Pro — ₦40,000/month: unlimited jobs (live 60 days), 10 featured, unlimited candidate "
            "views, and messaging candidates who haven't applied\n\n"
            "Plans never renew automatically — you get a reminder 3 days before the end. Compare "
            "them at /jobs/employer/plans. (Prices are also available in USD, GBP and EUR.)"
        ),
    },
    {
        "id": "jobs_credits", "topic": "jobs",
        "keywords": ["pay per job", "job credit", "credit", "credits", "one job", "single job", "extra job",
                     "boost", "featured", "feature my job", "top of search", "promote"],
        "answer": (
            "Hiring only occasionally? Buy a job credit for ₦5,000 — each credit publishes one extra "
            "job, live for at least 30 days, with no subscription.\n\n"
            "To get more applicants, boost a job to the top of search: ₦3,000 for 7 days or ₦9,000 "
            "for 30 days. Premium and Pro also include featured slots (2 and 10).\n\n"
            "All of these are at /jobs/employer/plans."
        ),
    },
    {
        "id": "jobs_verify", "topic": "jobs",
        "keywords": ["verify company", "verified employer", "company verification", "cac", "verify my company",
                     "employer badge", "verification", "verified", "badge"],
        "answer": (
            "Employers get the \"Verified employer\" badge by uploading their CAC certificate (or the "
            "equivalent business registration) under Verify company in the employer dashboard. "
            "Documents are usually reviewed within 2 working days.\n\n"
            "Verified employers get more applicants and their listings skip manual review."
        ),
    },
    {
        "id": "jobs_candidates", "topic": "jobs",
        "keywords": ["candidate search", "candidate database", "search candidates", "find candidates",
                     "profile views", "smart matching", "recommended candidates", "headhunt", "candidates"],
        "answer": (
            "Premium and Pro employers can search open-to-work candidates by skill, level and city "
            "and view their CVs — Premium includes 50 profile views a month, Pro is unlimited and "
            "can message candidates who haven't applied.\n\n"
            "Both plans also show smart matches: the candidates whose skills best fit each job. "
            "Free shows the first 50 applicants per job; upgrade to unlock the rest."
        ),
    },
    {
        "id": "jobs_renew", "topic": "jobs",
        "keywords": ["renew", "renew automatically", "automatically", "auto renew", "auto-renew", "expired", "expire", "extend", "cancel subscription",
                     "cancel my plan", "close job", "pause"],
        "answer": (
            "Nothing renews automatically. Plans last a month and you get a reminder 3 days before "
            "the end; renew from /jobs/employer/plans only if you want to — there's nothing to cancel.\n\n"
            "Each listing stays live for its plan's period (30, 45 or 60 days). Expired listings can be "
            "renewed and live ones extended, paused or closed from the job's actions menu."
        ),
    },
    # ---------------- Delivery: customers ----------------
    {
        "id": "dlv_send", "topic": "delivery",
        "keywords": ["send package", "send a package", "send parcel", "send a parcel", "delivery",
                     "dispatch", "courier", "parcel", "package", "logistics", "deliver"],
        "answer": (
            "OAM Dispatch delivers documents, parcels, food and more across town the same day.\n\n"
            "Go to Send a Package (/deliveries/new, or the Send Package tile in the app), set pickup "
            "and drop-off on the map, add the recipient and package details, and you'll see the full "
            "price before you pay. Pay from your wallet, by card, on delivery, or in cash at pickup.\n\n"
            "A nearby verified rider is matched automatically and you can follow them live on the "
            "map. Share the 4-digit delivery code with the recipient — the rider needs it at the door."
        ),
    },
    {
        "id": "dlv_price", "topic": "delivery",
        "keywords": ["how much", "price", "cost", "fare", "delivery fee", "rider fee", "delivery cost",
                     "expensive", "surge", "calculated", "charge"],
        "answer": (
            "You see the exact price before you pay. It's worked out from the distance, the weight, "
            "the package type (fragile or large items cost a little more) and the area, and it can be "
            "higher at very busy times.\n\n"
            "The price you confirm is the price you pay — no extra fees. If it changes before you "
            "confirm, you're shown the new price to accept first. Get a quote any time at "
            "/deliveries/new."
        ),
    },
    {
        "id": "dlv_track", "topic": "delivery",
        "keywords": ["track", "tracking", "where is my package", "where is my delivery", "rider location",
                     "package status", "delivery status", "eta", "how long"],
        "answer": (
            "Open My deliveries (/deliveries) and tap the delivery to see the rider on the map and "
            "every status update: Finding a rider, Accepted, Picked up, On the way, Delivered.\n\n"
            "If something looks wrong with a specific delivery, email info@oam-app.com with the "
            "delivery reference (it starts with DLV-) and a person will look into it."
        ),
    },
    {
        "id": "dlv_cancel", "topic": "delivery",
        "keywords": ["cancel", "cancel delivery", "cancel my delivery", "delivery refund", "cancel package",
                     "refund"],
        "answer": (
            "You can cancel a delivery free of charge until the rider picks the package up — open it "
            "in My deliveries (/deliveries) and tap Cancel. Wallet and card payments go back to your "
            "OAM wallet in full.\n\n"
            "If no rider accepts within 90 minutes, the delivery is cancelled and refunded "
            "automatically. Once the package has been picked up it can't be cancelled in the app; "
            "email info@oam-app.com with the reference."
        ),
    },
    {
        "id": "dlv_no_rider", "topic": "delivery",
        "keywords": ["no rider", "nobody accepted", "no one accepted", "finding a rider", "still searching",
                     "waiting for rider", "rider not found"],
        "answer": (
            "\"Finding a rider\" means OAM is offering your delivery to the nearest online riders, "
            "widening the search area as it goes. It's usually quick, but can take longer late at "
            "night or in quieter areas.\n\n"
            "You can cancel free of charge while it's searching. If no rider accepts within 90 "
            "minutes, it's cancelled and your wallet or card payment is refunded to your OAM wallet "
            "automatically."
        ),
    },
    {
        "id": "dlv_pay_later", "topic": "delivery",
        "keywords": ["pay on delivery", "on delivery", "cash on delivery", "pay at the door", "cash at pickup",
                     "pay rider cash", "pay with cash", "cash", "payment link", "how to pay"],
        "answer": (
            "Two ways to pay later:\n\n"
            "• Pay on delivery — at the door the rider shows a secure payment link (card or bank), "
            "or you can pay cash. The package is handed over once it's paid.\n"
            "• Cash at pickup — pay the rider in cash when they collect the package.\n\n"
            "You can also pay upfront from your wallet or by card."
        ),
    },
    {
        "id": "dlv_code", "topic": "delivery",
        "keywords": ["delivery code", "4-digit", "4 digit", "code", "pin", "recipient code", "proof",
                     "hand over", "handover"],
        "answer": (
            "Every delivery has a 4-digit delivery code, shown on the delivery in My deliveries. Share "
            "it with the person receiving the package; the rider enters it at the door to confirm the "
            "hand-over (or takes a photo as proof).\n\n"
            "Only give the code when the rider has actually arrived with the package."
        ),
    },
    {
        "id": "dlv_limits", "topic": "delivery",
        "keywords": ["what can i send", "can i send", "weight", "maximum", "max", "limit", "heavy", "kg", "how far", "distance",
                     "interstate", "another state", "food", "fragile", "large item", "big item", "van"],
        "answer": (
            "You can send documents, small or medium parcels, large items, food and fragile items, up "
            "to 200 kg and 150 km per delivery. Choose the package type when you book — a rider with "
            "a suitable vehicle (bicycle, motorcycle, car or van) is matched.\n\n"
            "Please don't send anything illegal or dangerous."
        ),
    },
    {
        "id": "dlv_problem", "topic": "delivery",
        "keywords": ["damaged", "broken", "lost", "missing package", "not delivered", "wrong address",
                     "wrong person", "complaint", "complain", "rude", "rider problem", "didn't arrive",
                     "never arrived", "stolen"],
        "answer": (
            "Sorry about that. Please email info@oam-app.com with the delivery reference (it starts "
            "with DLV-), what happened and any photos. A person on the team investigates every case "
            "and will get back to you.\n\n"
            "You can also rate the rider on the delivery once it's finished."
        ),
    },
    # ---------------- Delivery: riders ----------------
    {
        "id": "rider_apply", "topic": "delivery",
        "keywords": ["become a rider", "ride and earn", "ride & earn", "dispatch rider", "drive for oam",
                     "earn as rider", "rider", "join as rider", "requirements", "documents", "apply as"],
        "answer": (
            "Open \"Ride & Earn\" in the OAM mobile app and apply with your details, vehicle "
            "(bicycle, motorcycle, car or van), documents — government ID, licence, vehicle papers "
            "and a selfie with your ID — and the bank account you want to be paid into. The OAM team "
            "reviews every application.\n\n"
            "Once approved, go online to receive nearby requests. You earn 80% of each delivery fee, "
            "sent automatically to your bank account after each completed delivery paid by wallet, "
            "card or payment link."
        ),
    },
    {
        "id": "rider_commission", "topic": "delivery",
        "keywords": ["commission", "my commission", "rider commission", "cash commission", "owe oam",
                     "pay commission", "oam bank account", "rider payout", "rider earnings", "earnings",
                     "when do i get paid", "paid"],
        "answer": (
            "Riders earn 80% of the delivery fee and OAM keeps 20%.\n\n"
            "For deliveries paid by wallet, card or payment link, your 80% is sent to your bank "
            "account automatically. For cash deliveries you keep the cash and owe OAM's 20%: pay it "
            "from your wallet in the app, or by bank transfer to the OAM account shown on your rider "
            "dashboard. If too much commission is unpaid, new cash jobs pause until it's cleared.\n\n"
            "Your Earnings screen shows payouts and anything owed."
        ),
    },
    {
        "id": "rider_jobs", "topic": "delivery",
        "keywords": ["go online", "online", "accept", "requests", "no requests", "not getting",
                     "delivery requests", "offers", "approved"],
        "answer": (
            "Once your rider application is approved, open Ride & Earn and go online — keep your "
            "location on. Nearby delivery requests appear as offers for a short time; accept the ones "
            "you want.\n\n"
            "Not getting requests? Check you're online with location enabled and that your "
            "application shows Approved. Riders with too much unpaid cash commission don't receive "
            "cash jobs until it's paid."
        ),
    },
]

FAQS += [
    {
        "keywords": ["video", "upload", "a video", "upload video", "listing video", "work video", "zoom", "photo zoom"],
        "answer": (
            "Sellers can add a video of up to 2 minutes to a listing, alongside up to 5 photos. "
            "Buyers watch it on the listing, and can tap any photo to open it full screen and "
            "pinch or double-tap to zoom.\n\n"
            "Artisans can add videos of previous work (10 seconds to 3 minutes) under \"Videos of my "
            "work\" in the Artisans section; they appear on their public profile."
        ),
    },
]

GREETING = (
    "Hi, I'm O.A.M Assistant. I can help with anything about OAM — airtime and data, "
    "bills and electricity tokens, your wallet and transfers, the marketplace, finding "
    "an artisan, jobs, sending a package, travel, bus tickets and more. What would you like to know?"
)

CANT_SEE_ACCOUNT = (
    "I can't see your account details, balance or individual transactions — I only know how "
    "OAM works in general.\n\n"
    "For anything specific to your account, Order history (/orders) shows every purchase with "
    "its status and token, and Wallet (/wallet) shows your balance and transactions. If "
    "something looks wrong, email info@oam-app.com with the order reference and a person will "
    "look it up."
)

NO_MATCH = (
    "I'm not certain about that one, and I'd rather not guess.\n\n"
    "For anything I can't cover — or anything specific to your account — please send an email "
    "with the details to info@oam-app.com and a human support representative will assist you."
)
