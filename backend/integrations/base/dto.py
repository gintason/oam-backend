"""
Typed data-transfer objects exchanged between domain services and adapters.

Adapters translate provider JSON <-> these DTOs, so the domain layer never
sees a provider's raw field names. Add more as each phase needs them.
"""
from dataclasses import asdict, dataclass, field
from decimal import Decimal
from enum import Enum


class TxnStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    REVERSED = "reversed"


@dataclass(slots=True)
class StatusResult:
    status: TxnStatus
    provider_reference: str
    raw: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return asdict(self)


# --- Payments ---
@dataclass(slots=True)
class ChargeInit:
    authorization_url: str
    access_code: str
    provider_reference: str
    raw: dict = field(default_factory=dict)


@dataclass(slots=True)
class ChargeStatus:
    status: TxnStatus
    amount: Decimal
    currency: str
    provider_reference: str
    raw: dict = field(default_factory=dict)


# --- Remittance ---
@dataclass(slots=True)
class QuoteRequest:
    source_currency: str
    target_currency: str
    amount: Decimal


@dataclass(slots=True)
class QuoteResult:
    rate: Decimal
    fee: Decimal
    payout_amount: Decimal
    raw: dict = field(default_factory=dict)


@dataclass(slots=True)
class TransferRequest:
    amount: Decimal
    currency: str
    beneficiary: dict
    metadata: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class TransferResult:
    status: TxnStatus
    provider_reference: str
    raw: dict = field(default_factory=dict)


# --- VTU (airtime / data / bills) ---
@dataclass(slots=True)
class VTURequest:
    service: str          # "airtime" | "data" | "electricity" | "cable"
    operator: str         # e.g. "MTN", "DSTV"
    recipient: str        # phone / meter / smartcard number
    amount: Decimal
    plan_code: str = ""
    request_id: str = ""      # ← add this line


@dataclass(slots=True)
class VTUResult:
    status: TxnStatus
    provider_reference: str
    raw: dict = field(default_factory=dict)


# --- Affiliate (deep-link / handoff) ---
@dataclass(slots=True)
class AffiliateLink:
    """
    A tracked hand-off link to a partner (Travelpayouts, Uber Eats, Wise, ...).

    `sub_id` is our attribution key — usually an AffiliateClick id — which the
    partner echoes back in postbacks/reports so we can match a commission to
    the user who generated it.
    """
    program: str                 # e.g. "travelpayouts:flights", "ubereats"
    url: str                     # the final tracked URL to send the user to
    sub_id: str = ""             # our attribution marker
    widget_code: str = ""        # optional HTML/JS embed (search widgets etc.)
    raw: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return asdict(self)
