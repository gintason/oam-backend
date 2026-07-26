# OAM Multi-Language — Framework & Roadmap

## What this delivery contains

The **complete 12-language framework**. The language dropdown now lists all 12
languages and switching works immediately. English is fully translated for the
pages converted so far; the other languages fill in progressively.

**Languages:** English, Spanish, French, Mandarin, Arabic, Portuguese, German,
Hindi, Russian, Hausa, Igbo, Yoruba.

### Files
- `src/i18n/index.ts` — 12-language config, English fallback, LTR-only.
- `src/i18n/locales/en.json` — complete source of truth (converted pages).
- `src/i18n/locales/ar.json` — Arabic for converted pages (needs native review).
- `src/i18n/locales/{es,fr,zh,pt,de,hi,ru,ha,ig,yo}.json` — stubs that fall
  back to English until filled with reviewed translations.

## How progressive fill works (the safety mechanism you asked for)

`fallbackLng: "en"` means **any key missing from a language shows English**.
So an unfilled language never shows machine output or blanks — it shows English.
This is what guarantees *nothing unreviewed reaches the client by accident*.

To add a language: open its file, copy the keys you're translating from
`en.json`, and replace the English values. Leave out anything not yet reviewed —
those keep falling back to English automatically.

> The three Nigerian languages (Hausa, Igbo, Yoruba) and Arabic **must** be
> reviewed by a native speaker before the client sees them. Yoruba especially
> relies on diacritics (à, ẹ́, ọ̀) that change meaning. Budget for this.

## The two halves of the remaining work

**1. String extraction (engineering) — converting each page to `t()`.**
Done so far (English + Arabic): Hero, LandingPage, the four landing sections,
Dashboard, Buy Airtime, AppHeader. Remaining, grouped into batches:

- **Batch A — Bills (mirrors Buy Airtime, fast):** BuyData, BuyElectricity,
  BuyCable, GiftCards, FundWallet, Transfer, Withdraw, ComingSoon
- **Batch B — Auth (every user hits these):** SignIn, SignUp, VerifyOtp,
  ForgotPassword, ResetPassword, AuthLayout, fields
- **Batch C — Marketplace interior:** MarketplaceHub, BrowseListings,
  ListingDetail, PostListing, SellDashboard
- **Batch D — Artisans:** ArtisansHub, FindArtisans, ArtisanProfile,
  ArtisanDashboard, ArtisanVerify
- **Batch E — Wallet & money:** Wallet, Orders, Earnings, the callback screens
- **Batch F — Company pages:** About, Contact, Help, Terms, Privacy, PageShell
- **Batch G — Travel:** Travel, Flights, Hotels, CarHire, Pickup
- **Batch H — Messages + remaining sections:** Inbox, Chat, HowItWorks, Trust
- **Small components with text:** ConfirmPurchase, PaySummary, CategoryTabs,
  BottomTabs, Assistant, CurrencySwitcher, TokenCard, FileDrop

**2. Translation (linguistic) — filling the 11 non-English files, with review.**

## Recommended order

1. Ship this framework (dropdown + English + Arabic on converted pages).
2. Extract pages batch by batch (Batch A next — it mirrors Buy Airtime).
3. As batches land, English is immediately complete for them.
4. Fill languages progressively, cheapest-risk first (Spanish/French/Portuguese/
   German), then Mandarin/Hindi/Russian, then Hausa/Igbo/Yoruba with native
   review, then Arabic review.

## What deliberately never translates
Brand/logo (O.A.M.), store badge names, social handles, and **dynamic
backend/database content** (real listing titles, artisan names, category names).
Translating user-generated content is a separate, larger project — recommend
deferring and discussing separately with the client.
