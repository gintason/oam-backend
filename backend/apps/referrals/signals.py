import django.dispatch

# Fired (on transaction commit) whenever a user completes a transaction that
# realised OAM profit. Args: user, oam_profit (Decimal), currency, source_reference.
transaction_settled = django.dispatch.Signal()
