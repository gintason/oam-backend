"""
One place for what the public site is: its address, the pages it has, and the
words used to describe them. The sitemap, robots.txt and the server-rendered
link previews all read from here, and src/seo/config.ts in the web app mirrors
the same titles — keep them in step when adding a page.
"""
from __future__ import annotations

from django.conf import settings


def site_url() -> str:
    """Public web address, no trailing slash. e.g. https://www.oam-app.com"""
    return getattr(settings, "SEO_SITE_URL", "https://www.oam-app.com").rstrip("/")


def absolute(path: str) -> str:
    if path.startswith("http"):
        return path
    return site_url() + ("" if path.startswith("/") else "/") + path


BRAND = "O.A.M"
LEGAL_NAME = "O.A.M Motors Limited"
OG_IMAGE = "/og-image.png"          # 1200×630, in the web app's public/ folder
LOGO = "/logo-512.png"
SUPPORT_EMAIL = "info@oam-app.com"
SOCIALS = [
    "https://x.com/oamplatform",
    "https://facebook.com/oamplatform",
    "https://instagram.com/oamplatform",
    "https://tiktok.com/@oamplatform",
]

DEFAULT_TITLE = "O.A.M — The Everything App | Pay Bills, Hire Artisans & Shop Online in Nigeria"
DEFAULT_DESCRIPTION = ("Buy airtime and data, pay electricity and DStv bills, hire verified plumbers "
                       "and electricians, book cheap flights and shop the local marketplace — one O.A.M wallet.")

# (path, changefreq, priority, title, description) — public, indexable pages.
STATIC_PAGES: list[tuple[str, str, str, str, str]] = [
    ("/", "daily", "1.0", DEFAULT_TITLE, DEFAULT_DESCRIPTION),
    ("/marketplace", "hourly", "0.9", "Marketplace — Buy & Sell Phones, Cars, Fashion in Nigeria | O.A.M",
     "Browse items for sale near you on the O.A.M marketplace: phones, cars, electronics, fashion and more. "
     "Chat with sellers safely in the app — no numbers published."),
    ("/artisans", "daily", "0.9", "Hire Verified Artisans — Plumbers, Electricians, Mechanics | O.A.M",
     "Find and hire verified plumbers, electricians, mechanics, cleaners and other artisans near you. "
     "ID-checked professionals with photos and videos of real work."),
    ("/bills", "weekly", "0.9", "Pay Bills Online in Nigeria — Electricity, DStv, Airtime & Data | O.A.M",
     "Pay electricity bills, renew DStv, GOtv and StarTimes, buy airtime and cheap data bundles in seconds. "
     "No hidden fees — the price you see is the price you pay."),
    ("/services/airtime", "weekly", "0.8", "Buy Airtime Online — MTN, Airtel, Glo, 9mobile Top-Up | O.A.M",
     "Recharge MTN, Airtel, Glo and 9mobile airtime instantly, or top up phones abroad with international "
     "airtime. Pay from your O.A.M wallet or by card, no extra fees."),
    ("/services/data", "weekly", "0.8", "Buy Cheap Data Bundles — MTN, Airtel, Glo, 9mobile | O.A.M",
     "Buy cheap data bundles for MTN, Airtel, Glo and 9mobile in seconds. Daily, weekly and monthly plans, "
     "delivered instantly to any number. No hidden charges."),
    ("/services/electricity", "weekly", "0.8", "Pay Electricity Bill Online — Prepaid Tokens in Nigeria | O.A.M",
     "Buy prepaid electricity tokens and pay postpaid bills for IKEDC, EKEDC, IBEDC, AEDC and other "
     "Nigerian discos. Tokens usually arrive within a minute or two."),
    ("/services/cable", "weekly", "0.8", "DStv, GOtv & StarTimes Subscription Renewal Online | O.A.M",
     "Renew your DStv, GOtv or StarTimes subscription online in seconds. Verify your smartcard number, pick "
     "a bouquet and pay from your wallet or card."),
    ("/services/betting", "weekly", "0.6", "Fund Your Betting Wallet Instantly in Nigeria | O.A.M",
     "Top up your sports betting account instantly across popular Nigerian betting platforms, straight from "
     "your O.A.M wallet."),
    ("/services/giftcards", "weekly", "0.6", "Buy Digital Gift Cards Online in Nigeria | O.A.M",
     "Buy digital gift cards for popular brands and get the code delivered to you. Pay in Naira from your "
     "O.A.M wallet or by card."),
    ("/travel", "weekly", "0.8", "Book Cheap Flights, Hotels & Car Hire from Nigeria | O.A.M Travel",
     "Compare cheap flights, book hotels in over 100 countries, hire cars and book intercity bus tickets "
     "across Nigeria — all from O.A.M."),
    ("/travel/flights", "weekly", "0.8", "Cheap Flights from Nigeria — Compare Airlines & Book | O.A.M",
     "Compare and book cheap domestic and international flights from Lagos, Abuja and other Nigerian cities "
     "with hundreds of airlines."),
    ("/travel/hotels", "weekly", "0.7", "Book Hotels Worldwide with Instant Confirmation | O.A.M",
     "Search and book hotels in over 100 countries with instant confirmation — from Lagos and Abuja to "
     "London, Dubai and beyond."),
    ("/travel/carhire", "weekly", "0.6", "Car Hire With or Without Driver | O.A.M Travel",
     "Rent a car with or without a driver at thousands of locations worldwide, including airport pickups."),
    ("/travel/bus", "weekly", "0.7", "Book Intercity Bus Tickets Across Nigeria | O.A.M",
     "Search routes, pick your seats and book intercity bus tickets across Nigeria online. Pay from your "
     "wallet or by card."),
    ("/send-package", "weekly", "0.8", "Same-Day Package Delivery & Dispatch Riders | O.A.M",
     "Send documents, parcels and food across town today. See the price upfront, track your rider live and "
     "pay by wallet, card or on delivery."),
    ("/jobs", "daily", "0.8", "Find Jobs in Nigeria & Remote Jobs — Apply in One Click | O.A.M Jobs",
     "Search full-time, part-time, remote and contract jobs, apply in one click and track every application. "
     "Employers post jobs and hire fast."),
    ("/about", "monthly", "0.5", "About O.A.M — All Services. One App.",
     "O.A.M is the everything app from O.A.M Motors Limited: bills, marketplace, artisans, travel, jobs and "
     "deliveries in one wallet."),
    ("/contact", "monthly", "0.4", "Contact O.A.M Support", "Get help from the O.A.M team by email at info@oam-app.com."),
    ("/help", "monthly", "0.5", "Help Centre | O.A.M", "Answers to common questions about payments, tokens, the wallet, the marketplace and more."),
    ("/terms", "yearly", "0.2", "Terms of Service | O.A.M", "The terms that apply when you use O.A.M."),
    ("/privacy", "yearly", "0.2", "Privacy Policy | O.A.M", "How O.A.M collects, uses and protects your information."),
    ("/refund-policy", "yearly", "0.2", "Refund Policy | O.A.M", "When and how O.A.M refunds payments."),
]

# Signed-in areas: never indexed. Also used to build robots.txt.
PRIVATE_PREFIXES = [
    "/dashboard", "/wallet", "/orders", "/checkout", "/payment/", "/profile", "/messages",
    "/earnings", "/referral", "/refer-", "/receipt/", "/admin/", "/deliveries", "/rider",
    "/marketplace/sell", "/marketplace/post", "/artisans/me", "/artisans/verify",
    "/services/callback", "/wallet/fund/callback", "/ecommerce",
    "/jobs/employer", "/jobs/applications", "/jobs/saved", "/jobs/profile", "/jobs/messages",
    "/jobs/payment-return",
]
# Sign-in/sign-up/password pages are crawlable but carry <meta name="robots" content="noindex">
# (a robots.txt block would stop Google from ever seeing that noindex).

# The web app loads public data from these API paths; crawlers must be allowed
# to fetch them or JavaScript-rendered pages look empty to Google.
PUBLIC_API_PREFIXES = [
    "/api/v1/public/",
    "/api/v1/marketplace/public/",
    "/api/v1/homeservices/featured/",
    "/api/v1/homeservices/categories/public/",
]
