# OAM Internationalization (i18n) — setup & rollout

This adds multi-language support with **react-i18next**, a language switcher, and
automatic **RTL** (right-to-left) mirroring for Arabic. Two pages (Dashboard,
Buy Airtime) are fully converted as worked examples; the rest of the app follows
the same pattern.

## 1. Install

From the frontend root:

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

(These three are already added to `package.json`, so `npm install` alone also works.)

## 2. What each new/changed file does

- **`src/i18n/index.ts`** — initialises i18next, lists languages, and keeps
  `<html lang/dir>` in sync so Arabic mirrors the whole layout to RTL.
- **`src/i18n/locales/en.json` / `ar.json`** — the translation strings.
- **`src/components/LanguageSwitcher.tsx`** — the dropdown (already placed in the header).
- **`src/main.tsx`** — now imports `./i18n` so it initialises before render.
- **`src/components/AppHeader.tsx`** — nav labels translated; switcher added.
- **`src/pages/Dashboard.tsx` / `src/pages/services/BuyAirtime.tsx`** — worked examples.

## 3. The pattern (how to convert any other page)

**a.** Add the hook at the top of the component:

```tsx
import { useTranslation } from "react-i18next";
// ...
const { t } = useTranslation();
```

**b.** Replace each hardcoded string with a `t("key")` lookup, and add that key
to **both** `en.json` and `ar.json`:

```tsx
// before
<h1>Buy Airtime</h1>
// after
<h1>{t("airtime.title")}</h1>
```

**c.** Values inside text use interpolation:

```tsx
t("dashboard.greetingNamed", { name: user.first_name })
// en.json: "greetingNamed": "Welcome, {{name}} 👋"
```

**d.** Text with inline markup (bold, a link) uses `<Trans>`:

```tsx
<Trans i18nKey="airtime.networkGuess"
       values={{ network: net }}
       components={[<span className="font-medium text-ink" />]} />
// en.json: "networkGuess": "Looks like a <0>{{network}}</0> number …"
// (the array is 0-indexed, so <0> maps to the first component)
```

Suggested order for the rest: the other Bills pages (Data, Electricity, Cable —
they mirror Buy Airtime), then Wallet, then Marketplace/Artisans, then the
auth pages and landing page.

## 4. RTL — the one thing to watch

`dir="rtl"` is set automatically when Arabic is chosen. Tailwind's **logical
utilities** flip on their own, so prefer these over physical ones:

| Physical (doesn't flip) | Logical (flips in RTL) |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |

Symmetric utilities (`mx-*`, `px-*`, `gap-*`, `justify-between`, `text-center`)
need no change. When converting a page, do a quick find for `ml-`, `mr-`, `pl-`,
`pr-`, `left-`, `right-`, `text-left`, `text-right` and switch the ones that
affect reading direction. Purely decorative offsets (e.g. a check badge nudged
`-right-1.5`) can be left as-is or flipped to taste.

## 5. Adding another language later

1. Copy `en.json` to `src/i18n/locales/<code>.json` and translate the values.
2. In `src/i18n/index.ts`: import it, add to `resources`, add to `LANGUAGES`
   (and to `RTL_LANGS` if it's right-to-left).

## 6. Note on the Arabic

The Arabic in `ar.json` is Modern Standard Arabic and covers the two example
pages, the header, and shared strings. Have a native speaker review it before
launch — UI microcopy often needs small wording tweaks that machine/first-pass
translation misses.
