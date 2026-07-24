import { UserPlus, Wallet, Zap, type LucideIcon } from "lucide-react";

/** Three-step explainer on a deep-green band — the brand's confident moment. */

type Step = { n: string; Icon: LucideIcon; title: string; desc: string };

const STEPS: Step[] = [
  {
    n: "01",
    Icon: UserPlus,
    title: "Create your account",
    desc: "Sign up in under a minute with your email. Verify with a one-time code and you're in.",
  },
  {
    n: "02",
    Icon: Wallet,
    title: "Fund your wallet",
    desc: "Add money securely with your card. Your balance is ready to spend across every service.",
  },
  {
    n: "03",
    Icon: Zap,
    title: "Pay for anything",
    desc: "Airtime, bills, travel, shopping and more — delivered instantly, receipts you can keep.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[#0B3D22]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-white/60">
            How it works
          </p>
          <h2 className="font-display text-3xl font-medium text-white sm:text-4xl">
            Up and running in three steps
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative">
              {/* connector line between steps on desktop */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute right-[-12px] top-7 hidden h-px w-6 bg-white/20 sm:block"
                  aria-hidden="true"
                />
              )}
              <div className="mb-5 inline-flex rounded-xl bg-white/10 p-3 text-white">
                <s.Icon size={24} strokeWidth={1.75} />
              </div>
              <div className="mb-1 text-sm font-medium tabular text-white/40">
                {s.n}
              </div>
              <h3 className="text-lg font-medium text-white">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
