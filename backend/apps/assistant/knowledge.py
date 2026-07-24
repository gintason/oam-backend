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
- Airtime and data top-ups
- Electricity units (prepaid tokens and postpaid)
- Cable TV subscriptions
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
- Phone numbers are NEVER published. A buyer messages the seller in the app, and
  contact details are exchanged only when the seller accepts the enquiry.

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

O.A.M MOTORS
- Vehicles sold directly by O.A.M Motors, listed in the marketplace under the
  O.A.M Motors category

TRAVEL
- Flights, hotels, car hire and airport pickups, booked through partner sites.
  The booking contract is with the partner, not with OAM.

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
        "keywords": ["listing", "sell", "how many", "plan", "premium", "pro", "subscription"],
        "answer": (
            "The Free plan allows 3 active listings, indefinitely, with no card required.\n\n"
            "Premium (₦2,500) allows up to 20 listings plus featured placement. "
            "Pro (₦5,000) is unlimited, with featured placement and priority in search.\n\n"
            "Both are one-off payments for a period — nothing renews automatically."
        ),
    },
    {
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

GREETING = (
    "Hello. I can help with anything about OAM — bills, your wallet, electricity tokens, "
    "the marketplace, or finding an artisan. What would you like to know?"
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
    "The Help Centre (/help) covers most questions, and info@oam-app.com reaches a person who "
    "can look into anything specific — including your own orders and payments, which I can't see."
)
