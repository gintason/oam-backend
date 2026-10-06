# O.A.M SEO — install, Render setup, Google & Bing submission

## What this does

**1. Search engines can now see your content.** Until now, every marketplace,
artisan, travel and services page was behind sign-in. Google and Bing only ever
saw the sign-in page, so nothing could rank. Signed-out visitors and crawlers now
get proper public pages at the same addresses. Signed-in users see the app
exactly as before.

| Page | What signed-out visitors and Google now see |
|---|---|
| `/marketplace` (+ `?category=…`) | Live listings, search, category filters |
| `/marketplace/<id>` | Photos, video, price, description; "Sign in to message the seller" |
| `/artisans`, `/artisans/<id>` | Directory (verified first) and profiles; "Sign in to send an enquiry" |
| `/bills`, `/services/airtime`, `/services/data`, `/services/electricity`, `/services/cable`, `/services/betting`, `/services/giftcards` | Keyword-focused service pages with how-it-works steps and FAQs |
| `/travel`, `/travel/flights`, `/travel/hotels`, `/travel/carhire`, `/travel/bus` | Same, for travel |
| `/send-package`, `/jobs` | Same, for deliveries and jobs |
| Unknown URLs | A real "Page not found" (noindex), instead of a copy of the home page |

Phone numbers, emails and street addresses are never shown on public pages.
Contact still happens only through an accepted in-app enquiry.

**2. Every page sets its own head tags** (`src/seo/SEOHead.tsx`):
- title, description and keywords
- robots and canonical
- Open Graph and Twitter card
- JSON-LD structured data

**3. Backend (`apps/seo`):**
- `/sitemap.xml`, which updates itself: 23 static pages, every live listing, and every *verified* artisan.
- `/robots.txt`.
- A read-only public API, `/api/v1/public/…`.
- Server-rendered link previews for `/marketplace/<id>` and `/artisans/<id>`.

**4. Structured data:**

| Schema | Where it appears |
|---|---|
| Organization + WebSite (with the Sitelinks search box) | Home page |
| Product / Offer | Listings |
| ProfessionalService | Artisans |
| Service + FAQPage | Service pages |
| BreadcrumbList | Detail pages |
| ItemList | Directory pages |

**5. Speed and HTML fixes:**
- Fonts no longer load through render-blocking CSS `@import`s; they're preconnected `<link>`s instead.
- Preconnects for Cloudinary.
- A 1200×630 share image.
- Keyword `alt` text on marketplace and artisan images.
- A single `<h1>` on the home page (the rotating headline had five).
- A `<noscript>` block with links, for crawlers that don't run JavaScript.

## 1. Install

Deploy the backend first.

```
cd ~/Desktop/oam-platform/backend
unzip -o ~/Downloads/oam-seo-backend.zip && python3 apply_seo_backend.py
git add -A && git commit -m "SEO: sitemap, robots, public API, link previews" && git push

cd ../frontend
unzip -o ~/Downloads/oam-seo-frontend.zip && python3 apply_seo_frontend.py
git add -A && git commit -m "SEO: public pages, meta tags, JSON-LD, sitemap/robots" && git push
```

There's no migration.

## 2. Render settings (one-time, about 5 minutes)

### Backend service (oam-api) → Environment

| Key | Value |
|---|---|
| `SEO_SITE_URL` | `https://www.oam-app.com` |

This address is used in every canonical URL and in the sitemap.

### Static site (oam-web) → Environment

These are optional, and both are explained in steps 3 and 4.

| Key | Value |
|---|---|
| `VITE_GOOGLE_SITE_VERIFICATION` | The code from Google Search Console (step 3) |
| `VITE_BING_SITE_VERIFICATION` | The code from Bing Webmaster Tools (step 4) |

Redeploy the static site after changing either one.

### Static site (oam-web) → Redirects/Rewrites

Your site already sends `/api/*` to the backend this way. Add these three rules
**above** the existing `/*  →  /index.html` rule. Replace `API-HOST` with your
backend's address, the same one your `/api/*` rule uses, e.g. `oam-api.onrender.com`.

| Source | Destination | Action |
|---|---|---|
| `/sitemap.xml` | `https://API-HOST/sitemap.xml` | Rewrite |
| `/marketplace/*` | `https://API-HOST/marketplace/*` | Rewrite |
| `/artisans/*` | `https://API-HOST/artisans/*` | Rewrite |

You don't need a rule for `robots.txt`; it's a file in the site (`public/robots.txt`).

**Why the last two rules:** WhatsApp, Facebook, X and LinkedIn don't run
JavaScript. Without these rules, a shared listing previews as the home page.
With them, the backend returns the app's normal page with that listing's title,
photo, price and structured data already filled in. The app then loads on top
as usual.

> **Free backend plan:** a sleeping backend makes the first request after a quiet
> period take up to a minute, which hurts both previews and Google. Use a paid
> instance (or a keep-alive ping) once you depend on these. If you'd rather not
> route these pages through the backend, skip the two rules. Google still reads
> the pages because it runs JavaScript; only WhatsApp/Facebook previews lose the
> per-item details.

### Check it worked

```
curl -s https://www.oam-app.com/robots.txt | head -5
curl -s https://www.oam-app.com/sitemap.xml | head -5        # should start with <?xml … <urlset
curl -s https://www.oam-app.com/marketplace/<a-real-listing-id> | grep -o "<title>[^<]*"
```

The last command should print the listing's own title, not the home page title.

**Same address everywhere:** canonical URLs use `https://www.oam-app.com`. In
Render → Custom Domains, make sure `oam-app.com` redirects to `www.oam-app.com`,
so Google doesn't see two copies of the site.

## 3. Google Search Console

1. Go to https://search.google.com/search-console and click **Add property**.
2. **Recommended: choose "Domain"** and enter `oam-app.com`. Google gives you a
   DNS TXT record. Add it at your domain registrar, wait a few minutes, then
   click **Verify**. This one property covers `www`, the bare domain and any
   subdomains.
3. *Or* choose **URL prefix** (`https://www.oam-app.com/`):
   1. Choose the **HTML tag** method.
   2. Copy only the `content="…"` value.
   3. In Render, set it as `VITE_GOOGLE_SITE_VERIFICATION` on the static site and redeploy.
   4. Click **Verify**.
4. In the left menu open **Sitemaps**, enter `sitemap.xml`, and click **Submit**.
   After a while the status should say *Success*, with the number of discovered URLs.
5. Use **URL Inspection** to speed things up:
   1. Paste `https://www.oam-app.com/` and click **Request indexing**.
   2. Repeat for `/marketplace`, `/artisans`, `/bills` and `/services/electricity`.
6. Check your structured data with https://search.google.com/test/rich-results:
   - paste a listing URL: it should detect **Product** and **Breadcrumbs**;
   - paste the home page: it should detect **Organization**.
7. Over the next 1–4 weeks, watch **Indexing → Pages** (what got indexed and
   why not) and **Performance** (the searches people find you with).

## 4. Bing Webmaster Tools (also covers Yahoo and DuckDuckGo)

1. Go to https://www.bing.com/webmasters and sign in.
2. **Easiest: Import from Google Search Console.** It copies your verified site
   and sitemap in one step.
3. *Or* **Add site** manually:
   1. Enter `https://www.oam-app.com/` and choose **HTML Meta Tag**.
   2. Copy the `content` value of `msvalidate.01`.
   3. In Render, set it as `VITE_BING_SITE_VERIFICATION` on the static site and redeploy.
   4. Click **Verify**.
4. Open **Sitemaps → Submit sitemap** and enter `https://www.oam-app.com/sitemap.xml`.
5. Open **URL Inspection** and use **Request indexing** for the home page.

Yahoo and DuckDuckGo use Bing's index, so there's nothing separate to submit.

## 5. Check link previews

| Platform | Tool |
|---|---|
| Facebook / WhatsApp | https://developers.facebook.com/tools/debug/ (paste a listing URL, then click **Scrape Again** after changes) |
| LinkedIn | https://www.linkedin.com/post-inspector/ |
| Speed | https://pagespeed.web.dev/ |

## 6. JSON-LD examples

These are the actual output.

**Home page** (Organization + WebSite with the Sitelinks search box):
```json
{"@context":"https://schema.org","@type":"Organization","@id":"https://www.oam-app.com/#organization","name":"O.A.M","legalName":"O.A.M Motors Limited","url":"https://www.oam-app.com/","logo":"https://www.oam-app.com/logo-512.png","sameAs":["https://x.com/oamplatform","https://facebook.com/oamplatform","https://instagram.com/oamplatform","https://tiktok.com/@oamplatform"],"contactPoint":[{"@type":"ContactPoint","contactType":"customer support","email":"info@oam-app.com","availableLanguage":["English"]}]}
{"@context":"https://schema.org","@type":"WebSite","@id":"https://www.oam-app.com/#website","name":"O.A.M","url":"https://www.oam-app.com/","publisher":{"@id":"https://www.oam-app.com/#organization"},"potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://www.oam-app.com/marketplace?q={search_term_string}"},"query-input":"required name=search_term_string"}}
```

**Marketplace listing** (Product / Offer):
```json
{"@context":"https://schema.org","@type":"Product","name":"iPhone 13 Pro, 256GB","description":"Clean, no scratches. Battery 89%.","url":"https://www.oam-app.com/marketplace/<id>","sku":"<id>","category":"Phones & Tablets",
 "image":["https://res.cloudinary.com/…/phone1.jpg","…"],
 "offers":{"@type":"Offer","url":"https://www.oam-app.com/marketplace/<id>","price":"650000.00","priceCurrency":"NGN","availability":"https://schema.org/InStock","itemCondition":"https://schema.org/UsedCondition","areaServed":"Ikeja, Lagos","priceValidUntil":"2026-11-05","seller":{"@type":"Person","name":"Musa"}}}
```

**Artisan profile** (ProfessionalService, a type of LocalBusiness):
```json
{"@context":"https://schema.org","@type":"ProfessionalService","name":"Musa Tiles & Finishing","url":"https://www.oam-app.com/artisans/<id>","description":"Floor and wall tiling, 9 years.","knowsAbout":"Tiling","address":{"@type":"PostalAddress","addressLocality":"Abuja","addressRegion":"FCT"},"areaServed":{"@type":"City","name":"Abuja"}}
```

**Deliberately left out:**
- **Ratings:** artisans have no review system yet, and invented ratings get sites penalised.
- **Street addresses:** a privacy decision.
- **Video data:** Google requires a thumbnail and upload date for it.

## 7. Notes and recommended next steps

- **robots.txt blocks `/api/` except the public data endpoints.** The pages load
  their data from those endpoints, and Google won't render a page whose data
  robots.txt blocks.
- **`<meta name="keywords">` is included as you asked.** Google ignores it and
  Bing gives it very little weight. What ranks is the visible text, titles and
  descriptions, which these pages now have.
- **Unverified artisan profiles are viewable** (so shared links work) **but
  `noindex`.** Only verified artisans are in the sitemap.
- **Next big wins:**
  1. **Jobs → Google for Jobs:** public job pages with `JobPosting` structured data.
     These get their own search box on Google and are highly valuable.
  2. **Readable URLs:** for example `/marketplace/<id>/iphone-13-pro-256gb`.
  3. **Speed:** split the JavaScript bundle per page. The main bundle is large,
     and Vite warns about it on every build.
  4. **Translations:** translate the public pages into Yoruba, Hausa and Igbo,
     with `hreflang` tags.
  5. **Content:** a blog or guides (e.g. "How to recharge a prepaid meter") to
     win informational searches.
