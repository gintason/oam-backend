import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import PageShell, { Block, Notice } from "./PageShell";

/**
 * DRAFT privacy policy.
 *
 * The processing described here is real — it's drawn from what the platform
 * actually stores and which third parties actually receive data. That accuracy
 * matters more than polish, because a policy that misdescribes your processing
 * is worse than none: it's a written record of getting it wrong.
 *
 * The Nigeria Data Protection Act 2023 applies, and it carries obligations
 * (lawful basis, retention, data-subject rights, possible DPO registration)
 * that need proper advice. Hence the visible banner.
 */
export default function Privacy() {
  return (
    <PageShell
      title="Privacy Policy"
      intro="What we collect, why, who else sees it, and what you can ask us to do about it."
      updated="23 July 2026"
    >
      <Notice>
        <div className="flex gap-2.5">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <strong>Draft — not yet reviewed by a lawyer.</strong> The processing described
            below is accurate to how OAM works today, which is the hard part to get right.
            But the <strong>Nigeria Data Protection Act 2023</strong> brings obligations
            around lawful basis, retention periods and possible DPO registration that need
            proper advice before launch.
          </div>
        </div>
      </Notice>

      <Block heading="Who controls your data">
        <p>
          <strong>O.A.M Motors Limited</strong> (RC{" "}
          <span className="font-mono text-[12px]">[TO CONFIRM]</span>) is the data controller.
          For any privacy question or request, email{" "}
          <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline">
            info@oam-app.com
          </a>
          .
        </p>
      </Block>

      <Block heading="What we collect">
        <p><strong>You give us:</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Name, email address and phone number when you register</li>
          <li>Bank account details when you set up a withdrawal</li>
          <li>Meter numbers, smartcard numbers and phone numbers you pay bills for</li>
          <li>Listing details, artisan profile details, and the contact numbers on them</li>
          <li>Messages you send to other users through OAM</li>
        </ul>
        <p><strong>Created as you use OAM:</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Wallet balance and full transaction history</li>
          <li>Orders, references, and electricity tokens issued to you</li>
          <li>Approximate location, if you allow it, to find artisans near you</li>
        </ul>
        <p>
          <strong>We never see or store your card details.</strong> Cards are entered on
          Paystack's own checkout and stay with them.
        </p>
      </Block>

      <Block heading="Why we use it">
        <ul className="ml-4 list-disc space-y-1.5">
          <li><strong>To run your account and process payments</strong> — we can't deliver airtime or units without the number or meter</li>
          <li><strong>To send receipts and tokens</strong> by email, so a delivered token isn't lost when you close the app</li>
          <li><strong>To connect buyers and sellers</strong> — contact details are released only when an enquiry is accepted</li>
          <li><strong>To prevent fraud</strong> and investigate misuse</li>
          <li><strong>To meet legal and regulatory obligations</strong>, including financial record-keeping</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data, and we don't show
          advertising based on it.
        </p>
      </Block>

      <Block heading="Who else sees it">
        <p>Only what each partner needs to do their job:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><strong>Paystack</strong> — payments and withdrawals; they receive your name, email and payment details</li>
          <li><strong>Bill providers</strong> — the phone number, meter or smartcard number for that purchase</li>
          <li><strong>Other OAM users</strong> — your name and, once you accept an enquiry, your contact number</li>
          <li><strong>Travel partners</strong> — if you follow a booking link, their own privacy policy applies from that point</li>
          <li><strong>Regulators or law enforcement</strong> — where we're legally required to disclose</li>
        </ul>
      </Block>

      <Block heading="Contact details on listings and profiles">
        <p>
          The number on your listing or artisan profile is{" "}
          <strong>not published publicly</strong>. It's held privately and released to one
          specific person only when you accept their enquiry.
        </p>
        <p>
          This is deliberate: numbers on public pages get harvested and reused for
          impersonation scams. Keeping the release under your control is the single most
          useful protection we can offer, so it's built into the product rather than left as
          a setting.
        </p>
      </Block>

      <Block heading="How long we keep it">
        <p>
          Account and transaction records are kept while your account is open, and for a
          period afterwards to meet financial record-keeping obligations.{" "}
          <span className="font-mono text-[12px]">[TO CONFIRM — the exact retention period
          should be set with advice; financial records in Nigeria are typically kept for
          several years.]</span>
        </p>
        <p>Messages between users are kept while both accounts remain open.</p>
      </Block>

      <Block heading="Your rights">
        <p>Under the Nigeria Data Protection Act 2023 you can ask us to:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>show you the personal data we hold about you</li>
          <li>correct anything inaccurate</li>
          <li>delete data we no longer have a lawful reason to keep</li>
          <li>stop using your data for a particular purpose</li>
          <li>provide your data in a portable form</li>
        </ul>
        <p>
          Email{" "}
          <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline">
            info@oam-app.com
          </a>
          . We'll respond within one month.
        </p>
        <p>
          Some data we must keep even after you ask — completed financial transactions, for
          instance, where the law requires a record. We'll tell you if that applies.
        </p>
      </Block>

      <Block heading="Security">
        <p>
          Passwords are stored hashed, never in readable form. Payments go through Paystack's
          secure checkout. Access to customer data inside OAM is limited to the people who
          need it to run the service.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your data, we'll tell you and
          the regulator as the law requires.
        </p>
      </Block>

      <Block heading="Changes">
        <p>
          If we change this policy materially, we'll notify you by email or in the app before
          it takes effect. See also our{" "}
          <Link to="/terms" className="font-medium text-brand-green underline">
            Terms of Service
          </Link>
          .
        </p>
      </Block>
    </PageShell>
  );
}
