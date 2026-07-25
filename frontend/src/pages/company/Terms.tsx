import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import PageShell, { Block, Notice } from "./PageShell";

/**
 * DRAFT terms.
 *
 * These describe how the platform genuinely behaves — wallet mechanics, tiers,
 * the contact gate, what is and isn't refundable. That accuracy is the part
 * that's hard to outsource, and it's what a lawyer will want as a starting
 * point.
 *
 * What they are NOT is a reviewed legal document. A payment platform holding
 * customer balances in Nigeria touches CBN rules on payment services and the
 * Nigeria Data Protection Act, and clauses drafted without advice are often
 * unenforceable exactly when they'd matter. The banner below is deliberately
 * visible in the product until a lawyer has been through it — quiet TODOs in
 * code are how placeholder legal text reaches production.
 */
export default function Terms() {
  return (
    <PageShell
      title="Terms of Service"
      intro="The agreement between you and O.A.M Motors Limited when you use OAM."
      updated="23 July 2026"
    >
      <Notice>
        <div className="flex gap-2.5">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warn" />
        </div>
      </Notice>

      <Block heading="1. Who we are">
        <p>
          OAM is operated by <strong>O.A.M Motors Limited</strong>, a company registered in
          Nigeria (RC <span className="font-mono text-[12px]">[TO CONFIRM]</span>), registered
          address <span className="font-mono text-[12px]">[TO CONFIRM]</span>. In these terms
          "we", "us" and "OAM" mean that company; "you" means the account holder.
        </p>
      </Block>

      <Block heading="2. Your account">
        <p>
          You must be <strong>18 or over</strong> and provide accurate details. One person,
          one account. You are responsible for keeping your password and one-time codes
          private — we will never ask you for them, and anyone who does is not from OAM.
        </p>
        <p>
          Tell us immediately at{" "}
          <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline">
            info@oam-app.com
          </a>{" "}
          if you believe someone else has access to your account.
        </p>
      </Block>

      <Block heading="3. Your wallet">
        <p>
          Your wallet balance is money we hold for you. It is not a bank deposit, it earns no
          interest, and it is not covered by deposit insurance.
        </p>
        <p>
          You can withdraw your balance to a bank account in your own name at any time,
          subject to the checks below. Card payments credit your wallet first and the wallet
          then pays for your purchase — so if a delivery fails, the money remains yours as a
          wallet balance.
        </p>
        <p>
          <strong>Transfers between OAM users are final.</strong> Check the recipient's name,
          shown before you confirm, because a completed transfer cannot be reversed.
        </p>
      </Block>

      <Block heading="4. Bills, airtime and electricity">
        <p>
          We buy these from licensed third-party providers on your instruction. The price you
          are shown is the price you pay; our margin is included in it and no separate fee is
          added.
        </p>
        <p>
          <strong>Check the recipient before you confirm.</strong> Airtime sent to a mistyped
          number, or units sent to the wrong meter, generally cannot be recovered — the value
          has already been delivered to that number or meter.
        </p>
        <p>
          Where a purchase fails at the provider, the amount is returned to your wallet.
          Where a provider is delayed, the order remains open until it settles; buying again
          during a delay means paying twice, and we cannot refund a duplicate purchase you
          chose to make.
        </p>
      </Block>

      <Block heading="5. Marketplace and Home Services">
        <p>
          <strong>OAM is not a party to these deals.</strong> We provide the listing and the
          messaging; the agreement is between buyer and seller, or customer and artisan. We
          do not verify items, inspect work, hold payment in escrow, or guarantee quality.
        </p>
        <p>
          You are responsible for what you list, and for meeting your side of anything you
          agree. Contact details are exchanged only when a seller or artisan accepts an
          enquiry.
        </p>
        <p>You may not list, among other things:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>anything illegal to sell in Nigeria</li>
          <li>weapons, controlled drugs, or counterfeit goods</li>
          <li>stolen property, or anything you don't have the right to sell</li>
          <li>services you are not qualified or licensed to provide</li>
        </ul>
        <p>
          We may remove listings and suspend accounts where these terms are broken. Paid plan
          fees are generally not refundable where an account is suspended for breach.
        </p>
      </Block>

      <Block heading="6. Paid plans and boosts">
        <p>
          Seller subscriptions (Premium and Pro) and artisan boosts are{" "}
          <strong>one-off payments</strong> for a stated period. They do not renew
          automatically, and no card is stored for future charges.
        </p>
        <p>
          Featured placement improves where you appear in search. It does not guarantee
          sales, enquiries, or any particular level of interest.
        </p>
        <p>
          Prices may change; any change applies to new purchases, not to a period you have
          already paid for.
        </p>
      </Block>

      <Block heading="7. Travel bookings">
        <p>
          Flights, hotels, car hire and airport transfers are booked with{" "}
          <strong>third-party partners</strong>, on their sites and under their terms. Your
          contract for those bookings is with them, not with OAM. We earn a referral
          commission at no extra cost to you.
        </p>
      </Block>

      <Block heading="8. Things we can't promise">
        <p>
          We work to keep OAM available and accurate, but we depend on banks, card processors
          and utility providers whose systems occasionally fail. We do not promise
          uninterrupted service.
        </p>
        <p>
          Nothing here limits our liability for fraud, or for anything that cannot lawfully be
          limited under Nigerian law.{" "}
          <span className="font-mono text-[12px]">[TO CONFIRM — a lawyer should draft the
          liability and indemnity wording; a limitation clause written without advice tends
          to fail precisely when it is relied on.]</span>
        </p>
      </Block>

      <Block heading="9. Closing your account">
        <p>
          You may close your account at any time; withdraw your balance first, as we may need
          to complete identity checks before releasing funds.
        </p>
        <p>
          We may suspend or close an account where we reasonably suspect fraud, illegal use,
          or a serious breach of these terms. Where we do, we will return any balance that is
          rightfully yours, subject to any legal obligation preventing it.
        </p>
      </Block>

      <Block heading="10. Changes, law and disputes">
        <p>
          We may update these terms. Material changes will be notified by email or in the app
          before they take effect.
        </p>
        <p>
          These terms are governed by the laws of the{" "}
          <strong>Federal Republic of Nigeria</strong>. Please contact us first — most
          problems are settled quickly by email.{" "}
          <span className="font-mono text-[12px]">[TO CONFIRM — dispute resolution and
          jurisdiction wording.]</span>
        </p>
        <p>
          See also our{" "}
          <Link to="/privacy" className="font-medium text-brand-green underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Block>
    </PageShell>
  );
}
