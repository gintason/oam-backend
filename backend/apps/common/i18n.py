"""
Language helpers shared by the API and the clients.

The single source of truth for the supported languages is settings.LANGUAGES;
this module just adds direction (LTR/RTL) and a serialisable description that
the web and mobile apps consume to build their language switchers.
"""
from django.conf import settings
from django.utils.translation import get_language


def is_rtl(language_code: str | None) -> bool:
    """True if the given language renders right-to-left (Arabic, Urdu)."""
    if not language_code:
        return False
    base = language_code.split("-")[0].lower()
    return base in settings.RTL_LANGUAGES


def current_direction() -> str:
    """'rtl' or 'ltr' for the request's active language."""
    return "rtl" if is_rtl(get_language()) else "ltr"


def supported_languages() -> list[dict]:
    """
    Serialisable list of supported languages for the clients' language picker.

    Each entry: {code, name, dir}. The frontend uses `dir` to flip layout
    (HTML dir="rtl" on web, I18nManager.forceRTL on React Native).
    """
    return [
        {"code": code, "name": str(name), "dir": "rtl" if is_rtl(code) else "ltr"}
        for code, name in settings.LANGUAGES
    ]
