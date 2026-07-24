OAM — Withdrawal float: keeping customer money separate from earnings
=====================================================================
INSTALL
  cd /Users/mac/Desktop/oam-platform/backend
  unzip -o oam_float_check.zip -d apps/wallet
  python3 manage.py float_check

FIRST, THE HARD TRUTH
  You asked that "only earnings go to the bank account, not users' payments."
  Paystack cannot do that. It settles everything it collects and has no idea
  which naira is your margin and which is a customer's wallet balance. The
  separation has to happen on YOUR side. This command is how you see it.

OPERATOR WALLETS ARE EXCLUDED
  Swept earnings land in your admin wallet, so counting every wallet as a
  customer liability would inflate the float you think you must hold. Wallets
  belonging to is_staff users are reported separately as "In operator wallets"
  and are treated as YOURS, not as money owed.

  On your first run this mattered: ₦150 "owed" was really your ₦110 (mostly
  swept earnings) plus Peye's ₦40. True customer liability was ₦40.

WHAT float_check TELLS YOU
    Owed to customers    — the sum of every wallet balance. Withdrawable at any
                           moment. This is a LIABILITY, not income, even though
                           the cash is sitting in your bank.
    Your earnings        — the margin captured to oam:revenue. Genuinely yours.
    Safe to take out     — the earnings figure, and only that.

WHY YOUR WITHDRAWAL TEST FAILED
  Paystack Transfers pay out from your PAYSTACK BALANCE. Auto-settlement sweeps
  that balance into Fidelity as it arrives. So when a customer withdraws there
  is nothing left to pay them — the "Not enough money / rejected (400)" you saw,
  even though the money genuinely exists in your bank.

PROVIDER FLOAT IS NOW COUNTED
  Selling ₦1,000 of electricity costs ₦990 at vtu.ng, and that ₦990 has to be
  replaced to keep selling. It settles to you in the SAME payout as your ₦10
  margin, so taking it out as profit leaves you unable to restock — deliveries
  then fail with charged customers, which is the worst failure you can have.

  float_check now shows your provider cost over the last 30 days (change with
  --days) and holds it back. Add your own buffer with --reserve:

      python3 manage.py float_check
      python3 manage.py float_check --days 7
      python3 manage.py float_check --reserve 50000

THE SETUP YOU CHOSE — MANUAL SETTLEMENT

  1. Paystack dashboard -> Settings -> Settlements -> switch to MANUAL
     Collections then stay in your Paystack balance, which is where customer
     withdrawals are paid from.

  2. Confirm TRANSFERS is enabled on your account (a separate approval from
     collections, usually needs your business documents). Withdrawals fail
     without it no matter what your balance is.

  3. Monthly: run float_check, settle out the "Yours to take out" figure, leave
     the rest.

  At ₦10-20 margin per sale this is a monthly job, not a daily one.

OTHER OPTIONS, FOR REFERENCE
  1. MANUAL SETTLEMENT (simplest, matches what you asked for)
     In the Paystack dashboard, switch settlements from automatic to manual, or
     lengthen the cycle. Collections then STAY in your Paystack balance, which
     is exactly where withdrawals are paid from. You periodically settle out
     only your earnings — the figure this command prints.
     Cost: money sits at Paystack rather than your bank.

  2. KEEP AUTO-SETTLEMENT, FUND A FLOAT
     Leave settlement alone and transfer a working float back INTO Paystack to
     cover withdrawals. Simple to reason about, but you're moving money twice
     and paying transfer fees each way.

  3. HYBRID (what most operators end up doing)
     Auto-settle, but keep a float in Paystack sized to a few days of expected
     withdrawals. Run float_check regularly and top up when it dips.

  I'd start with (1) while volumes are small — it's one dashboard setting and
  it makes withdrawals work immediately. Revisit when the amounts get large
  enough that you don't want them sitting at a payment processor.

BEFORE REAL CUSTOMERS — WORTH CHECKING
  Holding customer balances is regulated activity in Nigeria. Depending on how
  you structure this, wallet balances may bring CBN licensing obligations
  (PSSP / MMO and similar), and there are rules about keeping customer funds in
  segregated accounts rather than mixed with operating cash. I'm not a lawyer or
  an accountant and can't advise on which applies to you — but it's worth a
  conversation with someone who can before you take real deposits, because it
  shapes your account structure, and restructuring later is painful.

  The safest pattern regardless of licensing: keep customer float in a separate
  account from operating money, and move only earnings into the operating one.
