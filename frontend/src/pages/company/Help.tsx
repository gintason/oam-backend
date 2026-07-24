import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import PageShell, { Block, Notice } from "./PageShell";

type Faq = { q: string; a: React.ReactNode };
type Group = { title: string; items: Faq[] };

/**
 * Answers written from how the platform actually behaves, not generic filler.
 * The electricity token questions come first deliberately — a delayed token is
 * the single most alarming thing that happens to a customer here, and it's the
 * moment they're most likely to pay twice.
 */
const GROUPS: Group[] = [
  {
    title: "Electricity tokens",
    items: [
      {
        q: "I paid for units but no token appeared. What now?",
        a: (
          <>
            <p>
              <strong>Don't buy again.</strong> Your payment has gone through and the order
              is with your provider — buying a second time charges you twice for the same
              meter.
            </p>
            <p>
              Open <Link to="/orders" className="font-medium text-brand-green underline">Order history</Link>.
              While an order is still completing you'll see "Token on the way", and the page
              checks with your provider every few seconds. Tokens usually arrive within a
              minute or two, occasionally longer at busy times.
            </p>
            <p>
              The token is also emailed to you as soon as it's issued, so you'll get it even
              if you've closed the app.
            </p>
          </>
        ),
      },
      {
        q: "Where can I find an old token?",
        a: (
          <p>
            Every token is stored permanently in{" "}
            <Link to="/orders" className="font-medium text-brand-green underline">Order history</Link>{" "}
            — open the order and it's there with a copy button. It's also in the receipt
            email we sent at the time.
          </p>
        ),
      },
      {
        q: "The meter number wasn't accepted.",
        a: (
          <p>
            Nigerian prepaid meters are <strong>11 digits</strong>. We only check with your
            disco once all 11 are entered, so a message while you're still typing just means
            we're waiting. If a complete number is still rejected, check you've picked the
            right disco — a valid meter on the wrong disco will always fail.
          </p>
        ),
      },
    ],
  },
  {
    title: "Wallet and payments",
    items: [
      {
        q: "Why does my card payment go into my wallet first?",
        a: (
          <>
            <p>
              Card payments credit your wallet, and the wallet then pays for what you bought.
              It looks like an extra step, and it's deliberate.
            </p>
            <p>
              If a delivery fails, the money is already sitting safely in your wallet as a
              balance you can spend or withdraw. Paying a provider directly would leave your
              money stranded between the card processor and them, with no clean way back.
            </p>
          </>
        ),
      },
      {
        q: "Are there hidden fees?",
        a: (
          <p>
            No. The total shown before you pay is what you pay — the fee line reads ₦0
            because there isn't one. Our margin is built into the price of bills, so nothing
            is added at checkout.
          </p>
        ),
      },
      {
        q: "How long do withdrawals take?",
        a: (
          <p>
            Bank transfers usually land within minutes, though they can take longer during
            bank downtime. If a withdrawal fails, the amount is returned to your wallet
            automatically — it isn't lost, and you can try again.
          </p>
        ),
      },
      {
        q: "Can I send money to another OAM user?",
        a: (
          <p>
            Yes — <Link to="/wallet/send" className="font-medium text-brand-green underline">Transfer</Link>{" "}
            moves money between OAM wallets instantly and free. Enter their email or phone
            number and their name appears before you confirm. <strong>Check that name
            carefully</strong>: completed transfers can't be reversed.
          </p>
        ),
      },
    ],
  },
  {
    title: "Marketplace and artisans",
    items: [
      {
        q: "Why can't I see a seller's phone number?",
        a: (
          <>
            <p>
              Numbers are never published. Send a message about the item, and once the seller
              accepts, you'll both see each other's contact details.
            </p>
            <p>
              It's slightly slower, and it's the single most effective protection we can
              offer: published numbers get scraped, and scraped numbers get used for
              impersonation scams.
            </p>
          </>
        ),
      },
      {
        q: "How many things can I list for free?",
        a: (
          <p>
            Three active listings, indefinitely, with no card required. Premium (₦2,500) adds
            up to 20 listings plus featured placement, and Pro (₦5,000) is unlimited.
          </p>
        ),
      },
      {
        q: "How do I stay safe buying and selling?",
        a: (
          <ul className="ml-4 list-disc space-y-1.5">
            <li>Meet in a public place during daylight</li>
            <li>Inspect the item before any money changes hands</li>
            <li>Never send money in advance to someone you haven't met</li>
            <li>Keep the conversation in OAM, so there's a record of what was agreed</li>
            <li>Treat any request to move to WhatsApp "for a better price" as a warning sign</li>
          </ul>
        ),
      },
      {
        q: "What does boosting an artisan profile do?",
        a: (
          <p>
            It places your profile above unboosted ones in search results, where most people
            look. Premium is ₦2,500 for 30 days and Pro is ₦5,000 for 90. Both are{" "}
            <strong>one-off payments</strong> — nothing renews automatically.
          </p>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        q: "Can I use the same account to buy and to sell?",
        a: (
          <p>
            Yes. One account does everything — you might sell a fridge and hire a plumber in
            the same week. Your messages are split into "My enquiries" and "Enquiries to me"
            so the two don't get tangled.
          </p>
        ),
      },
      {
        q: "Is my card stored on OAM?",
        a: (
          <p>
            No. Card details are entered on Paystack's secure checkout and are never seen or
            stored by us.
          </p>
        ),
      },
    ],
  },
];

export default function Help() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const groups = q
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.q.toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0)
    : GROUPS;

  return (
    <PageShell
      title="Help centre"
      intro="Answers to the things people ask most — starting with the one that matters when money is involved."
    >
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help…"
          className="h-12 w-full rounded-xl border border-hairline bg-paper pl-10 pr-3.5 text-[14px] text-ink shadow-[0_1px_2px_rgba(10,10,10,0.04)] outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
        />
      </div>

      {groups.length === 0 ? (
        <Block>
          <p>
            Nothing matches "{query}". Email{" "}
            <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline">
              info@oam-app.com
            </a>{" "}
            and a person will answer.
          </p>
        </Block>
      ) : (
        groups.map((group) => (
          <Block key={group.title} heading={group.title}>
            <div className="-mx-1 divide-y divide-hairline">
              {group.items.map((item) => {
                const id = `${group.title}:${item.q}`;
                const isOpen = open === id;
                return (
                  <div key={id} className="px-1">
                    <button
                      onClick={() => setOpen(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between gap-3 py-3.5 text-left"
                    >
                      <span className="text-[14px] font-medium text-ink">{item.q}</span>
                      <ChevronDown
                        size={17}
                        strokeWidth={2}
                        className={`mt-0.5 shrink-0 text-muted transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && <div className="space-y-3 pb-4 pr-6">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </Block>
        ))
      )}

      <Notice tone="info">
        Still stuck? Email{" "}
        <a href="mailto:info@oam-app.com" className="font-semibold underline">
          info@oam-app.com
        </a>{" "}
        with your order reference and we'll look it up. See{" "}
        <Link to="/contact" className="font-semibold underline">
          Contact
        </Link>{" "}
        for what to include.
      </Notice>
    </PageShell>
  );
}
