#!/usr/bin/env python
"""
SEO for the web app (www.oam-app.com).

Unzip oam-seo-frontend.zip in the frontend root first, then:
    python3 apply_seo_frontend.py

New files (from the zip)
  src/seo/*                  SEOHead (title, description, keywords, robots, canonical,
                             Open Graph, Twitter card, JSON-LD), RouteMeta, schema builders
  src/pages/public/*         public pages for signed-out visitors and search engines:
                             marketplace, listing, artisans, artisan profile, service
                             landing pages (/bills, /services/*, /travel/*, /send-package,
                             /jobs) and a real 404
  src/services/publicSeo.ts  read-only public API
  public/og-image.png        1200×630 share image;  public/logo-512.png;  public/robots.txt

Patched (backups: *.bak-seo)
  index.html        full default tags, JSON-LD, verification slots, preconnects, fonts,
                    <noscript> links for crawlers
  vite.config.ts    adds Google/Bing verification tags from env vars at build time
  src/index.css     fonts move to index.html (no render-blocking @import chain)
  src/App.tsx       public versions of marketplace/artisans/services/travel for signed-out
                    visitors; /bills, /send-package; 404 instead of home for unknown URLs
  src/routes/jobsRoutes.tsx   public /jobs page for signed-out visitors
  src/LandingPage.tsx         home-page tags + Organization and WebSite (search box) JSON-LD
  src/Hero.tsx                one <h1> on the home page (the rotating headline had five)
  image alt text on marketplace and artisan cards/pages
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
changed, skipped, problems = [], [], []


def backup(p: Path):
    bak = p.with_name(p.name + ".bak-seo")
    if p.exists() and not bak.exists():
        shutil.copy2(p, bak)


def patch(rel, marker, reps, optional=False):
    p = ROOT / rel
    if not p.exists():
        (skipped if optional else problems).append(f"{rel}: not found")
        return
    t = p.read_text(encoding="utf-8")
    if marker in t:
        skipped.append(rel)
        return
    for old, new in reps:
        if old not in t:
            problems.append(f"{rel}: couldn't find {old.strip()[:80]!r} — send me the file")
            return
        t = t.replace(old, new, 1)
    backup(p)
    p.write_text(t, encoding="utf-8")
    changed.append(rel)


if not (ROOT / "package.json").exists() or not (ROOT / "src/App.tsx").exists():
    print("Run this from the frontend root (the folder containing package.json and src/App.tsx).")
    sys.exit(1)
for f in ("src/seo/SEOHead.tsx", "src/pages/public/ServiceLanding.tsx", "public/og-image.png"):
    if not (ROOT / f).exists():
        print(f"{f} is missing — unzip oam-seo-frontend.zip here first.")
        sys.exit(1)

# ---------------------------------------------------------------- index.html
INDEX = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0B7327" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />

    <!-- Search engine verification: set VITE_GOOGLE_SITE_VERIFICATION and/or
         VITE_BING_SITE_VERIFICATION in the hosting environment and rebuild; the
         tags below are filled in at build time (see vite.config.ts), e.g.
         <meta name="google-site-verification" content="..." />
         <meta name="msvalidate.01" content="..." /> -->
    <!-- seo:verification -->

    <!-- Speed: open connections early to the hosts every page needs -->
    <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
    <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://res.cloudinary.com" crossorigin />
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=clash-display@500,600&display=swap" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" />

    <!-- Default tags (home page). Each page replaces these as you navigate (src/seo). -->
    <title>O.A.M — The Everything App | Pay Bills, Hire Artisans &amp; Shop Online in Nigeria</title>
    <meta name="description" content="Buy airtime and data, pay electricity and DStv bills, hire verified plumbers and electricians, book cheap flights and shop the local marketplace — one O.A.M wallet." />
    <meta name="keywords" content="OAM app, pay electricity bill Nigeria, buy cheap data bundle, buy airtime online, DStv renewal online, hire electrician Lagos, hire plumber Abuja, cheap flights Nigeria, OAM marketplace, buy and sell Nigeria" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="https://www.oam-app.com/" />
    <meta property="og:site_name" content="O.A.M" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="O.A.M — The Everything App | Pay Bills, Hire Artisans &amp; Shop Online in Nigeria" />
    <meta property="og:description" content="Buy airtime and data, pay electricity and DStv bills, hire verified plumbers and electricians, book cheap flights and shop the local marketplace — one O.A.M wallet." />
    <meta property="og:url" content="https://www.oam-app.com/" />
    <meta property="og:image" content="https://www.oam-app.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="O.A.M — pay bills, hire artisans, shop, travel and send packages from one app" />
    <meta property="og:locale" content="en_NG" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@oamplatform" />
    <meta name="twitter:title" content="O.A.M — The Everything App | Pay Bills, Hire Artisans &amp; Shop Online in Nigeria" />
    <meta name="twitter:description" content="Buy airtime and data, pay electricity and DStv bills, hire verified plumbers and electricians, book cheap flights and shop the local marketplace — one O.A.M wallet." />
    <meta name="twitter:image" content="https://www.oam-app.com/og-image.png" />
    <script type="application/ld+json" data-seo="jsonld">{"@context":"https://schema.org","@type":"Organization","@id":"https://www.oam-app.com/#organization","name":"O.A.M","legalName":"O.A.M Motors Limited","url":"https://www.oam-app.com/","logo":"https://www.oam-app.com/logo-512.png","sameAs":["https://x.com/oamplatform","https://facebook.com/oamplatform","https://instagram.com/oamplatform","https://tiktok.com/@oamplatform"],"contactPoint":[{"@type":"ContactPoint","contactType":"customer support","email":"info@oam-app.com","availableLanguage":["English"]}]}</script>
    <script type="application/ld+json" data-seo="jsonld">{"@context":"https://schema.org","@type":"WebSite","@id":"https://www.oam-app.com/#website","name":"O.A.M","url":"https://www.oam-app.com/","publisher":{"@id":"https://www.oam-app.com/#organization"},"potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://www.oam-app.com/marketplace?q={search_term_string}"},"query-input":"required name=search_term_string"}}</script>
  </head>
  <body>
    <div id="root"></div>
    <noscript>
      <p><strong>O.A.M — The Everything App for Nigeria</strong></p>
      <p>Pay bills, buy airtime and data, hire verified artisans, shop the marketplace, book travel, find jobs and send packages from one wallet. Please enable JavaScript to use O.A.M.</p>
      <ul>
        <li><a href="/bills">Pay bills online</a></li>
        <li><a href="/services/airtime">Buy airtime</a></li>
        <li><a href="/services/data">Buy data bundles</a></li>
        <li><a href="/services/electricity">Pay electricity bill</a></li>
        <li><a href="/services/cable">DStv, GOtv &amp; StarTimes renewal</a></li>
        <li><a href="/marketplace">Marketplace</a></li>
        <li><a href="/artisans">Hire artisans</a></li>
        <li><a href="/travel/flights">Cheap flights</a></li>
        <li><a href="/send-package">Send a package</a></li>
        <li><a href="/jobs">Jobs</a></li>
      </ul>
    </noscript>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""
idx = ROOT / "index.html"
if "seo:verification" in idx.read_text(encoding="utf-8"):
    skipped.append("index.html")
else:
    backup(idx)
    idx.write_text(INDEX, encoding="utf-8")
    changed.append("index.html")

# ---------------------------------------------------------------- vite.config.ts
VITE = """import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// [oam-seo] Google / Bing verification tags, added to index.html only when the
// env var is set at build time (Render: Environment -> add the variable, redeploy).
function seoVerification(env: Record<string, string>): Plugin {
  const tags = [
    ['google-site-verification', env.VITE_GOOGLE_SITE_VERIFICATION],
    ['msvalidate.01', env.VITE_BING_SITE_VERIFICATION],
    ['yandex-verification', env.VITE_YANDEX_VERIFICATION],
  ].filter(([, v]) => v) as [string, string][]
  return {
    name: 'oam-seo-verification',
    transformIndexHtml(html) {
      const meta = tags
        .map(([name, v]) => `<meta name="${name}" content="${v.replace(/[^\\w\\-.=+/]/g, '')}" />`)
        .join('\\n    ')
      return html.replace('<!-- seo:verification -->', meta)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), seoVerification(env)],
  }
})
"""
vc = ROOT / "vite.config.ts"
vt = vc.read_text(encoding="utf-8")
if "oam-seo-verification" in vt:
    skipped.append("vite.config.ts")
elif "plugins: [react()]" in vt and vt.count("plugins") == 1:
    backup(vc)
    vc.write_text(VITE, encoding="utf-8")
    changed.append("vite.config.ts")
else:
    problems.append("vite.config.ts has custom settings — send it to me (verification tags not wired)")

# ---------------------------------------------------------------- fonts out of CSS
patch("src/index.css", "fonts load from index.html", [
    ('@import url("https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=clash-display@500,600&display=swap");\n',
     "/* fonts load from index.html (<link>, preconnected) — an @import here blocks rendering */\n"),
    ('@import url("https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap");\n', ""),
])

# ---------------------------------------------------------------- App.tsx
def pub(path, app, public):
    old = f'<Route path="{path}" element={{<RequireAuth><{app} /></RequireAuth>}} />'
    new = f'<Route path="{path}" element={{<PublicOrApp app={{<{app} />}} pub={{<{public} />}} />}} />'
    return old, new


patch("src/App.tsx", "PublicOrApp", [
    ('import Profile from "./pages/Profile";\n',
     'import Profile from "./pages/Profile";\n'
     '// oam-seo: public pages for signed-out visitors and search engines\n'
     'import { Navigate } from "react-router-dom";\n'
     'import { RouteMeta } from "./seo/RouteMeta";\n'
     'import { PublicOrApp } from "./seo/PublicOrApp";\n'
     'import PublicMarketplace from "./pages/public/PublicMarketplace";\n'
     'import PublicListing from "./pages/public/PublicListing";\n'
     'import PublicArtisans from "./pages/public/PublicArtisans";\n'
     'import PublicArtisan from "./pages/public/PublicArtisan";\n'
     'import ServiceLanding from "./pages/public/ServiceLanding";\n'
     'import NotFound from "./pages/public/NotFound";\n'),
    ("<BrowserRouter>\n            <Routes>", "<BrowserRouter>\n            <RouteMeta />\n            <Routes>"),
    pub("/marketplace", "MarketplaceHub", "PublicMarketplace"),
    pub("/marketplace/browse", "BrowseListings", "PublicMarketplace"),
    pub("/marketplace/:id", "ListingDetail", "PublicListing"),
    pub("/services/airtime", "BuyAirtime", "ServiceLanding"),
    pub("/services/data", "BuyData", "ServiceLanding"),
    pub("/services/electricity", "BuyElectricity", "ServiceLanding"),
    pub("/services/betting", "BuyBetting", "ServiceLanding"),
    pub("/services/cable", "BuyCable", "ServiceLanding"),
    pub("/services/giftcards", "GiftCards", "ServiceLanding"),
    pub("/travel/bus", "BusTickets", "ServiceLanding"),
    pub("/travel", "Travel", "ServiceLanding"),
    pub("/travel/flights", "Flights", "ServiceLanding"),
    pub("/travel/hotels", "Hotels", "ServiceLanding"),
    pub("/travel/carhire", "CarHire", "ServiceLanding"),
    pub("/artisans", "ArtisansHub", "PublicArtisans"),
    pub("/artisans/find", "FindArtisans", "PublicArtisans"),
    pub("/artisans/:id", "ArtisanProfile", "PublicArtisan"),
    ('              {/* Fallback: anything unknown goes to the landing page */}\n'
     '              <Route path="*" element={<LandingPage />} />',
     '              {/* oam-seo: public hubs (signed-in users go straight to the app) */}\n'
     '              <Route path="/bills" element={<PublicOrApp app={<Navigate to="/dashboard" replace />} pub={<ServiceLanding />} />} />\n'
     '              <Route path="/send-package" element={<PublicOrApp app={<Navigate to="/deliveries/new" replace />} pub={<ServiceLanding />} />} />\n\n'
     '              {/* Fallback: a real "not found" page (noindex) — serving the home page for\n'
     '                  every unknown URL creates duplicate "soft 404" pages in search results */}\n'
     '              <Route path="*" element={<NotFound />} />'),
])

patch("src/routes/jobsRoutes.tsx", "PublicOrApp", [
    ('import { RequireAuth } from "./guards";\n',
     'import { RequireAuth } from "./guards";\n'
     'import { PublicOrApp } from "../seo/PublicOrApp";\n'
     'import ServiceLanding from "../pages/public/ServiceLanding";\n'),
    ('<Route path="/jobs" element={auth(<JobsHub />)} />',
     '<Route path="/jobs" element={<PublicOrApp app={<JobsHub />} pub={<ServiceLanding />} />} />'),
])

# ---------------------------------------------------------------- home page
patch("src/LandingPage.tsx", "SEOHead", [
    ('import logo from "./assets/logo.png";\n',
     'import logo from "./assets/logo.png";\n'
     'import { SEOHead, organizationSchema, websiteSchema } from "./seo";\n'),
    ('    <div className="min-h-screen bg-paper">\n',
     '    <div className="min-h-screen bg-paper">\n'
     '      <SEOHead path="/" jsonLd={[organizationSchema(), websiteSchema()]} />\n'),
    ('alt="OAM — All services. One app."', 'alt="O.A.M — pay bills, hire artisans and shop online in Nigeria"'),
])

# ---------------------------------------------------------------- one <h1> on the home page
# The rotating hero headline rendered one <h1> per slide (5 on the page). Slides become
# <p> (same look); a single descriptive <h1> is added for search engines and screen readers.
patch("src/Hero.tsx", "oam-seo: single h1", [
    ("""          <div className="relative min-h-[104px] sm:min-h-[150px] lg:min-h-[168px]">
            {headlines.map((h, i) => (
              <h1
""",
     """          {/* oam-seo: single h1 — the rotating slides below are visual only */}
          <h1 className="sr-only">O.A.M — pay bills, buy airtime and data, hire verified artisans, shop and book travel in Nigeria</h1>
          <div className="relative min-h-[104px] sm:min-h-[150px] lg:min-h-[168px]">
            {headlines.map((h, i) => (
              <p
"""),
    ("""                {h}
              </h1>
            ))}""", """                {h}
              </p>
            ))}"""),
])

# ---------------------------------------------------------------- image alt text
patch("src/sections/Marketplace.tsx", "for sale${item.location", [
    ('            src={item.primary_image}\n            alt=""',
     '            src={item.primary_image}\n            alt={`${item.title} for sale${item.location ? ` in ${item.location}` : ""}`}'),
], optional=True)
patch("src/sections/FeaturedArtisans.tsx", "alt={`${artisan.business_name}", [
    ('<img src={artisan.profile_photo} alt="" className="h-full w-full object-cover" />',
     '<img src={artisan.profile_photo} alt={`${artisan.business_name}, ${artisan.category_name}${artisan.city ? ` in ${artisan.city}` : ""}`} loading="lazy" className="h-full w-full object-cover" />'),
], optional=True)
patch("src/pages/marketplace/BrowseListings.tsx", "alt={`${listing.title}", [
    ('<img src={listing.primary_image} alt=""', '<img src={listing.primary_image} alt={`${listing.title} for sale`} loading="lazy"'),
], optional=True)
patch("src/pages/marketplace/ListingDetail.tsx", "alt={`${l.title}", [
    ('<img src={images[activeImage]?.url} alt=""', '<img src={images[activeImage]?.url} alt={`${l.title} — photo ${activeImage + 1}`}'),
    ('<img src={img.url} alt="" className="h-full w-full object-cover" />',
     '<img src={img.url} alt={`${l.title} — thumbnail`} loading="lazy" className="h-full w-full object-cover" />'),
], optional=True)
patch("src/pages/artisans/FindArtisans.tsx", "alt={`${artisan.business_name}", [
    ('<img src={artisan.profile_photo} alt="" className="h-full w-full object-cover" />',
     '<img src={artisan.profile_photo} alt={`${artisan.business_name}, ${artisan.category_name}`} loading="lazy" className="h-full w-full object-cover" />'),
], optional=True)
patch("src/pages/artisans/ArtisanProfile.tsx", "alt={`${a.business_name}", [
    ('<img src={a.profile_photo} alt="" className="h-full w-full object-cover" />',
     '<img src={a.profile_photo} alt={`${a.business_name}, ${a.category_name}`} className="h-full w-full object-cover" />'),
], optional=True)

print("Changed: " + (", ".join(changed) or "nothing"))
if skipped:
    print("Already done / not present: " + ", ".join(skipped))
if problems:
    print("\nNEEDS ATTENTION:\n  - " + "\n  - ".join(problems))
    sys.exit(2)
print("\nCommit and push; the site redeploys. Then follow SEO-SETUP.md.")
