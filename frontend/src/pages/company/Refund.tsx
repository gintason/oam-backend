import PageShell from "./PageShell";

export default function Refund() {
  return (
    <PageShell title="Refund Policy">
      <div className="prose prose-sm max-w-none text-ink space-y-4">
        <p className="text-muted">Last updated: September 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">1. Overview</h2>
          <p>
            At OAM, we aim to ensure complete satisfaction with our platform services.
            This Refund Policy outlines the terms and conditions under which refunds are requested,
            processed, and issued.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">2. Digital Services & Bill Payments</h2>
          <p>
            Transactions involving digital utilities, airtime, data, electricity, and cable TV subscriptions
            are processed instantly. Refunds for these transactions are only applicable if:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li>Your wallet or account was debited, but the service provider failed to fulfill the order.</li>
            <li>A system error resulted in double debiting for a single transaction.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">3. Marketplace & Goods</h2>
          <p>
            For purchases made through our marketplace, refunds or returns are subject to seller inspection and verification upon delivery. Please raise any disputes via our Help Center within 24 hours of receiving the item.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">4. Processing Time</h2>
          <p>
            Approved refunds will be credited directly back to your OAM wallet balance immediately, or returned to your original payment card/bank account within 3–5 business days depending on your financial institution.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">5. Contact Us</h2>
          <p>
            If you have any questions regarding a potential refund, please reach out through our 
            Support page or contact our support team.
          </p>
        </section>
      </div>
    </PageShell>
  );
}