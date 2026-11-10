# VTU.ng Partner API — reference notes

> **Reference only.** This file is a transcription of VTU.ng's public developer documentation, collected on **2026-11-10**.
> No integration code was written. No API keys were used or created, and no authenticated API calls were made.
> Everything below is copied from the official OpenAPI spec unless a line is marked **NOT FOUND** or *(observed)*.

## Sources

| What | URL | Notes |
|---|---|---|
| Interactive API reference (Stoplight Elements) | `https://vtu.ng/docs/api` | HTML page with the OpenAPI document embedded inline. `https://api.vtu.ng/docs/api` serves the same spec. |
| **Raw OpenAPI 3.1.2 spec** | `https://vtu.ng/docs/api.json` | Saved verbatim as [`docs/vtung/openapi.json`](vtung/openapi.json). It is identical to the embedded copy. Spec `info.version` = `1.0.0`. |
| Key management (login required) | `https://app.vtu.ng/profile?tab=developer` | Developer tab: "API Keys", "Webhooks", "Notifications". |
| Error docs referenced by `doc_url` | `https://developer.vtu.ng/docs/errors#<code>` | **Could not be reached** from this environment (connection failed). |

The spec is the source of truth. Re-download it with `curl -L https://vtu.ng/docs/api.json` before you implement anything.

---

## 1. Base URLs

| Environment | Base URL |
|-------------|----------|
| Live | `https://api.vtu.ng/v1` |
| Sandbox | `https://sandbox.vtu.ng/v1` |

- HTTPS is mandatory. Plain HTTP returns `403 https_required`.
- **Keys are environment-locked.** A `vtu_sk_test_` key sent to `api.vtu.ng`, or a live key sent to sandbox, returns `403 environment_mismatch`.
- Rate limits: **300 req/min per key** (live) and **10 req/min per key** (sandbox).

## 2. Authentication

```
Authorization: Bearer vtu_sk_live_a1b2c3d4e5f6...
```

- The API accepts both `Authorization: Bearer <secret key>` and `X-API-Key: <secret key>`. `Authorization: Bearer` is recommended.
- OpenAPI security scheme: `bearer` (`type: http`, `scheme: bearer`). It applies globally.

| Type | Live format | Sandbox format | Access |
|------|------------|----------------|--------|
| **Secret** | `vtu_sk_live_...` | `vtu_sk_test_...` | Full access |
| **Public** | `vtu_pk_live_...` | `vtu_pk_test_...` | No permissions yet |

- Keys are issued as a pair (one secret + one public). Public keys are "reserved for future client-side use" and carry no permissions. **Use the secret key, server-side only.**
- A key is shown **once**, when it is created.
- Up to **5 active keys** per environment.
- Rotating a key revokes the old one immediately. The new key keeps the same scopes and IP allowlist.
- **IP allowlist** (optional, per key): accepts IPv4, IPv6 and IPv4 CIDR ranges. An empty list means unrestricted. A request from an unlisted IP returns `403 ip_not_whitelisted`.
- Account requirements:
  - **Sandbox key:** KYC Tier 2.
  - **Live bill payments:** KYC Tier 2 or Tier 3 **and** an Agent Tier (Silver, Gold or Platinum).
  - **RMB and gift cards:** KYB approval.

### Scopes

This list comes from `GET /v1/scopes`, which returned it without a key.

| Scope | Grants |
|---|---|
| `account:read` | Read your account profile and KYC status |
| `wallet:read` | Read wallet balances |
| `transactions:read` | Read transaction history and details |
| `bills:read` | Read bill plans and run customer verification checks |
| `bills:write` | Purchase airtime, data, electricity, cable TV, education, ePIN, and bet funding |
| `gift_cards:read` / `gift_cards:write` | Gift card catalogue/rates; buy and sell orders |
| `rmb:read` / `rmb:write` | RMB rates/channels/limits; RMB buy orders |

Calling an endpoint without the required scope returns `403 invalid_scope`.

### Authentication / account errors

| Code | HTTP | Cause |
|------|------|-------|
| `authentication_required` | 401 | No API key header present |
| `authentication_failed` | 401 | Key not found, revoked, or expired |
| `environment_mismatch` | 403 | Test key sent to live host (or vice versa) |
| `secret_key_required` | 403 | Public key used on a write endpoint |
| `ip_not_whitelisted` | 403 | Request IP not in the key's IP allowlist |
| `invalid_scope` | 403 | Key lacks required scope |
| `account_suspended` / `account_banned` / `account_deactivated` | 403 | Account state |
| `kyc_tier_insufficient` | 403 | KYC tier too low |
| `kyb_verification_required` | 403 | KYB not approved |
| `agent_tier_required` | 403 | No Agent Tier |
| `https_required` | 403 | Plain HTTP |
| `api_disabled` | 503 | Partner API is temporarily offline |
| `sandbox_disabled` | 503 | Sandbox environment is temporarily offline |

### Error envelope

```json
{"error": {"code": "authentication_failed", "message": "Invalid or revoked API key.", "doc_url": "https://developer.vtu.ng/docs/errors#authentication_failed"}}
```

Validation errors (422, `ValidationException`) use Laravel's shape instead:

```json
{"message": "<errors overview>", "errors": {"<field>": ["<message>", "..."]}}
```

Other error codes that appear in the spec:

| Code | HTTP |
|---|---|
| `insufficient_funds` | 422 |
| `meter_cannot_vend` | 422 |
| `smartcard_not_found` | 422 |
| `verification_failed` | 422 |
| `not_found` | 404 |
| `invalid_request` | 400 — "The provided transaction reference is too long." |
| `idempotency_request_in_progress` | 409 |

## 3. Money

- Every amount, in requests and responses, is in **major units**: `1000` means ₦1,000.00.
- Fields ending in `_formatted`, and `amount.formatted`, are display strings. Do not parse them.
- In the spec the request field `amount` is typed `object` but its example is `1000`. Treat it as a number in naira.

## 4. Idempotency / our request ID

- **All purchase endpoints require the `Idempotency-Key` HTTP header.** This is a header, not a body field. The spec describes it as "Unique key per write request (UUID recommended)."
- Rules:
  - Generate a fresh UUID v4 per transaction.
  - Reuse a key only when retrying the *same* request after a timeout or `5xx`.
  - Keys never expire.
  - Maximum length is 128 characters.
- If you replay a used key, the server returns the cached response with the header `Idempotency-Replayed: true`. No new transaction is created.
- If two requests with the same key arrive at once, the second gets `409 idempotency_request_in_progress`.
- **Partners cannot supply their own reference in the body.** No `request_id`, `client_reference` or `external_reference` field exists. VTU.ng generates `reference` (e.g. `BILL202605090830A120123`).
  - To requery by *our* ID, call `GET /v1/transactions/{Idempotency-Key}?type=bill_payment`. See §6.11.
  - Store our order ID ↔ Idempotency-Key ↔ VTU.ng `reference`.

## 5. Transaction object & status values

Every purchase response is HTTP **201** with this body:

```json
{
  "message": "Your airtime purchase is being processed.",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "reference": "BILL202605090830A120123",
    "type": {"value": "bill_payment", "is_credit": false},
    "status": {"value": "processing", "is_final": false},
    "amount": {"raw": 1000, "formatted": "NGN 1,000.00", "currency": "NGN"},
    "fee": {"raw": 0, "formatted": "NGN 0.00"},
    "net_amount": {"raw": 1000, "formatted": "NGN 1,000.00"},
    "description": "Airtime - MTN (07045461790)",
    "metadata": {"bill_type": "Airtime", "network": "MTN", "phone_number": "07045461790"},
    "failure_reason": null,
    "cancellation_reason": null,
    "timestamps": {"created_at": "2026-05-09T08:30:00.000000Z", "updated_at": "...", "completed_at": null, "failed_at": null, "cancelled_at": null}
  },
  "upgrade_hint": {"current_tier": "...", "next_tier": "...", "message": "..."}
}
```

- `upgrade_hint` is listed as required in the first `anyOf` variant only.
- `GET /transactions/{reference}` returns the same object wrapped in `{"data": {...}}`.
- The transaction object can also contain these optional fields: `is_epin` (bool), `education_exam_pins` (object|null), `epin_cards` (array|null), `gift_card_codes` (array|null).
- `status.value` enum: `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded`. `status.is_final` tells you whether the state is terminal.
- `type.value` enum: `gift_card_sell`, `gift_card_buy`, `crypto_sell`, `crypto_buy`, `rmb_buy`, `bill_payment`, `wallet_topup`, `withdrawal`, `referral_bonus`, `cashback`, `reward_bonus`, `reward_clawback`, `agent_upgrade`, `admin_credit`, `admin_debit`, `ambassador_commission`, `ambassador_referee_bonus`, `ambassador_clawback`.
- **Processing is asynchronous.** The first status is always `processing`. Get the final state from webhooks or by polling `GET /v1/transactions/{reference}` until it is `completed` or `refunded`.
  - The docs also mention `transaction.failed`; failures are followed by a refund.

Possible `message` values per endpoint, from the spec enums:

| Endpoint | `message` values |
|---|---|
| Airtime | `"Airtime purchase successful."`, `"Your airtime purchase is being processed."`, `"Airtime purchase failed. Your wallet has been refunded."`, `"Airtime purchase failed."`, `"Request received."` |
| Data | `"Data purchase successful."`, `"Your data purchase is being processed."`, `"Data purchase failed. Your wallet has been refunded."`, `"Data purchase failed."`, `"Request received."` |

## 6. Endpoints

Paths below are relative to the base URL, so `/bills/airtime` means `https://api.vtu.ng/v1/bills/airtime`.

### 6.1 Bill catalog — service IDs
`GET /bills/catalog?type=<airtime|data|electricity|cable_tv|epin|bet_funding|education>` (`type` is optional)

Returns `{"data": [{type, name, description, providers: [{slug, name, label, service_types?}], meter_types?, subscription_types?, denominations?, pack_size?, max_packs_per_transaction?, endpoints}]}`. Pass the **`slug`** values into purchase and verify requests.

### 6.2 Airtime
`POST /bills/airtime` — header `Idempotency-Key` (required)

| Field | Req | Type | Notes |
|---|---|---|---|
| `phone` | yes | string | Customer phone number. |
| `network` | yes | string | Allowed: `mtn`, `glo`, `airtel`, `t2mobile`. |
| `amount` | yes | number (major units) | Amount to purchase. |
| `ported` | no | boolean | "Set to true if this phone number has been ported to a different network to bypass strict prefix validation." |

- **201:** the transaction envelope from §5.
- **422:** `{"error": {"code": "insufficient_funds", "message": "Insufficient wallet balance for this transaction.", ...}}`, or a validation error.

### 6.3 Data plans (variations)
`GET /bills/data-plans?network=<mtn|glo|airtel|t2mobile|smile>` (`network` is required)

```json
{"data": [{"variation_code": "mtn-1gb-350", "name": "MTN 1GB Daily", "amount": 500, "fixed_price": true}]}
```

In sandbox, `variation_code` values are prefixed `sbx_`.

### 6.4 Data purchase
`POST /bills/data` — header `Idempotency-Key` (required)

| Field | Req | Type | Notes |
|---|---|---|---|
| `phone` | yes | string | |
| `network` | yes | string | Allowed: `mtn`, `glo`, `airtel`, `t2mobile`, `smile`. |
| `variation_code` | yes | string | From `/bills/data-plans`. |
| `ported` | no | boolean | |

- **201:** the envelope. Example metadata: `{"bill_type":"Data","network":"MTN","phone_number":"07045461790","data_plan":"MTN 1GB Daily"}`.
- In sandbox the amount is always 500.00 NGN.

### 6.5 Cable packages (variations)
`GET /bills/cable-packages?provider=<dstv|gotv|startimes>` (`provider` is required)

Returns `{"data": [{"variation_code", "name", "amount", "fixed_price"}]}`. Sandbox codes are prefixed `sbx_`.

### 6.6 Verify smartcard / IUC
`POST /bills/cable-tv/verify-smartcard`

Body: `provider` (required: `dstv`, `gotv` or `startimes`) and `smartcard_number` (required). Results are cached for 10 minutes.

**200:**
```json
{"message": "Smartcard verified successfully.", "verification": {"customer_name": "JOHN DOE", "smartcard_number": "1234567890", "status": null, "due_date": "2026-05-29T00:00:00", "current_bouquet": "DStv Compact", "current_bouquet_price": 19000, "renewal_amount": null, "balance": null, "provider": "dstv", "supports_renewal": true}}
```

- If `renewal_amount` is null, use `current_bouquet_price` as the renewal cost.
- If `supports_renewal` is true, send `subscription_type: renew` in the purchase.
- **422:** `{"error": {"code": "smartcard_not_found", "message": "The smartcard / IUC number entered is not recognised. Please verify it is correct.", ...}}`

### 6.7 Cable TV purchase
`POST /bills/cable-tv` — header `Idempotency-Key` (required)

| Field | Req | Type | Notes |
|---|---|---|---|
| `provider` | yes | string | `dstv`, `gotv`, `startimes`. |
| `smartcard_number` | yes | string | |
| `subscription_type` | no | string | `renew` or `change`. Defaults to `change`. Use `renew` to renew the decoder's current bouquet; do not send `variation_code` with it. |
| `variation_code` | cond. | string | Package ID from `/bills/cable-packages`. Required for `change` and for Startimes. Must not be sent with `renew`. |
| `amount` | no | number | If omitted, the catalog price × `quantity` is charged. If you send a custom amount, `quantity` is treated as 1. |
| `quantity` | no | integer | Months, 1–3. Defaults to 1. |

**201** example metadata:
`{"bill_type":"Cable TV","provider":"DStv","smartcard_number":"1234567890","subscription_type":"New Subscription","customer_name":"JOHN DOE","package_name":"DStv Compact"}`

### 6.8 Verify electricity meter
`POST /bills/electricity/verify-meter`

Body (all fields required):
- `disco_slug`: `abedc`, `aedc`, `bedc`, `eedc`, `ekedc`, `ibedc`, `ikedc`, `jed`, `kaedco`, `kedco`, `phed` or `yedc`
- `meter_number`
- `meter_type`: `prepaid` or `postpaid`

Results are cached for 15 minutes. The docs say "Always call this before submitting a payment."

**200:**
```json
{"message": "Meter verified successfully.", "verification": {"customer_name": "ENGR JOHN DOE", "meter_number": "1234567890", "meter_type": "prepaid", "address": "12 EXAMPLE STREET IKEJA", "customer_arrears": null, "minimum_purchase_amount": 500, "service_band": "A", "account_type": "NMD"}}
```

**422:** `meter_cannot_vend` means the meter was found but cannot be paid. `message` carries the DISCO's reason.

### 6.9 Electricity purchase
`POST /bills/electricity` — header `Idempotency-Key` (required)

Body (all fields required): `disco_slug`, `meter_number`, `meter_type`, `amount`.

**201** example metadata:
`{"bill_type":"Electricity","disco":"IKEDC - Ikeja Electricity Distribution Company","meter_number":"1234567890","meter_type":"prepaid","customer_name":"JOHN DOE","address":"12 Example Street, Lagos"}`

Once the transaction completes, `metadata` contains the delivery fields:
- Prepaid: `electricity_token` (e.g. `"1234 5678 9012 3456 7890"`), `electricity_units`, `kct1`, `kct2`
- When the DISCO returns them: `vat_amount`, `electricity_value`, `tariff_rate`, `debt_amount`, `debt_amount_paid`, `debt_remaining`, `free_units`, `refund_units`

**Webhooks do not include the token.** Fetch it with `GET /transactions/{reference}`.

### 6.10 Betting: verify + fund
- **Verify:** `POST /bills/bet-funding/verify-account`. Body: `provider` (required) and `account_id` (required).
  - 200 (live): `{"message": "Account verified successfully.", "validation": {"name", "username" (nullable), "account_identifier", "provider", "provider_label", "min_payable_amount"}}`
  - 200 (sandbox): `validation` holds `{account_id, account_name: "Sandbox Account", provider, is_valid}`
- **Fund:** `POST /bills/bet-funding`, header `Idempotency-Key` (required). Body: `provider`, `account_id` and `amount`, all required.
  - **201** example metadata: `{"bill_type":"Bet Funding","provider":"SportyBet","account_identifier":"12345678","account_name":"JOHN DOE"}`

### 6.11 Transaction status / requery
`GET /transactions/{reference}` (scope `transactions:read`)

- `{reference}` is VTU.ng's `reference`.
- **Requery by our reference:** send our `Idempotency-Key` value as `{reference}` together with `?type=bill_payment`. The spec says: "When provided and no transaction matches the reference, the lookup falls back to matching by idempotency key for that type."
- **200:** `{"data": <transaction object>}` (see §5).
- **404:** `{"error": {"code": "not_found", "message": "Transaction not found."}}`
- **400:** `invalid_request` — "The provided transaction reference is too long."
- **Sandbox:** this endpoint always returns 404 because sandbox transactions are not stored. Use the purchase response instead.

`GET /transactions` lists transactions, paginated. Query parameters:

| Parameter | Notes |
|---|---|
| `status` | |
| `type` | |
| `currency` | |
| `from` | `YYYY-MM-DD` |
| `to` | `YYYY-MM-DD` |
| `per_page` | 1–100 |
| `deposit_tx_hash` | |

In sandbox the list is always empty.

### 6.12 Wallet balance
`GET /wallet` (scope `wallet:read`)

```json
{"data": [{"id": "uuid", "currency": "NGN", "balance": 88108.54, "balance_formatted": "NGN 88,108.54", "withdrawable_balance": 40487.54, "withdrawable_balance_formatted": "NGN 40,487.54", "status": "active"}]}
```

The sandbox balance is fixed at NGN 1,000,000.00.

### 6.13 Other endpoints in the spec (not detailed here)

- `GET /account`
- `GET /bills/education-plans`
- `GET /bills/discount-rates`
- `GET /bills/epin-stock`
- `GET /bills/epin/vouchers/{id}/image`
- `POST /bills/education/verify-jamb`
- `POST /bills/education`
- `POST /bills/epin`
- `/rmb/buy/*`
- `/gift-cards/*`
- `GET /webhook-events`
- `GET /scopes`

## 7. Webhooks

- Register endpoints in the dashboard under Developer → Webhooks. There is a limit of `max_webhooks: 3`.
- The dashboard shows a **signing secret once**, on creation.
- The dashboard can test-ping endpoints and resend deliveries.
  - Retries: "Maximum resend attempts (3) reached for this event."
  - Resend: "Cannot resend webhooks older than 7 days."
  - Delivery logs are kept for 30 days.

(These dashboard details are *(observed)* in the app.vtu.ng JS bundle `Profile-D_NNLvPp.js`.)

### Events (`GET /v1/webhook-events`)

| Event | Meaning |
|---|---|
| `transaction.completed` | Transaction completed successfully (including bill payments) |
| `transaction.failed` | Transaction moved to failed status |
| `transaction.refunded` | A completed or failed transaction was refunded |
| `transaction.cancelled` | A pending or processing transaction was cancelled |

### Envelope

The envelope fields are `id`, `event`, `api_version`, `created` (unix seconds), `livemode` and `data`.

```json
{
  "id": "evt_example_transaction_completed",
  "event": "transaction.completed",
  "api_version": "2026-05-07",
  "created": 1794282215,
  "livemode": true,
  "data": {
    "object": "transaction",
    "id": "8f7243e0-49c7-4f7c-a7a8-2d4e3f7ac001",
    "reference": "BILL202605090830A120123",
    "type": "bill_payment",
    "type_label": "Bill Payment",
    "status": "completed",
    "amount": 5000, "fee": 50, "net_amount": 4950, "currency": "NGN",
    "description": "Airtime - MTN (07045461790)",
    "completed_at": "2026-05-09T08:30:00+00:00", "failed_at": null,
    "created_at": "2026-05-09T08:28:00+00:00", "cancelled_at": null
  }
}
```

In webhooks, `type` and `status` are plain strings. In REST responses they are `{value, ...}` objects.

`transaction.refunded` has a different `data`:

```json
{"object": "transaction_refund", "refund_id": "d1fb68d1-6c93-4fef-b2f2-15274fcb0f01", "transaction_id": "8f7243e0-49c7-4f7c-a7a8-2d4e3f7ac001", "transaction_reference": "BILL202605090830A120123", "transaction_status": "refunded", "original_amount": 5000, "refunded_amount": 5000, "currency": "NGN", "reason": "Automatic refund after failed settlement", "created_at": "2026-05-09T08:35:00+00:00"}
```

- Check `livemode`. It is `false` for sandbox events.
- Tokens, PINs and codes are never sent in webhooks. Fetch the transaction to get them.

### Signature

- **Header name:** `X-VTU-Signature-256` *(observed)*. The dashboard's "Webhook Registered" dialog says: "Please copy this signing secret immediately. You will use it to verify the `X-VTU-Signature-256` header."
- **NOT FOUND:**
  - the signing algorithm (the name suggests HMAC-SHA256, but this is **unconfirmed**)
  - what is signed (raw body? timestamp?)
  - the encoding (hex/base64, any `sha256=` prefix)
  - the secret's prefix
  - any timestamp or replay-tolerance header
  - other delivery headers (event or delivery ID)

  None of these are in the OpenAPI spec or the public pages. They are probably on `developer.vtu.ng`, which could not be reached. **Confirm with VTU.ng support (support@vtu.ng) or the dashboard before implementing verification.**

## 8. Service IDs (slugs)

| Category | Slugs |
|---|---|
| Airtime networks | `mtn`, `glo`, `airtel`, `t2mobile` |
| Data networks | `mtn`, `glo`, `airtel`, `t2mobile`, `smile` |
| Electricity (`disco_slug`) | `abedc` (Aba), `aedc` (Abuja), `bedc` (Benin), `eedc` (Enugu), `ekedc` (Eko), `ibedc` (Ibadan), `ikedc` (Ikeja), `jed` (Jos), `kaedco` (Kaduna), `kedco` (Kano), `phed` (Port Harcourt), `yedc` (Yola) |
| Electricity `meter_type` | `prepaid`, `postpaid` |
| Cable TV | `dstv`, `gotv`, `startimes` |
| Cable `subscription_type` | `renew`, `change` |
| Betting | `1xbet`, `bangbet`, `bet9ja`, `betking`, `betland`, `betlion`, `betway`, `cloudbet`, `livescorebet`, `merrybet`, `naijabet`, `nairabet`, `sportybet`, `supabet` |
| ePIN networks | `mtn`, `glo`, `airtel`, `t2mobile` (denominations `100`, `200`, `500`, `1000`; `pack_size` 10; max 5 packs/txn) |
| Education | `waec` (`result_checker`, `registration`), `jamb` (`jamb`) |

The live list comes from `GET /v1/bills/catalog`. The table above is the spec's example.

## 9. Sandbox test identifiers

The last 4 digits of the customer identifier decide the outcome:

| Last 4 digits | Outcome | Webhook |
|---|---|---|
| `0000` | refunded | `transaction.refunded` |
| `9999` | stays `processing` | none |
| anything else | completed | `transaction.completed` |

The HTTP response is always 201 `processing`.

Published test identifiers:

| Endpoint | Succeeds | Refunded | Stays `processing` |
|---|---|---|---|
| Airtime / Data (phone) | `09012341234` | `09012340000` | `09012349999` |
| Electricity (meter) | `12345671234` | `12345670000` | |
| Cable TV (smartcard) | `10001234` | `10000000` | |
| Betting (account) | `12341234` | `12340000` | |

On the verify endpoints, an identifier ending `0000` simulates "not found" (422).

---

## Appendix: every URL tried (HTTP status)

All requests were unauthenticated GETs with `curl -L`, made 2026-11-10. `000` means the connection failed and no HTTP response came back.

**app.vtu.ng.** Laravel + Vue SPA. Every path returns the same app shell, so a 200 here does **not** mean a docs page exists.

| URL | Status | Result |
|---|---|---|
| `https://app.vtu.ng/` | 200 | SPA shell |
| `https://app.vtu.ng/docs` | 200 | SPA shell |
| `https://app.vtu.ng/api/docs` | 200 | SPA shell |
| `https://app.vtu.ng/v1/docs` | 200 | SPA shell |
| `https://app.vtu.ng/redoc` | 200 | SPA shell |
| `https://app.vtu.ng/openapi.json` | 200 | HTML, not JSON |
| `https://app.vtu.ng/swagger.json` | 200 | HTML, not JSON |
| `https://app.vtu.ng/api/openapi.json` | 200 | HTML |
| `https://app.vtu.ng/v1/openapi.json` | 200 | HTML |
| `https://app.vtu.ng/developers` | 200 | SPA shell |
| `https://app.vtu.ng/api-docs` | 200 | SPA shell |
| `https://app.vtu.ng/swagger` | 200 | SPA shell |
| `https://app.vtu.ng/docs/api` | 200 | SPA shell |
| `https://app.vtu.ng/site.webmanifest` | 200 | |
| `https://app.vtu.ng/build/assets/main-B-LBwzHv.js` | 200 | JS bundle |
| `https://app.vtu.ng/build/assets/app-CDWDVMhM.js` | 200 | JS bundle |
| `https://app.vtu.ng/build/assets/user-auth-DCC0y1te.js` | 200 | JS bundle |
| `https://app.vtu.ng/build/assets/user-transactions-vKisHUq_.js` | 200 | JS bundle |
| `https://app.vtu.ng/build/assets/vendor-utils-B7gG7qPU.js` | 200 | JS bundle |
| `https://app.vtu.ng/build/assets/Profile-D_NNLvPp.js` | 200 | Developer tab; source of the webhook signature header |

**vtu.ng**

| URL | Status | Result |
|---|---|---|
| `https://vtu.ng/` | 200 | |
| `https://vtu.ng/docs/api` | 200 | **API reference** |
| `https://vtu.ng/docs/api.json` | 200 | **Raw OpenAPI spec** (`application/json`) |
| `https://vtu.ng/migration` | 200 | |
| `https://vtu.ng/docs` | 404 | |
| `https://vtu.ng/docs/` | 404 | |
| `https://vtu.ng/api/docs` | 404 | |
| `https://vtu.ng/v1/docs` | 404 | |
| `https://vtu.ng/redoc` | 404 | |
| `https://vtu.ng/openapi.json` | 404 | |
| `https://vtu.ng/swagger.json` | 404 | |
| `https://vtu.ng/api/openapi.json` | 404 | |
| `https://vtu.ng/v1/openapi.json` | 404 | |
| `https://vtu.ng/developers` | 404 | |
| `https://vtu.ng/api-docs` | 404 | |
| `https://vtu.ng/swagger` | 404 | |
| `https://vtu.ng/docs/webhooks` | 404 | |
| `https://vtu.ng/docs/api/webhooks` | 404 | |
| `https://vtu.ng/docs/api/openapi.json` | 404 | |
| `https://vtu.ng/docs/openapi.json` | 404 | |

**api.vtu.ng**

| URL | Status | Result |
|---|---|---|
| `https://api.vtu.ng/docs/api` | 200 | Same reference page |
| `https://api.vtu.ng/v1/scopes` | 200 | Public metadata, no key needed |
| `https://api.vtu.ng/v1/webhook-events` | 200 | Public metadata, no key needed |
| `https://api.vtu.ng/` | 404 | |
| `https://api.vtu.ng/docs` | 404 | |
| `https://api.vtu.ng/api/docs` | 404 | |
| `https://api.vtu.ng/v1/docs` | 404 | |
| `https://api.vtu.ng/redoc` | 404 | |
| `https://api.vtu.ng/openapi.json` | 404 | |
| `https://api.vtu.ng/swagger.json` | 404 | |
| `https://api.vtu.ng/api/openapi.json` | 404 | |
| `https://api.vtu.ng/v1/openapi.json` | 404 | |
| `https://api.vtu.ng/developers` | 404 | |
| `https://api.vtu.ng/api-docs` | 404 | |
| `https://api.vtu.ng/swagger` | 404 | |
| `https://api.vtu.ng/v1` | 404 | |
| `https://api.vtu.ng/v1/` | 404 | |

**Hosts that could not be reached**

| URL | Status | Result |
|---|---|---|
| `https://docs.vtu.ng/` and `/docs`, `/api/docs`, `/v1/docs`, `/redoc`, `/openapi.json`, `/swagger.json`, `/api/openapi.json`, `/v1/openapi.json`, `/developers`, `/api-docs`, `/swagger`, `/docs/api` | 000 | Proxy 502: the host was allowed but did not answer. It probably does not exist. |
| `https://developer.vtu.ng/`, `/docs`, `/docs/errors`, `/docs/webhooks` | 000 | Connection failed |
| `https://sandbox.vtu.ng/docs/api` | 000 | Blocked by this environment's egress proxy (403) |
| `https://sandbox.vtu.ng/v1/scopes` | 000 | Blocked by this environment's egress proxy (403) |

**Not found anywhere**

- A Postman collection
- Swagger UI / Redoc pages
- Webhook signature algorithm and verification steps (see §7)
