# O.A.M — Store release guide (Google Play + App Store)

The builds are made by **EAS** (Expo's build service) on your Expo account
(`gintason`, project `oam-mobile`). EAS creates and stores the signing keys,
builds the `.aab` (Google Play) and `.ipa` (App Store) in the cloud, and can
upload them for you.

- **Android:** `eas build -p android --profile production` produces an **.aab**.
- **iOS:** `eas build -p ios --profile production` produces an **.ipa**.

---

## 0. One-time setup (≈ 30 min)

1. **Install the tools** (on your Mac):
   ```bash
   npm install -g eas-cli
   eas login                      # the Expo account that owns the project (gintason)
   cd ~/Desktop/oam-platform/oam-mobile
   npm install                    # picks up expo-apple-authentication
   ```
2. **Deploy the backend update first** (`oam-store-release-backend.zip`).
   The app's new "Delete account" screen and Sign in with Apple need it.
3. **Android push notifications (Firebase).** Without this the app still works;
   Android users just don't get push notifications.
   1. Go to <https://console.firebase.google.com> → *Add project* (or use an existing one).
   2. Choose *Add app* → **Android** → package name `com.oam.mobile`.
   3. Download **google-services.json** and put it in the `oam-mobile` folder,
      next to `app.json`. It's picked up automatically.
   4. In Firebase → ⚙ *Project settings* → *Service accounts* → *Generate new
      private key*, then run `eas credentials -p android` → *Google Service
      Account* → *Push Notifications (FCM V1)* → upload that file.
4. **Apple** (needs the paid Apple Developer Program, $99/yr):
   1. Go to <https://appstoreconnect.apple.com> → *Apps* → **+** → *New App*.
      - Platform: iOS. Name: "O.A.M" (or the name you want shown).
      - Bundle ID: **com.oam.mobile**. SKU: `oam-mobile`.
   2. Note the **Apple ID** number shown under *App Information*. `eas submit`
      may ask for it.
   EAS creates the certificates, provisioning profile, push key and the
   *Sign in with Apple* capability for you during the first iOS build. Answer
   "yes" when it offers.

---

## 1. Android — build the .aab

```bash
eas build -p android --profile production
```
- **Signing key:** on the first build EAS offers to *generate a new Android
  Keystore*. Say yes. Then back it up: `eas credentials -p android` →
  *Download keystore*, and store it somewhere safe. Every future update must be
  signed with the same key.
- **Version numbers:** the version code goes up automatically on every build
  (managed by EAS).
- **The file:** when the build finishes, download the `.aab` from the link EAS
  prints (or from expo.dev → *Builds*).

### 1a. Google Play Console — create the app and fill "App content"
Go to <https://play.google.com/console> → *Create app* → name "O.A.M",
type *App*, *Free*. Then, under *Policy → App content*:

| Item | What to enter |
|---|---|
| Privacy policy | `https://oam-app.com/privacy` |
| App access | "All or some functionality is restricted" → give a **test login** (email + password) for reviewers |
| Ads | No ads |
| Content rating | Fill the questionnaire (financial/marketplace app, no violence) |
| Target audience | 18+ (the app handles money) |
| Data safety | See the table below |
| Account deletion URL | `https://oam-app.com/delete-account` |
| Financial features | Declare: mobile money / wallet, money transfer, bill payments |

**Data safety — what the app collects:**

| Data | Collected | Why |
|---|---|---|
| Name, email address, phone number | Yes | Account management |
| Precise and approximate location | Yes | Nearby artisans/listings, delivery tracking |
| Photos and videos | Yes (user uploads) | Listings, verification, artisan work videos |
| Financial info (purchase history, payment info) | Yes | Payments, wallet, withdrawals |
| Device or other IDs (push token) | Yes | Notifications |
| Messages | Yes | In-app chat |

- **Encryption:** all data is encrypted in transit.
- **Deletion:** users can request deletion, in the app (Profile → Delete
  account) or at <https://oam-app.com/delete-account>.

### 1b. Internal testing (fastest, up to 100 testers, no review wait)
1. In Play Console: *Testing → Internal testing → Testers*, create an email
   list of your testers.
2. *Create new release* → upload the **.aab** → *Next* → *Save* → *Start
   rollout*. The **first upload must be done by hand here**; Google doesn't
   allow the very first one through the API.
3. Testers open the opt-in link shown on that page and install from the Play Store.

### 1c. Closed testing
1. *Testing → Closed testing* → create a track (or use "Alpha") → add testers
   (an email list or a Google Group).
2. Release: *Promote release* from Internal testing, or from your Mac:
   ```bash
   eas submit -p android --profile closed --latest
   ```
   For `eas submit` you need a Play service account key once: Play Console →
   *Setup → API access* → create a service account with "Release manager"
   rights, download its JSON, and give it to `eas submit` when asked.
3. **If your Play developer account is a *personal* account** created after
   Nov 2023, Google requires **at least 12 testers opted in for 14 days in a
   row** in closed testing before you can apply for production. Organisation
   accounts don't have this rule.

### 1d. Production
1. Promote the tested release to *Production*, or:
   ```bash
   eas submit -p android --profile production --latest
   ```
   This creates a **draft** production release, so nothing goes live by accident.
2. In Play Console, open the draft, choose a **staged rollout** (e.g. 20%),
   then *Send for review*. The first review usually takes a few days.

---

## 2. iOS — build the .ipa and send it to TestFlight

```bash
eas build -p ios --profile production
eas submit -p ios --latest
```
Or in one go: `eas build -p ios --profile production --auto-submit`.

- **Signing:** on the first build, sign in with your Apple Developer account
  when asked, and let EAS create the certificate, profile and push key.
- **Processing:** after the upload, App Store Connect takes about 10–30 min. The
  build then appears under *TestFlight*.
- **Export compliance:** already answered in the app ("no non-exempt
  encryption"), so there's no question to click through.
- **Internal testers** (people in your App Store Connect team, up to 100) can
  install via the TestFlight app straight away.
- **External testers** (up to 10,000, by email or a public link) need a short
  *Beta App Review* first. Fill *Test Information*: a feedback email, a demo
  account and a short description.

**Before submitting for App Store review:**
- *App Privacy* questions: answer them like the Data safety table above.
- *App Review Information*: a demo account, plus a note explaining that this is
  a Nigerian multi-service app. Bills, airtime, deliveries, travel and
  marketplace goods are real-world goods and services.
- Screenshots: **6.9" iPhone** (1320×2868), at least 3. iPad screenshots
  aren't needed: the app is now iPhone-only.
- Support URL `https://oam-app.com/help`; privacy URL `https://oam-app.com/privacy`.

---

## 3. Later updates

- **JS-only changes** (most fixes): `eas update --branch production --message "…"`.
  These reach installed apps of the same version within minutes; no store review.
- **Native changes** (new native packages, permissions, icons, app.json
  plugins): bump `"version"` in `app.json` (e.g. 1.0.1), then build and submit
  again with the commands above.

---

## What this release changed in the app (for the reviewers' checks)

- **Sign in with Apple:** on iOS, next to Google. Apple requires this when
  Google sign-in is offered (guideline 4.8).
- **Delete account:** Profile → Delete account. Required by Apple (5.1.1(v))
  and Google Play. There's also a public page at `/delete-account`.
- **Android permissions:** broad photo/video storage access removed. The
  system photo picker is used instead (Play's photo & video permissions policy).
- **Icons:** new Android adaptive icon that fits every launcher shape, and a
  proper notification icon.
- **iOS privacy manifest:** declared, as Apple requires.
- **iPhone-only:** no iPad build, so no iPad screenshots or iPad review.
- **Submit profiles:** `internal`, `closed` and `production` in `eas.json`.
