/**
 * Content for the public service pages (/bills, /services/*, /travel/*,
 * /send-package, /jobs). Written for people searching — "pay electricity bill
 * Nigeria", "DStv renewal online" — and only states what O.A.M actually does.
 * Titles/descriptions mirror apps/seo/site.py (sitemap + previews).
 */
export type Landing = {
  path: string;
  /** Where "Get started" takes a signed-in user (signed-out users sign in first, then land there). */
  appPath: string;
  title: string;          // <title>, ≤ ~65 chars
  description: string;    // meta description, 150–160 chars
  keywords: string;
  h1: string;
  intro: string;
  serviceType: string;
  cta: string;
  benefits: { title: string; body: string }[];
  steps: string[];
  faqs: { q: string; a: string }[];
  related: { label: string; to: string }[];
};

const BILLS_RELATED = [
  { label: "Buy airtime", to: "/services/airtime" }, { label: "Buy data", to: "/services/data" },
  { label: "Electricity tokens", to: "/services/electricity" }, { label: "DStv & GOtv", to: "/services/cable" },
];
const TRAVEL_RELATED = [
  { label: "Cheap flights", to: "/travel/flights" }, { label: "Hotels", to: "/travel/hotels" },
  { label: "Car hire", to: "/travel/carhire" }, { label: "Bus tickets", to: "/travel/bus" },
];
const NO_FEES = { title: "No hidden fees", body: "The price you see is the price you pay — there's no extra charge at checkout." };
const WALLET = { title: "Wallet or card", body: "Pay from your O.A.M wallet or by card. If anything fails, your money stays safe in your wallet." };

export const LANDINGS: Landing[] = [
  {
    path: "/bills", appPath: "/dashboard",
    title: "Pay Bills Online in Nigeria — Electricity, DStv, Airtime & Data | O.A.M",
    description: "Pay electricity bills, renew DStv, GOtv and StarTimes, buy airtime and cheap data bundles in seconds. No hidden fees — the price you see is the price you pay.",
    keywords: "pay bills online Nigeria, pay electricity bill online, DStv renewal, buy airtime, buy data bundle, bill payment app Nigeria",
    h1: "Pay all your bills online in seconds",
    intro: "Airtime, data, electricity tokens and cable TV — paid from one O.A.M wallet, with receipts and tokens saved in your order history.",
    serviceType: "Bill payment", cta: "Pay a bill",
    benefits: [NO_FEES, WALLET, { title: "Every network & disco", body: "MTN, Airtel, Glo and 9mobile; IKEDC, EKEDC, IBEDC, AEDC and other discos; DStv, GOtv and StarTimes." }],
    steps: ["Create your free O.A.M account", "Fund your wallet or pay by card", "Pick the bill, confirm, done — your receipt is saved"],
    faqs: [
      { q: "Are there charges for paying bills on O.A.M?", a: "No. There's no separate fee at checkout; the total shown before you pay is exactly what you pay." },
      { q: "Which bills can I pay?", a: "Airtime and data for MTN, Airtel, Glo and 9mobile, prepaid and postpaid electricity across Nigerian discos, and DStv, GOtv and StarTimes subscriptions." },
      { q: "Where do I find my receipts?", a: "Every purchase is saved in Order history with its status, receipt and — for electricity — the token." },
    ],
    related: BILLS_RELATED,
  },
  {
    path: "/services/airtime", appPath: "/services/airtime",
    title: "Buy Airtime Online — MTN, Airtel, Glo, 9mobile Top-Up | O.A.M",
    description: "Recharge MTN, Airtel, Glo and 9mobile airtime instantly, or top up phones abroad with international airtime. Pay from your O.A.M wallet or by card, no extra fees.",
    keywords: "buy airtime online, MTN recharge, Airtel airtime, Glo recharge, 9mobile airtime, international airtime top up, recharge card online Nigeria",
    h1: "Buy airtime online for any network",
    intro: "Top up any MTN, Airtel, Glo or 9mobile number in seconds — or send international airtime to phones in other countries, priced in Naira before you confirm.",
    serviceType: "Mobile airtime top-up", cta: "Buy airtime",
    benefits: [{ title: "All Nigerian networks", body: "MTN, Airtel, Glo and 9mobile — for your line or anyone else's." }, { title: "International top-up", body: "Switch to International, pick the country and network, and see the Naira price first." }, NO_FEES],
    steps: ["Choose the network and enter the phone number", "Pick an amount", "Pay from your wallet or by card"],
    faqs: [
      { q: "Can I buy airtime for someone else?", a: "Yes — enter any phone number on any supported network." },
      { q: "Can I top up a phone outside Nigeria?", a: "Yes. In the airtime screen switch to International, choose the country and network, and you'll see the price in Naira before you pay." },
      { q: "Is there a fee?", a: "No. The amount shown is what you pay." },
    ],
    related: BILLS_RELATED,
  },
  {
    path: "/services/data", appPath: "/services/data",
    title: "Buy Cheap Data Bundles — MTN, Airtel, Glo, 9mobile | O.A.M",
    description: "Buy cheap data bundles for MTN, Airtel, Glo and 9mobile in seconds. Daily, weekly and monthly plans, delivered instantly to any number. No hidden charges.",
    keywords: "buy cheap data bundle, MTN data plan, Airtel data bundle, Glo data, 9mobile data, buy data online Nigeria",
    h1: "Buy cheap data bundles online",
    intro: "Pick a data plan for any MTN, Airtel, Glo or 9mobile number and pay in seconds from your O.A.M wallet or card.",
    serviceType: "Mobile data bundles", cta: "Buy data",
    benefits: [{ title: "Plans for every budget", body: "Choose from the network's daily, weekly and monthly bundles." }, NO_FEES, WALLET],
    steps: ["Choose the network and enter the number", "Pick a data plan", "Pay — the bundle is sent to the line"],
    faqs: [
      { q: "Which networks are supported?", a: "MTN, Airtel, Glo and 9mobile." },
      { q: "Can I buy data for another number?", a: "Yes, enter any phone number on a supported network." },
      { q: "Is there an extra charge?", a: "No — the plan price shown is what you pay." },
    ],
    related: BILLS_RELATED,
  },
  {
    path: "/services/electricity", appPath: "/services/electricity",
    title: "Pay Electricity Bill Online — Prepaid Tokens in Nigeria | O.A.M",
    description: "Buy prepaid electricity tokens and pay postpaid bills for IKEDC, EKEDC, IBEDC, AEDC and other Nigerian discos. Tokens usually arrive within a minute or two.",
    keywords: "pay electricity bill Nigeria, buy prepaid meter token, IKEDC token, EKEDC prepaid, IBEDC bill payment, AEDC token online, NEPA bill online",
    h1: "Pay your electricity bill online",
    intro: "Buy prepaid tokens or pay postpaid bills for Nigerian discos in seconds. Your token is shown in the app, emailed to you and kept in your order history.",
    serviceType: "Electricity bill payment", cta: "Buy electricity",
    benefits: [{ title: "Major discos", body: "IKEDC, EKEDC, IBEDC, AEDC and other Nigerian discos — prepaid and postpaid." }, { title: "Token saved for you", body: "Tokens usually arrive within a minute or two, are emailed to you and stay in Order history." }, NO_FEES],
    steps: ["Choose your disco and enter your 11-digit meter number", "Check the customer name, pick an amount", "Pay — your token appears in seconds"],
    faqs: [
      { q: "How fast do electricity tokens arrive?", a: "Usually within a minute or two, occasionally longer. Order history checks with your provider every few seconds and shows the token as soon as it's issued." },
      { q: "My token hasn't come yet — should I buy again?", a: "No. While an order says processing, the payment has gone through and the order is with your provider; buying again would charge you twice for the same meter." },
      { q: "Can I find an old token?", a: "Yes. Every token is emailed to you and stored permanently in Order history." },
    ],
    related: BILLS_RELATED,
  },
  {
    path: "/services/cable", appPath: "/services/cable",
    title: "DStv, GOtv & StarTimes Subscription Renewal Online | O.A.M",
    description: "Renew your DStv, GOtv or StarTimes subscription online in seconds. Verify your smartcard number, pick a bouquet and pay from your wallet or card.",
    keywords: "DStv renewal online, GOtv subscription, StarTimes recharge, pay DStv online Nigeria, cable TV subscription",
    h1: "Renew DStv, GOtv and StarTimes online",
    intro: "Enter your smartcard or IUC number, confirm the account name, choose your bouquet and pay — your subscription is renewed straight away.",
    serviceType: "Cable TV subscription", cta: "Renew subscription",
    benefits: [{ title: "DStv, GOtv, StarTimes", body: "All the major Nigerian cable TV providers in one place." }, NO_FEES, WALLET],
    steps: ["Choose your provider and enter your smartcard number", "Confirm the name and pick a bouquet", "Pay from your wallet or by card"],
    faqs: [
      { q: "Which cable providers can I pay?", a: "DStv, GOtv, StarTimes and others." },
      { q: "Is there a convenience fee?", a: "No — the bouquet price shown is what you pay." },
      { q: "Where's my receipt?", a: "In Order history, alongside every other purchase." },
    ],
    related: BILLS_RELATED,
  },
  {
    path: "/services/betting", appPath: "/services/betting",
    title: "Fund Your Betting Wallet Instantly in Nigeria | O.A.M",
    description: "Top up your sports betting account instantly across popular Nigerian betting platforms, straight from your O.A.M wallet. Fast, simple, no extra fees.",
    keywords: "fund betting wallet, betting account top up Nigeria, fund sports betting account",
    h1: "Fund your betting wallet instantly",
    intro: "Top up your sports betting account across popular Nigerian platforms directly from your O.A.M wallet.",
    serviceType: "Betting wallet top-up", cta: "Fund betting wallet",
    benefits: [{ title: "Instant", body: "Your betting account is funded straight away." }, NO_FEES, WALLET],
    steps: ["Choose the betting platform", "Enter your customer ID and amount", "Pay from your wallet"],
    faqs: [{ q: "How fast is the top-up?", a: "Betting wallet top-ups are processed instantly." }],
    related: BILLS_RELATED,
  },
  {
    path: "/services/giftcards", appPath: "/services/giftcards",
    title: "Buy Digital Gift Cards Online in Nigeria | O.A.M",
    description: "Buy digital gift cards for popular brands and get the code delivered to you. Pay in Naira from your O.A.M wallet or by card — simple and secure.",
    keywords: "buy gift cards Nigeria, digital gift card, gift card with naira",
    h1: "Buy digital gift cards with Naira",
    intro: "Choose a brand and amount, pay in Naira, and get your gift card code delivered to you.",
    serviceType: "Digital gift cards", cta: "Buy a gift card",
    benefits: [{ title: "Pay in Naira", body: "No foreign card needed — pay from your wallet or local card." }, WALLET],
    steps: ["Pick a brand and amount", "Pay from your wallet or by card", "Get your code"],
    faqs: [{ q: "Do I need a dollar card?", a: "No. You pay in Naira from your O.A.M wallet or card." }],
    related: BILLS_RELATED,
  },
  {
    path: "/travel", appPath: "/travel",
    title: "Book Cheap Flights, Hotels & Car Hire from Nigeria | O.A.M Travel",
    description: "Compare cheap flights, book hotels in over 100 countries, hire cars and book intercity bus tickets across Nigeria — all from O.A.M, in one place.",
    keywords: "cheap flights Nigeria, book hotels, car hire Lagos, bus tickets Nigeria, travel booking Nigeria",
    h1: "Flights, hotels, car hire and bus tickets",
    intro: "Compare domestic and international flights, book hotels worldwide, hire a car or book an intercity bus — all from your O.A.M account.",
    serviceType: "Travel booking", cta: "Plan a trip",
    benefits: [{ title: "Hundreds of airlines", body: "Compare and book domestic and international flights." }, { title: "Hotels in 100+ countries", body: "Instant confirmation, from Lagos and Abuja to London and Dubai." }, { title: "Ground travel", body: "Car hire with or without a driver, airport pickups and intercity buses." }],
    steps: ["Choose flights, hotels, car hire or bus", "Compare options and prices", "Book with the travel partner or pay in the app (bus tickets)"],
    faqs: [
      { q: "Who do I book flights and hotels with?", a: "Flights, hotels and car hire are booked through trusted partner sites, so your booking contract is with the partner." },
      { q: "Can I book bus tickets in the app?", a: "Yes — search routes and dates, pick your seats, enter passenger details and pay from your wallet or by card." },
    ],
    related: TRAVEL_RELATED,
  },
  {
    path: "/travel/flights", appPath: "/travel/flights",
    title: "Cheap Flights from Nigeria — Compare Airlines & Book | O.A.M",
    description: "Compare and book cheap domestic and international flights from Lagos, Abuja and other Nigerian cities with hundreds of airlines. Find the best fare fast.",
    keywords: "cheap flights Nigeria, flights from Lagos, flights from Abuja, cheap flight tickets, international flights Nigeria",
    h1: "Find cheap flights from Nigeria",
    intro: "Compare fares from hundreds of airlines for domestic and international routes, then book with our travel partner.",
    serviceType: "Flight booking", cta: "Search flights",
    benefits: [{ title: "Hundreds of airlines", body: "Domestic and international routes in one search." }, { title: "Compare fares", body: "See prices side by side before you book." }],
    steps: ["Enter where and when you're flying", "Compare fares", "Book with the airline's partner site"],
    faqs: [{ q: "Who is my booking with?", a: "Flights are booked through a partner site, so the booking contract is with the partner, not O.A.M." }],
    related: TRAVEL_RELATED,
  },
  {
    path: "/travel/hotels", appPath: "/travel/hotels",
    title: "Book Hotels Worldwide with Instant Confirmation | O.A.M",
    description: "Search and book hotels in over 100 countries with instant confirmation — from Lagos and Abuja to London, Dubai and beyond. Compare and book in minutes.",
    keywords: "book hotels Lagos, hotels in Abuja, cheap hotels, hotel booking Nigeria, hotels worldwide",
    h1: "Book hotels in over 100 countries",
    intro: "Search hotels by city and dates, compare prices and book with instant confirmation through our partner.",
    serviceType: "Hotel booking", cta: "Find a hotel",
    benefits: [{ title: "100+ countries", body: "From Lagos and Abuja to London, Dubai and beyond." }, { title: "Instant confirmation", body: "Know your room is booked straight away." }],
    steps: ["Enter destination and dates", "Compare hotels", "Book with instant confirmation"],
    faqs: [{ q: "Who is my booking with?", a: "Hotels are booked through a partner site, so the booking contract is with the partner." }],
    related: TRAVEL_RELATED,
  },
  {
    path: "/travel/carhire", appPath: "/travel/carhire",
    title: "Car Hire With or Without Driver | O.A.M Travel",
    description: "Rent a car with or without a driver at thousands of locations worldwide, including airport pickups. Compare options and book in minutes with O.A.M.",
    keywords: "car hire Lagos, car rental with driver Nigeria, airport pickup Lagos, rent a car Abuja",
    h1: "Car hire, with or without a driver",
    intro: "Rent a car at thousands of locations worldwide, with or without a driver — airport pickups included.",
    serviceType: "Car rental", cta: "Hire a car",
    benefits: [{ title: "With or without driver", body: "Drive yourself or be driven." }, { title: "Airport pickups", body: "Get collected when you land." }],
    steps: ["Choose location and dates", "Pick a car (with or without driver)", "Book with our partner"],
    faqs: [{ q: "Can I get an airport pickup?", a: "Yes — airport pickups are available alongside car hire." }],
    related: TRAVEL_RELATED,
  },
  {
    path: "/travel/bus", appPath: "/travel/bus",
    title: "Book Intercity Bus Tickets Across Nigeria | O.A.M",
    description: "Search routes, pick your seats and book intercity bus tickets across Nigeria online. Pay from your O.A.M wallet or by card — no queues at the park.",
    keywords: "bus tickets Nigeria, book bus ticket online, Lagos to Abuja bus, intercity bus Nigeria",
    h1: "Book intercity bus tickets online",
    intro: "Choose your route and date, pick your seats, add passenger details and pay — no queue at the park.",
    serviceType: "Bus ticket booking", cta: "Book a bus",
    benefits: [{ title: "Pick your seat", body: "See the seat map and choose where you sit." }, WALLET],
    steps: ["Choose route and date", "Pick your seats and add passengers", "Pay from your wallet or by card"],
    faqs: [{ q: "How do I pay for bus tickets?", a: "From your O.A.M wallet or by card." }],
    related: TRAVEL_RELATED,
  },
  {
    path: "/send-package", appPath: "/deliveries/new",
    title: "Same-Day Package Delivery & Dispatch Riders | O.A.M",
    description: "Send documents, parcels and food across town today. See the price upfront, track your rider live and pay by wallet, card or on delivery. Book in a minute.",
    keywords: "same day delivery Lagos, dispatch rider near me, send package Abuja, courier service Nigeria, parcel delivery",
    h1: "Send a package across town — today",
    intro: "Book a verified rider in a minute. See the price before you pay, follow the rider live on the map, and confirm hand-over with a delivery code.",
    serviceType: "Same-day courier delivery", cta: "Send a package",
    benefits: [{ title: "Upfront price", body: "Distance, weight and package type — you see the full price before paying." }, { title: "Live tracking", body: "Follow your rider on the map from pickup to drop-off." }, { title: "Pay your way", body: "Wallet, card, pay on delivery, or cash at pickup." }],
    steps: ["Set pickup and drop-off on the map", "Add recipient and package details, see the price", "A nearby verified rider picks it up — track it live"],
    faqs: [
      { q: "Can I cancel a delivery?", a: "Yes, free of charge until the rider picks the package up. Wallet and card payments go back to your O.A.M wallet in full." },
      { q: "How does the recipient confirm delivery?", a: "Your delivery has a 4-digit code. Share it with the recipient; the rider enters it at the door to confirm hand-over." },
      { q: "Can I pay on delivery?", a: "Yes — the rider shows a secure payment link at the door, or you can pay cash. You can also pay upfront or in cash at pickup." },
    ],
    related: [{ label: "Marketplace", to: "/marketplace" }, { label: "Hire an artisan", to: "/artisans" }, { label: "Pay bills", to: "/bills" }],
  },
  {
    path: "/jobs", appPath: "/jobs",
    title: "Find Jobs in Nigeria & Remote Jobs — Apply in One Click | O.A.M Jobs",
    description: "Search full-time, part-time, remote and contract jobs, apply in one click and track every application. Employers post jobs and hire fast on O.A.M Jobs.",
    keywords: "jobs in Nigeria, remote jobs Nigeria, job vacancies Lagos, jobs in Abuja, apply for jobs online, hire staff Nigeria",
    h1: "Find your next job — or hire your next star",
    intro: "Free for job seekers: build your profile, search with powerful filters, apply in one click and follow every application. Employers post jobs and manage applicants on a simple pipeline.",
    serviceType: "Job board", cta: "Browse jobs",
    benefits: [{ title: "Apply in one click", body: "Use your O.A.M profile and CV, or send a full application." }, { title: "Job alerts", body: "Save a search and get new jobs instantly, daily or weekly." }, { title: "Scam-screened", body: "Listings are checked for scam signs. Real employers never charge you to apply." }],
    steps: ["Create your profile and upload your CV", "Search by remote, hybrid or on-site, job type, salary and more", "Apply and track: Applied → Interview → Offer → Hired"],
    faqs: [
      { q: "Is O.A.M Jobs free for job seekers?", a: "Yes. Searching, applying and job alerts are free." },
      { q: "How much does it cost to post a job?", a: "Employers can post 1 job free. Premium is ₦15,000 a month (10 jobs) and Pro ₦40,000 a month (unlimited); a single extra job is ₦5,000. Plans don't renew automatically." },
      { q: "Should I ever pay to apply for a job?", a: "Never. A legitimate employer won't charge you to apply — report any listing that does." },
    ],
    related: [{ label: "Hire artisans", to: "/artisans" }, { label: "Marketplace", to: "/marketplace" }, { label: "Pay bills", to: "/bills" }],
  },
];

export const LANDING_BY_PATH: Record<string, Landing> = Object.fromEntries(LANDINGS.map((l) => [l.path, l]));
