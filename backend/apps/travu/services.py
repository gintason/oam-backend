"""
Travu Africa intercity bus API client.

All external HTTP to Travu is encapsulated here. Keys/URLs come from settings /
env; every provider field that can arrive as an int OR a string (trip_id,
order_id, origin_id, destination_id, boarding_at, fare, …) is normalised before
it leaves this module, so the rest of the app only ever sees clean strings/floats.

Env / settings:
    TRAVU_BEARER_TOKEN   required — Bearer token for check_trip / book_trip
    TRAVU_MODE           "test" (default) or "live" — picks the base URL
    TRAVU_AGENT_EMAIL    default agent_email used for bookings
"""
from __future__ import annotations

import logging
import os

import requests

try:
    from django.conf import settings
except Exception:  # allows importing the module outside Django for tests
    settings = None

logger = logging.getLogger(__name__)

TEST_BASE = "https://api.travu.africa/test/api/v1"
LIVE_BASE = "https://api.travu.africa/api/v1"
STATES_URL = "https://travu.africa/extra/api/states"

# Valid Travu state strings (UPPERCASE), for validation on our side.
STATES = [
    "ABIA", "ADAMAWA", "AKWA IBOM", "ANAMBRA", "BAUCHI", "BAYELSA", "BENUE",
    "BORNO", "CROSS RIVER", "DELTA", "EBONYI", "EDO", "EKITI", "ENUGU", "GOMBE",
    "IMO", "JIGAWA", "KADUNA", "KANO", "KATSINA", "KEBBI", "KOGI", "KWARA",
    "LAGOS", "NASARAWA", "NIGER", "OGUN", "ONDO", "OSUN", "OYO", "PLATEAU",
    "RIVERS", "SOKOTO", "TARABA", "YOBE", "ZAMFARA", "FCT (ABUJA)", "LOME",
    "COTONOU", "ACCRA",
]


class TravuError(Exception):
    """Raised for any Travu API failure (network, non-JSON, or error:true)."""


def _cfg(name: str, default: str = "") -> str:
    val = getattr(settings, name, None) if settings is not None else None
    return val or os.environ.get(name, default)


def _base_url() -> str:
    mode = (_cfg("TRAVU_MODE", "test") or "test").lower()
    return LIVE_BASE if mode == "live" else TEST_BASE


# ---- safe casters (operators return ints OR strings interchangeably) --------
def s(v) -> str:
    return "" if v is None else str(v).strip()


def f(v) -> float:
    try:
        return float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


def i(v) -> int:
    try:
        return int(float(str(v).replace(",", "").strip()))
    except (TypeError, ValueError):
        return 0


class TravuClient:
    def __init__(self, token: str | None = None, base_url: str | None = None, timeout: int = 30):
        self.token = token or _cfg("TRAVU_BEARER_TOKEN")
        self.base_url = (base_url or _base_url()).rstrip("/")
        self.timeout = timeout

    # -------------------------------------------------- low level
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            resp = requests.post(url, json=payload, headers=self._headers(), timeout=self.timeout)
        except requests.RequestException as exc:
            logger.warning("Travu network error on %s: %s", path, exc)
            raise TravuError("Could not reach the bus service. Please try again.") from exc

        try:
            data = resp.json()
        except ValueError:
            raise TravuError(f"Bus service returned an unexpected response (HTTP {resp.status_code}).")

        is_error = isinstance(data, dict) and (data.get("error") is True)
        if resp.status_code >= 400 or is_error:
            msg = "Bus request failed."
            if isinstance(data, dict):
                msg = s(data.get("message")) or s(data.get("info")) or msg
            raise TravuError(msg)
        return data

    # -------------------------------------------------- public API
    def get_states(self):
        """Reference list of states/terminals (no auth)."""
        try:
            resp = requests.get(STATES_URL, timeout=self.timeout)
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            raise TravuError("Could not load states.") from exc

    def check_trips(self, *, departure_state: str, destination_state: str,
                    trip_date: str, sort: str = "date") -> list[dict]:
        """
        Available trips between two states on a date. Always uses sort="date" to
        get a single flat, chronologically ordered list under "data".
        Returns a list of normalised trip dicts.
        """
        payload = {
            "departure_state": s(departure_state).upper(),
            "destination_state": s(destination_state).upper(),
            "trip_date": s(trip_date),
            "sort": sort or "date",
        }
        data = self._post("check_trip", payload)
        raw = data.get("data") if isinstance(data, dict) else None
        trips = raw if isinstance(raw, list) else []
        return [self._normalize_trip(t) for t in trips if isinstance(t, dict)]

    def book_trip(self, *, seat_numbers, amount_per_seat, passengers: list[dict],
                  origin_id, destination_id, boarding_at, trip_id, trip_date,
                  order_id, provider, agent_email: str | None = None) -> dict:
        """
        Reserve seats. passengers[0] MUST have is_primary=True and positions map
        1:1 to seat_numbers. Returns the normalised booking confirmation.
        """
        payload = {
            "seat_numbers": s(seat_numbers),
            "amount_per_seat": s(amount_per_seat),
            "agent_email": agent_email or _cfg("TRAVU_AGENT_EMAIL"),
            "passengers": passengers,
            "origin_id": s(origin_id),
            "destination_id": s(destination_id),
            "boarding_at": s(boarding_at),
            "trip_id": s(trip_id),
            "trip_date": s(trip_date),
            "order_id": s(order_id),
            "provider": s(provider),
        }
        data = self._post("book_trip", payload)
        return self._normalize_booking(data)

    # -------------------------------------------------- normalisers
    @staticmethod
    def _normalize_trip(t: dict) -> dict:
        prov = t.get("provider") or {}
        return {
            "provider_name": s(prov.get("name")),
            "provider_short_name": s(prov.get("short_name")),
            "provider_logo": s(prov.get("logo")),
            "trip_id": s(t.get("trip_id")),
            "trip_no": s(t.get("trip_no")),
            "trip_date": s(t.get("trip_date")),
            "departure_time": s(t.get("departure_time")),
            "origin_id": s(t.get("origin_id")),
            "destination_id": s(t.get("destination_id")),
            "narration": s(t.get("narration")),
            "fare": f(t.get("fare")),
            "total_seats": i(t.get("total_seats")),
            "available_seats": t.get("available_seats") or [],
            "blocked_seats": t.get("blocked_seats") or [],
            "special_seats": t.get("special_seats") or [],
            "special_seats_fare": s(t.get("special_seats_fare")),
            "order_id": s(t.get("order_id")),
            "departure_terminal": s(t.get("departure_terminal")),
            "destination_terminal": s(t.get("destination_terminal")),
            "vehicle": s(t.get("vehicle")),
            "boarding_at": s(t.get("boarding_at")),
            "departure_address": s(t.get("departure_address")),
            "destination_address": s(t.get("destination_address")),
        }

    @staticmethod
    def _normalize_booking(d: dict) -> dict:
        seats = d.get("seat_details") or []
        return {
            "order_status": s(d.get("order_status")),
            "order_id": s(d.get("order_id")),
            "order_name": s(d.get("order_name")),
            "order_email": s(d.get("order_email")),
            "phone_number": s(d.get("phone_number")),
            "order_amount": f(d.get("order_amount")),
            "trip_id": s(d.get("trip_id")),
            "origin_id": s(d.get("origin_id")),
            "destination_id": s(d.get("destination_id")),
            "order_ticket_date": s(d.get("order_ticket_date")),
            "order_total_seat": i(d.get("order_total_seat")),
            "order_seats": s(d.get("order_seats")),
            "amount_per_seat": f(d.get("amount_per_seat")),
            "order_number": s(d.get("order_number")),
            "vehicle_no": s(d.get("vehicle_no")),
            "narration": s(d.get("narration")),
            "departure_terminal": s(d.get("departure_terminal")),
            "destination_terminal": s(d.get("destination_terminal")),
            "provider": s(d.get("provider")),
            "seat_details": [
                {
                    "fare": f(x.get("fare")),
                    "title": s(x.get("title")),
                    "age": s(x.get("age")),
                    "sex": s(x.get("sex")),
                    "name": s(x.get("name")),
                    "email": s(x.get("email")),
                    "phone": s(x.get("phone")),
                    "blood": s(x.get("blood")),
                    "next_of_kin": s(x.get("next_of_kin")),
                    "next_of_kin_phone": s(x.get("next_of_kin_phone")),
                    "seat_number": s(x.get("seat_number")),
                }
                for x in seats if isinstance(x, dict)
            ],
            "raw": d,
        }


# Module-level singleton for convenience: from apps.travu.services import travu
travu = TravuClient()
