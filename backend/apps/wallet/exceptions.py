"""Domain errors for the ledger/wallet."""


class WalletError(Exception):
    """Base class for wallet/ledger errors."""


class UnbalancedJournal(WalletError):
    """Debits and credits did not sum equal (or were non-positive)."""


class InsufficientFunds(WalletError):
    """A debit would push a user wallet below zero (overdraft blocked)."""


class UnsupportedCurrency(WalletError):
    """Currency is not in settings.SUPPORTED_CURRENCIES."""


class CurrencyMismatch(WalletError):
    """A posting's currency does not match the journal/account currency."""
