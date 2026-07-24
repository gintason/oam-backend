import { Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell, { Block, Notice } from "./PageShell";

export default function Contact() {
  return (
    <PageShell
      title="Contact us"
      intro="Something gone wrong, or a question before you start? Here's how to reach a person."
    >
      <Block heading="Email">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Mail size={17} strokeWidth={1.75} />
          </span>
          <div>
            <a
              href="mailto:info@oam-app.com"
              className="text-[16px] font-semibold text-ink underline decoration-brand-green/40 underline-offset-4"
            >
              info@oam-app.com
            </a>
            <p className="mt-1">
              The fastest route for anything to do with a payment, a missing token, or an
              account problem.
            </p>
          </div>
        </div>
      </Block>

      <Block heading="If a payment has gone wrong">
        <p>
          <strong>Please don't pay twice.</strong> If an order shows as "processing", the
          money has already left and the purchase is with your provider — buying again
          usually means paying for the same thing a second time.
        </p>
        <p>Instead, email us with:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>the <strong>reference number</strong> from the order (it starts with BILL-, FUND- or TRF-)</li>
          <li>the email address on your OAM account</li>
          <li>roughly when it happened</li>
        </ul>
        <p>
          That's usually enough for us to find the transaction and tell you exactly where it
          is. You can find the reference under{" "}
          <Link to="/orders" className="font-medium text-brand-green underline">
            Order history
          </Link>
          .
        </p>
      </Block>

      <Block heading="Buying or selling on the Marketplace">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <MessageSquare size={17} strokeWidth={1.75} />
          </span>
          <div className="space-y-3">
            <p>
              Questions about a specific item or job are best asked{" "}
              <strong>directly in the chat</strong> attached to that listing or artisan
              profile — the other person gets notified, and there's a record of what was
              agreed.
            </p>
            <p>
              Contact us instead if someone asks you to pay outside OAM, pressures you for
              money in advance, or behaves in a way that doesn't feel right. We'd rather hear
              about it early.
            </p>
          </div>
        </div>
      </Block>

      <Block heading="Response times">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Clock size={17} strokeWidth={1.75} />
          </span>
          <p>
            We aim to reply to every email within <strong>one working day</strong>. Payment
            problems are looked at first. If you haven't heard back after two working days,
            reply to your own email to bump it — it's more reliable than sending a new one.
          </p>
        </div>
      </Block>

      <Notice>
        <div className="flex gap-2.5">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <strong>We will never ask for your password, card PIN, or a one-time code.</strong>{" "}
            Anyone who does — by call, SMS or WhatsApp — is not from OAM, however convincing
            they sound. Hang up and email us instead.
          </div>
        </div>
      </Notice>
    </PageShell>
  );
}
