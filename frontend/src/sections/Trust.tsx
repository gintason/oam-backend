import { ShieldCheck, Lock, Clock, Receipt, type LucideIcon } from "lucide-react";

/** Why OAM is safe to trust with money — four plain reassurances. */

type Point = { Icon: LucideIcon; title: string; desc: string };

const POINTS: Point[] = [
  {
    Icon: ShieldCheck,
    title: "Your money is protected",
    desc: "Every transaction is held safely and refunded automatically if anything fails.",
  },
  {
    Icon: Lock,
    title: "Secure by design",
    desc: "Bank-grade encryption and verified payments on every service.",
  },
  {
    Icon: Clock,
    title: "Instant delivery",
    desc: "Airtime, tokens and confirmations arrive in seconds, any time of day.",
  },
  {
    Icon: Receipt,
    title: "Receipts you can keep",
    desc: "Clear records with tokens and references, ready to copy or share.",
  },
];

export default function Trust() {
  return (
    <section className="border-y border-hairline bg-mist">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
            Built on trust
          </p>
          <h2 className="font-display text-3xl font-medium text-ink sm:text-4xl">
            Money moves safely, every time
          </h2>
        </div>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <div key={p.title}>
              <div className="mb-4 inline-flex rounded-xl bg-paper p-3 text-ink">
                <p.Icon size={24} strokeWidth={1.75} />
              </div>
              <h3 className="text-[16px] font-medium text-ink">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
