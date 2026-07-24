import { Link } from "react-router-dom";
import { Wallet, Zap, Store, Wrench, Plane, ShieldCheck } from "lucide-react";
import PageShell, { Block, Notice } from "./PageShell";

const WHAT_WE_DO = [
  { icon: Zap, title: "Bills and utilities", body: "Airtime, data, electricity tokens and TV subscriptions, delivered in seconds and receipted by email." },
  { icon: Wallet, title: "Wallet and transfers", body: "Fund by card, send to another OAM user instantly, or withdraw to your own bank account." },
  { icon: Store, title: "Marketplace", body: "Buy and sell within the OAM community, with messaging built in so your phone number stays private." },
  { icon: Wrench, title: "Home services", body: "Find verified plumbers, electricians, mechanics and cleaners near you." },
  { icon: Plane, title: "Travel", body: "Compare flights, hotels, car hire and airport pickups worldwide." },
];

export default function About() {
  return (
    <PageShell
      title="About OAM"
      intro="One app for the everyday things Nigerians pay for, sell, and hire — built to be quick, honest, and safe with your money."
    >
      <Block heading="What OAM is">
        <p>
          OAM is a multi-service platform operated by <strong>O.A.M Motors Limited</strong>.
          It brings together the things most people currently juggle across half a dozen
          apps: topping up airtime, buying electricity units, paying for TV, sending money,
          selling something you no longer need, and finding a tradesperson you can trust.
        </p>
        <p>
          Everything runs through a single wallet, so you can see exactly what you've spent
          and what you're owed — and every purchase produces a receipt you can find again.
        </p>
      </Block>

      <Block heading="What you can do here">
        <ul className="space-y-3">
          {WHAT_WE_DO.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <br />
                  {item.body}
                </span>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block heading="How we make money">
        <p>
          We think you should know this, because a service that hides its revenue model
          usually has a reason to.
        </p>
        <p>
          On bills, we earn a <strong>small margin</strong> — typically ₦10 to ₦20 on a
          ₦1,000 purchase — built into the price you see. There is no separate fee added at
          checkout, and the amount you're shown is the amount you pay.
        </p>
        <p>
          On the Marketplace and Home Services, we earn from{" "}
          <strong>optional paid plans</strong>: sellers can subscribe for more listings and
          featured placement, and artisans can boost their profile to appear higher in
          search. Listing and messaging are free.
        </p>
        <p>
          On travel, we earn a <strong>referral commission</strong> from booking partners at
          no extra cost to you.
        </p>
      </Block>

      <Block heading="How we handle safety">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <ShieldCheck size={16} strokeWidth={1.75} />
          </span>
          <div className="space-y-3">
            <p>
              Phone numbers on the Marketplace and Home Services are{" "}
              <strong>never published</strong>. They're exchanged only once a seller or
              artisan accepts your enquiry — so nobody's number sits on a public page waiting
              to be harvested, and you only ever get the contact details of someone who has
              actually agreed to deal with you.
            </p>
            <p>
              Payments are processed by <strong>Paystack</strong>. Card details are entered on
              Paystack's own secure checkout and are never seen or stored by OAM.
            </p>
          </div>
        </div>
      </Block>

      <Notice tone="info">
        <strong>A note on where we are.</strong> OAM is newly launched, so some sections —
        particularly the Marketplace and the artisan directory — are still filling up.
        Coverage grows as more people join, and we'd rather say so than pretend otherwise.
      </Notice>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/sign-up"
          className="inline-flex h-11 items-center rounded-xl bg-brand-red px-5 text-[14px] font-semibold text-white transition hover:brightness-95"
        >
          Create an account
        </Link>
        <Link
          to="/contact"
          className="inline-flex h-11 items-center rounded-xl border border-hairline bg-paper px-5 text-[14px] font-medium text-ink transition hover:bg-mist"
        >
          Talk to us
        </Link>
      </div>
    </PageShell>
  );
}
