import { ArrowRight, MapPinned, PackageCheck, ShieldCheck, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Landing: OAM Dispatch — what the delivery service is, in three steps,
 * with a rider-on-a-bike illustration. Replaces the old closing CTA.
 * Signed-out visitors who tap a button go through sign-in and land on the page.
 */

const STEPS = [
  { key: "price", Icon: Timer, title: "Instant, upfront price", desc: "Enter pickup, drop-off and package size — you see the fare before you pay." },
  { key: "match", Icon: ShieldCheck, title: "A verified rider accepts", desc: "The nearest approved rider on a bike, car or van is matched automatically." },
  { key: "track", Icon: MapPinned, title: "Track it to the door", desc: "Follow the rider live on the map. Hand-over is confirmed with a delivery code." },
] as const;

const PAY = ["wallet", "card", "onDelivery", "cash"] as const;
const PAY_LABEL: Record<(typeof PAY)[number], string> = {
  wallet: "OAM Wallet", card: "Card", onDelivery: "Pay on delivery", cash: "Cash",
};

export function DeliverySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tx = (k: string, d: string) => t(`landing.delivery.${k}`, { defaultValue: d });

  return (
    <section id="delivery" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14 sm:px-6 sm:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-[#0B3D22] px-6 py-10 sm:px-12 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-red/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-brand-green/40 blur-3xl" aria-hidden="true" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium uppercase tracking-wider text-white/80">
              <PackageCheck size={14} strokeWidth={2} className="text-brand-red" />
              {tx("eyebrow", "OAM Dispatch")}
            </span>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight text-white sm:text-4xl lg:text-[44px]">
              {tx("title", "Send a package across town — today.")}
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70 sm:text-base">
              {tx("subtitle", "Documents, food, parcels or market goods: book a nearby rider in a minute and we'll get it there the same day, safely.")}
            </p>

            <ol className="mt-7 space-y-4">
              {STEPS.map(({ key, Icon, title, desc }, i) => (
                <li key={key} className="flex gap-3.5">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                    <Icon size={19} strokeWidth={1.75} />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-[11px] font-semibold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-white">{tx(`steps.${key}.title`, title)}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-white/60">{tx(`steps.${key}.desc`, desc)}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-[12px] uppercase tracking-wider text-white/50">{tx("payWith", "Pay with")}</span>
              {PAY.map((p) => (
                <span key={p} className="rounded-full border border-white/15 px-2.5 py-1 text-[12.5px] text-white/80">
                  {tx(`pay.${p}`, PAY_LABEL[p])}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/deliveries/new")}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-red px-6 text-[15px] font-medium text-white transition hover:brightness-95 active:scale-[0.98]"
              >
                {tx("send", "Send a package")}
                <ArrowRight size={18} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => navigate("/deliveries")}
                className="h-12 rounded-lg border border-white/35 bg-transparent px-6 text-[15px] font-medium text-white transition hover:bg-white/5 active:scale-[0.98]"
              >
                {tx("track", "Track a delivery")}
              </button>
            </div>
          </div>

          <DeliveryRider className="order-first mx-auto -mb-4 w-full max-w-[360px] lg:order-none lg:mb-0 lg:max-w-[520px]" />
        </div>
      </div>
    </section>
  );
}

/** A rider on a delivery scooter heading to a map pin. Pure SVG, brand colours. */
export function DeliveryRider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 400" className={className} role="img" aria-label="OAM rider on a delivery bike">
      <style>{`
        .oam-route { stroke-dasharray: 2 12; animation: oam-dash 1.4s linear infinite; }
        .oam-bob { animation: oam-bob 1.6s ease-in-out infinite; transform-origin: 260px 330px; }
        .oam-streak { animation: oam-streak 1.1s linear infinite; }
        .oam-pin { animation: oam-pin 2.2s ease-in-out infinite; transform-origin: 452px 104px; }
        @keyframes oam-dash { to { stroke-dashoffset: -28; } }
        @keyframes oam-bob { 50% { transform: translateY(-3px); } }
        @keyframes oam-streak { from { transform: translateX(40px); opacity: 0; } 30% { opacity: .7; } to { transform: translateX(-60px); opacity: 0; } }
        @keyframes oam-pin { 50% { transform: translateY(-6px); } }
        @media (prefers-reduced-motion: reduce) { .oam-route, .oam-bob, .oam-streak, .oam-pin { animation: none; } }
      `}</style>

      {/* backdrop: city disc, route to the pin */}
      <circle cx="270" cy="200" r="170" fill="#FFFFFF" opacity=".06" />
      <circle cx="270" cy="200" r="120" fill="#FFFFFF" opacity=".05" />
      <g opacity=".18" fill="#FFFFFF">
        <rect x="120" y="150" width="34" height="96" rx="3" />
        <rect x="160" y="120" width="44" height="126" rx="3" />
        <rect x="320" y="134" width="40" height="112" rx="3" />
        <rect x="366" y="168" width="30" height="78" rx="3" />
      </g>
      <path className="oam-route" d="M70 150 C 150 60, 300 40, 440 108" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      <circle cx="70" cy="150" r="7" fill="#0B3D22" stroke="#FFFFFF" strokeWidth="3" />
      <g className="oam-pin">
        <path d="M452 66c-15 0-27 12-27 27 0 20 27 45 27 45s27-25 27-45c0-15-12-27-27-27z" fill="#E31012" />
        <circle cx="452" cy="93" r="10" fill="#FFFFFF" />
      </g>

      {/* road */}
      <rect x="20" y="352" width="480" height="6" rx="3" fill="#FFFFFF" opacity=".18" />
      <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity=".5">
        <line className="oam-streak" x1="40" y1="280" x2="88" y2="280" />
        <line className="oam-streak" style={{ animationDelay: ".35s" }} x1="20" y1="306" x2="80" y2="306" />
        <line className="oam-streak" style={{ animationDelay: ".7s" }} x1="50" y1="232" x2="84" y2="232" />
      </g>

      <g className="oam-bob">
        {/* wheels */}
        {[150, 390].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="318" r="36" fill="#111111" />
            <circle cx={cx} cy="318" r="20" fill="#E5E7EB" />
            <circle cx={cx} cy="318" r="8" fill="#6B7280" />
          </g>
        ))}

        {/* delivery box on the rear rack */}
        <rect x="88" y="168" width="112" height="92" rx="10" fill="#E31012" />
        <rect x="88" y="168" width="112" height="22" rx="10" fill="#B80D0F" />
        <rect x="88" y="182" width="112" height="8" fill="#B80D0F" />
        <rect x="100" y="206" width="88" height="40" rx="7" fill="#FFFFFF" />
        <text x="144" y="233" textAnchor="middle" fontFamily="'Clash Display', Satoshi, system-ui, sans-serif" fontSize="20" fontWeight="700" fill="#111111">
          O<tspan fill="#E31012">.</tspan>A<tspan fill="#0B7327">.</tspan>M
        </text>
        <rect x="96" y="258" width="98" height="8" rx="4" fill="#111111" />

        {/* scooter body */}
        <path d="M104 300 C 104 270, 130 262, 172 262 L 262 262 C 276 262, 284 270, 290 284 L 300 304 L 112 304 Z" fill="#E31012" />
        <path d="M228 262 L 290 262 L 300 304 L 240 304 Z" fill="#B80D0F" />
        <path d="M150 282 C 150 282, 112 282, 104 300" stroke="#111111" strokeWidth="5" fill="none" />
        {/* leg shield + front fork */}
        <path d="M300 304 C 318 250, 332 214, 342 172 L 362 176 C 356 222, 340 266, 322 306 Z" fill="#E31012" />
        <line x1="352" y1="180" x2="390" y2="318" stroke="#111111" strokeWidth="9" strokeLinecap="round" />
        <path d="M356 290 C 372 276, 410 276, 424 300" stroke="#E31012" strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* handlebar + headlight */}
        <line x1="334" y1="166" x2="372" y2="156" stroke="#111111" strokeWidth="8" strokeLinecap="round" />
        <circle cx="370" cy="186" r="9" fill="#FDE68A" />
        <path d="M380 186 L 420 176 L 420 196 Z" fill="#FDE68A" opacity=".35" />
        {/* seat */}
        <path d="M168 252 C 168 240, 182 236, 196 236 L 250 236 C 262 236, 264 250, 254 254 L 176 256 Z" fill="#111111" />

        {/* rider */}
        {/* back leg */}
        <path d="M226 238 L 286 236 L 282 292" stroke="#1F2937" strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M270 294 L 300 294 C 306 294, 306 304, 300 304 L 268 304 Z" fill="#111111" />
        {/* torso (jacket) */}
        <path d="M206 240 C 196 200, 210 158, 246 138 L 276 152 C 266 182, 262 210, 258 242 Z" fill="#0B7327" />
        <path d="M222 236 C 216 210, 222 182, 240 162" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* arm to the handlebar */}
        <path d="M258 154 L 300 178 L 340 166" stroke="#0A5E21" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="342" cy="165" r="9" fill="#7C4A2D" />
        {/* neck + head + helmet */}
        <rect x="256" y="120" width="16" height="22" rx="6" fill="#7C4A2D" transform="rotate(20 264 131)" />
        <circle cx="276" cy="108" r="24" fill="#7C4A2D" />
        <path d="M250 104 C 250 76, 300 70, 306 100 L 306 106 L 252 110 Z" fill="#E31012" />
        <path d="M282 98 L 308 98 C 312 98, 312 112, 306 112 L 284 110 Z" fill="#111111" opacity=".85" />
        <path d="M256 92 C 264 80, 284 78, 294 84" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
