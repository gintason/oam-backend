"""Imports every adapter module so its @register(...) runs at startup."""
import importlib
import logging

logger = logging.getLogger("integrations")

PROVIDER_MODULES = [
    "integrations.travel.travelpayouts.adapter",
    "integrations.delivery.ubereats.adapter",
    "integrations.remittance.wise.adapter",
    "integrations.remittance.lemfi.adapter",
    "integrations.remittance.remitly.adapter",
    "integrations.remittance.taptap.adapter",
    "integrations.vtu.generic.adapter",
    "integrations.vtu.mock",
    "integrations.vtu.vtung.adapter",            # NEW (real VTU.ng)
    "integrations.payments.paystack.adapter",
    "integrations.payments.flutterwave.adapter",
    "integrations.payments.mock",
    "integrations.payouts.mock",
    "integrations.payouts.paystack.adapter",
    "integrations.giftcards.g2a.adapter",
    "integrations.hotels.klook.adapter",
]


def autodiscover() -> None:
    for module_path in PROVIDER_MODULES:
        try:
            importlib.import_module(module_path)
        except Exception as exc:  # pragma: no cover
            logger.warning("Could not load provider module %s: %s", module_path, exc)
