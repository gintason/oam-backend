# OAM Platform — Provider Integration Matrix

Two integration *styles*, chosen per service:

| Style | Meaning | Touches our ledger? | Adapter base |
|---|---|---|---|
| **API** | Money/order flows through us; we get webhooks/status | Yes | `interfaces.*Provider` |
| **AFFILIATE** | We deep-link the user to the partner & earn commission | No (we log a click) | `affiliate.AffiliateProvider` |

## Current decisions

| Service (category) | Provider key | Style | Status |
|---|---|---|---|
| Payments (`payments`) | `paystack`, `flutterwave` | API | adapters land in Phase 1 |
| Bills/VTU (`vtu`) | `default` (your aggregator) | API | skeleton ready |
| Hotels (`hotels`) | `hotelbeds` (or `booking`) | API | skeleton ready (X-Signature auth) |
| Flights (`flights`) | `travelpayouts` | AFFILIATE | link builder ready |
| Car hire (`carhire`) | `travelpayouts` | AFFILIATE | link builder ready |
| Food delivery (`delivery`) | `ubereats` | AFFILIATE | link builder ready |
| Money transfer (`remittance`) | `wise`, `lemfi`, `remitly`, `taptap` | AFFILIATE | link builders ready; API mode later |

## How a domain feature uses a provider

**Affiliate (flights, car hire, food, remittance):**
```python
from apps.affiliates.services import AffiliateService

link = AffiliateService.link(
    category="flights", user=request.user,
    params={"origin": "LOS", "destination": "LHR"},
)
# -> records an AffiliateClick, returns a tracked URL with our sub_id
return Response({"redirect_url": link.url})
```

**API (payments, VTU, hotels):**
```python
from integrations.base import ProviderFactory

gateway = ProviderFactory.get("payments")        # resolves "paystack"
charge = gateway.initialize_charge(...)          # money flows -> ledger postings
```

## Switching a provider

Change one env var — no code change:
```
DEFAULT_PROVIDER_REMITTANCE=lemfi    # was wise
```

## What you must obtain (per dashboard)

- **Travelpayouts:** affiliate *marker* (and API token if using their data/widgets).
- **Uber Eats:** affiliate tracked URL / code (often via Impact or Awin by region).
- **Wise / Lemfi / Remitly / Taptap:** affiliate/referral link from each program;
  API tokens only when transactional partnership is granted.
- **Hotelbeds:** API key + secret (signature auth).
- **VTU aggregator:** base URL + API key/secret for your chosen provider.
- **Paystack / Flutterwave:** secret/public keys (Phase 1).
