import { useEffect, useState } from "react";
import { BedDouble, Bell, Car, CreditCard, Gift, Plane, Send, Smartphone, Store, Tv, Wallet, Wifi, Wrench, Zap, type LucideIcon } from "lucide-react";

/**
 * Landing hero.
 *  Left  (dim green #062616): drifting + pulsing service icons, headline,
 *        side-by-side CTAs.
 *  Right (white diagonal, desktop): two realistic CSS phones (Android behind,
 *        iPhone front) running the OAM app with a full 9-service grid whose
 *        tiles ripple/glow in sequence; download caption + store badges.
 *  Mobile: stacks; phones scale down. Pure CSS/SVG. Brand colours only.
 */

const GREEN = "#0B7327";

// Rotating hero headlines — each is shown in turn with a cross-fade.
const HEADLINES: string[] = [
  "One balance for everything you need.",
  "Pay bills, transfer money and trade gift cards.",
  "Book flights, hotels and hire cars worldwide.",
  "Buy and sell on our marketplace.",
  "Get vetted artisans to handle your next job.",
];
const HEADLINE_MS = 3800;

type Drifter = {
  Icon: LucideIcon; left: string; top: string; size: number;
  dur: string; delay: string; dx: string; dy: string; accent?: boolean;
};

const DRIFTERS: Drifter[] = [
  { Icon: Smartphone,  left: "3%",  top: "8%",  size: 34, dur: "24s", delay: "0s",   dx: "20px",  dy: "16px"  },
  { Icon: Wifi,        left: "12%", top: "20%", size: 30, dur: "28s", delay: "-4s",  dx: "-18px", dy: "20px"  },
  { Icon: Tv,          left: "22%", top: "6%",  size: 38, dur: "26s", delay: "-9s",  dx: "16px",  dy: "22px"  },
  { Icon: Zap,         left: "32%", top: "16%", size: 32, dur: "22s", delay: "-2s",  dx: "18px",  dy: "-16px" },
  { Icon: Plane,       left: "6%",  top: "34%", size: 36, dur: "25s", delay: "-12s", dx: "22px",  dy: "18px"  },
  { Icon: Store,       left: "18%", top: "40%", size: 30, dur: "30s", delay: "-6s",  dx: "-16px", dy: "-20px" },
  { Icon: BedDouble,   left: "30%", top: "36%", size: 32, dur: "27s", delay: "-15s", dx: "20px",  dy: "16px"  },
  { Icon: Gift,        left: "9%",  top: "54%", size: 30, dur: "23s", delay: "-8s",  dx: "-18px", dy: "18px"  },
  { Icon: Send,        left: "24%", top: "58%", size: 34, dur: "29s", delay: "-11s", dx: "18px",  dy: "-18px" },
  { Icon: Car,         left: "34%", top: "52%", size: 32, dur: "24s", delay: "-5s",  dx: "-16px", dy: "20px"  },
  { Icon: Wallet,      left: "5%",  top: "72%", size: 34, dur: "31s", delay: "-16s", dx: "20px",  dy: "-16px", accent: true },
  { Icon: CreditCard,  left: "16%", top: "76%", size: 30, dur: "26s", delay: "-3s",  dx: "-18px", dy: "-18px" },
  { Icon: Wrench,      left: "37%", top: "70%", size: 28, dur: "25s", delay: "-7s",  dx: "-14px", dy: "-16px", accent: true },
  { Icon: Smartphone,  left: "2%",  top: "23%", size: 26, dur: "27s", delay: "-10s", dx: "16px",  dy: "20px"  },
  { Icon: Zap,         left: "14%", top: "62%", size: 26, dur: "24s", delay: "-14s", dx: "-14px", dy: "16px"  },
  { Icon: Plane,       left: "36%", top: "26%", size: 28, dur: "23s", delay: "-1s",  dx: "18px",  dy: "-14px" },
  { Icon: Gift,        left: "25%", top: "22%", size: 26, dur: "30s", delay: "-17s", dx: "-16px", dy: "18px"  },
  { Icon: Tv,          left: "9%",  top: "44%", size: 26, dur: "28s", delay: "-13s", dx: "14px",  dy: "-16px" },
];

/* App service tiles (shared shape) */
type Svc = { Icon: LucideIcon; label: string; tint: "ink" | "red" | "green" };

const ANDROID_SVCS: Svc[] = [
  { Icon: Smartphone, label: "Airtime", tint: "ink" },
  { Icon: Wifi,       label: "Data",    tint: "ink" },
  { Icon: Tv,         label: "Cable",   tint: "red" },
  { Icon: Zap,        label: "Power",   tint: "red" },
  { Icon: Store,      label: "Market",  tint: "green" },
  { Icon: Wrench,     label: "Artisans",tint: "green" },
  { Icon: Plane,      label: "Flights", tint: "ink" },
  { Icon: Gift,       label: "Cards",   tint: "red" },
  { Icon: Send,       label: "Send",    tint: "green" },
];
const IOS_SVCS: Svc[] = [
  { Icon: Smartphone, label: "Airtime", tint: "ink" },
  { Icon: Tv,         label: "Cable",   tint: "red" },
  { Icon: Zap,        label: "Power",   tint: "red" },
  { Icon: Store,      label: "Market",  tint: "ink" },
  { Icon: Wrench,     label: "Artisans",tint: "green" },
  { Icon: Plane,      label: "Travel",  tint: "ink" },
  { Icon: BedDouble,  label: "Hotels",  tint: "ink" },
  { Icon: Gift,       label: "Cards",   tint: "red" },
  { Icon: Send,       label: "Send",    tint: "green" },
];

const tintClass = (t: Svc["tint"]) =>
  t === "red" ? "text-brand-red" : t === "green" ? "text-brand-green" : "text-ink";

/* Store badges — inline SVG (lucide has no brand icons) */
const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M3.6 2.3 13.3 12 3.6 21.7c-.3-.2-.5-.6-.5-1V3.3c0-.4.2-.8.5-1z" fill="#00D3FF"/>
    <path d="M16.9 8.4 13.3 12l3.6 3.6 3.9-2.2c.7-.4.7-1.4 0-1.8l-3.9-2.2z" fill="#FFCE00"/>
    <path d="M3.6 2.3c.3-.2.7-.2 1.1 0l11.2 6.1L13.3 12 3.6 2.3z" fill="#00F076"/>
    <path d="M3.6 21.7 13.3 12l2.6 3.6-11.2 6.1c-.4.2-.8.2-1.1 0z" fill="#FF3A44"/>
  </svg>
);
const AppleGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.3 10.38.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.73-1.05-2.76-4.15zM14.6 4.3c.72-.87 1.2-2.08 1.07-3.3-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.44z"/>
  </svg>
);

function StoreBadge({ glyph, small, big }: { glyph: React.ReactNode; small: string; big: string }) {
  return (
    <a href="#" className="inline-flex items-center gap-2 rounded-[10px] bg-ink px-3.5 py-2 text-white transition hover:brightness-125">
      {glyph}
      <span className="text-left leading-none">
        <span className="block text-[8px] text-white/70">{small}</span>
        <span className="block text-[12px] font-semibold">{big}</span>
      </span>
    </a>
  );
}

const glare =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_32%)]";

function AndroidPhone() {
  return (
    <div
      className="relative z-[1] h-[392px] w-[200px] sm:h-[468px] sm:w-[234px]"
      style={{ transform: "rotate(-8deg) translateX(34px) translateY(6px)" }}
    >
      <div
        className="h-full w-full rounded-[36px] p-1.5 shadow-[0_26px_60px_rgba(0,0,0,0.42)] ring-1 ring-white/5"
        style={{ background: "linear-gradient(145deg,#2a2a2e,#0d0d0f)" }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[30px]"
             style={{ background: "linear-gradient(180deg,#0e8a2f,#0B7327)" }}>
          <div className="absolute left-1/2 top-2 z-[4] h-2 w-2 -translate-x-1/2 rounded-full border-2 border-[#1a1a1a] bg-black" />
          <div className="px-3.5 pb-3.5 pt-6">
            <div className="text-[9px] text-white/60">Good morning</div>
            <div className="mb-2.5 text-[11px] font-semibold text-white">Preye 👋</div>
            <div className="mb-3 rounded-[13px] bg-white/10 p-3">
              <div className="text-[8px] text-white/70">Wallet balance</div>
              <div className="oam-balpulse tabular text-[20px] font-bold tracking-tight text-white">₦19,610</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ANDROID_SVCS.map((s, i) => (
                <div
                  key={i}
                  className="oam-tile flex h-[42px] flex-col items-center justify-center gap-0.5 rounded-[11px] bg-white"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <s.Icon size={16} strokeWidth={1.75} className={s.tint === "ink" ? "text-[#062616]" : tintClass(s.tint)} />
                  <span className="text-[7px] font-medium text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={glare} />
        </div>
      </div>
    </div>
  );
}

function IOSPhone() {
  return (
    <div
      className="relative z-[2] h-[416px] w-[212px] sm:h-[496px] sm:w-[250px]"
      style={{ transform: "rotate(6deg) translateX(-34px) translateY(-6px)" }}
    >
      <div
        className="h-full w-full rounded-[40px] p-1.5 shadow-[0_26px_60px_rgba(0,0,0,0.48)] ring-1 ring-white/5"
        style={{ background: "linear-gradient(145deg,#3a3a3d,#111)" }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-white">
          <div className="absolute left-1/2 top-2.5 z-[4] h-4 w-14 -translate-x-1/2 rounded-[11px] bg-black" />
          <div className="px-3.5 pb-3.5 pt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-bold text-ink">
                O<span className="text-brand-red">.</span>A<span className="text-brand-green">.</span>M<span className="text-brand-red">.</span>
              </div>
              <Bell size={13} strokeWidth={1.75} className="text-muted" />
            </div>
            <div className="mb-3 rounded-[15px] p-3.5" style={{ background: GREEN }}>
              <div className="text-[8px] text-white/70">Wallet balance</div>
              <div className="tabular text-[22px] font-bold tracking-tight text-white">₦19,610</div>
              <div className="mt-2.5 flex gap-1.5">
                <span className="rounded-lg bg-brand-red px-3 py-1.5 text-[8px] font-medium text-white">+ Add money</span>
                <span className="rounded-lg bg-brand-green/[0.12] px-3 py-1.5 text-[8px] font-medium text-brand-green">Send</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {IOS_SVCS.map((s, i) => (
                <div
                  key={i}
                  className="oam-tile flex h-[44px] flex-col items-center justify-center gap-0.5 rounded-[11px] bg-mist"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <s.Icon size={16} strokeWidth={1.75} className={tintClass(s.tint)} />
                  <span className="text-[7px] font-medium text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={glare} />
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // reduced-motion: stay on the first headline
    const id = setInterval(
      () => setActive((i) => (i + 1) % HEADLINES.length),
      HEADLINE_MS
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden" style={{ background: GREEN }}>
      {/* Ambient "cloudy white" glow — layered radial gradients that SLOWLY DRIFT
          for premium living depth. Layers are oversized (-inset) so they have
          room to move; each animates on its own timer. */}
      <div
        className="oam-glow oam-glow-1 pointer-events-none absolute -inset-1/4 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_60%)]"
        aria-hidden="true"
      />
      <div
        className="oam-glow oam-glow-2 pointer-events-none absolute -inset-1/4 bg-[radial-gradient(circle_at_center_right,_rgba(255,255,255,0.11),_transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="oam-glow oam-glow-3 pointer-events-none absolute -inset-1/4 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.07),_transparent_50%)]"
        aria-hidden="true"
      />

      {/* Interwoven green/black motion field — soft blurred shapes, fully
          contained (no hard edges), lower layer behind everything. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="oam-blob" style={{ width: 420, height: 420, left: "-8%",  top: "-30%", background: "#0a1f12", "--bx": "70px",  "--by": "50px",  "--bd": "24s", animationDelay: "0s" } as React.CSSProperties} />
        <span className="oam-blob" style={{ width: 340, height: 340, left: "16%",  top: "34%",  background: "#08160d", "--bx": "-60px", "--by": "-44px", "--bd": "30s", animationDelay: "-8s" } as React.CSSProperties} />
        <span className="oam-blob oam-blob-lite" style={{ width: 300, height: 300, left: "4%",  top: "6%",  background: "#12a03c", "--bx": "-50px", "--by": "60px",  "--bd": "27s", animationDelay: "-12s" } as React.CSSProperties} />
        <span className="oam-blob oam-blob-lite" style={{ width: 260, height: 260, left: "26%", top: "48%", background: "#0f9a37", "--bx": "60px",  "--by": "-50px", "--bd": "31s", animationDelay: "-6s" } as React.CSSProperties} />
        <span className="oam-blob" style={{ width: 240, height: 240, left: "30%", top: "0%",  background: "#0a1f12", "--bx": "-44px", "--by": "70px",  "--bd": "26s", animationDelay: "-14s" } as React.CSSProperties} />
      </div>

      {/* Drifting + pulsing service field */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {DRIFTERS.map((d, i) => (
          <span
            key={i}
            className={`oam-drift absolute ${d.accent ? "text-[#4FD182]" : "text-white"}`}
            style={
              {
                left: d.left, top: d.top,
                "--dx": d.dx, "--dy": d.dy, "--dur": d.dur,
                animationDelay: d.delay,
              } as React.CSSProperties
            }
          >
            <d.Icon size={d.size} strokeWidth={1.5} />
          </span>
        ))}
      </div>

      {/* Diagonal white panel — desktop only */}
      <div className="absolute inset-y-0 right-0 hidden w-[48%] bg-white lg:block" aria-hidden="true"
           style={{ clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" }} />
      <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block" aria-hidden="true"
           style={{
             background: "linear-gradient(160deg, rgba(11,115,39,0.05), rgba(227,16,18,0.04))",
             clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)",
           }} />

      {/* Content */}
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 py-10 sm:px-6 sm:py-12 lg:flex-row lg:gap-8 lg:py-16">
        {/* LEFT */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3CCB6E]" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/85 sm:text-[11px] sm:tracking-[0.14em]">
              All services · One app · Endless possibilities
            </span>
          </div>

          {/* Rotating headline — only this cross-fades; min-height stops layout jump */}
          <div className="relative min-h-[104px] sm:min-h-[150px] lg:min-h-[168px]">
            {HEADLINES.map((h, i) => (
              <h1
                key={i}
                aria-hidden={i !== active}
                className={`absolute inset-0 font-display text-[1.75rem] font-medium leading-[1.1] text-white transition-all duration-700 ease-out sm:text-[2.75rem] lg:text-[3.25rem] ${
                  i === active
                    ? "opacity-100 translate-y-0"
                    : "pointer-events-none opacity-0 translate-y-2"
                }`}
              >
                {h}
              </h1>
            ))}
          </div>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/75 sm:mt-5 sm:text-lg lg:mx-0">
            Airtime, data, DStv, electricity — plus a marketplace, artisans near
            you, gift cards, transfers and travel. All from one wallet.
          </p>

          {/* CTAs — side by side */}
          <div className="mt-7 flex flex-row justify-center gap-3 sm:mt-8 lg:justify-start">
            <button className="h-12 flex-1 rounded-lg bg-brand-red px-5 text-[15px] font-medium text-white transition hover:brightness-95 active:scale-[0.98] sm:flex-none sm:px-6">
              Create your account
            </button>
            <button className="h-12 flex-1 rounded-lg border border-white/[0.32] bg-transparent px-5 text-[15px] font-medium text-white transition hover:bg-white/5 active:scale-[0.98] sm:flex-none sm:px-6">
              See how it works
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-full flex-shrink-0 text-center lg:w-[46%]">
          <div className="flex origin-top scale-[0.8] items-center justify-center xs:scale-90 sm:scale-100">
            <AndroidPhone />
            <IOSPhone />
          </div>

          <p className="mx-auto mb-3 mt-6 max-w-[280px] text-[13px] font-medium leading-relaxed text-white lg:text-[#062616]">
            Download the OAM app on Google Play and the App Store — and have the
            world in your hand.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <StoreBadge glyph={<PlayGlyph />} small="GET IT ON" big="Google Play" />
            <StoreBadge glyph={<AppleGlyph />} small="Download on the" big="App Store" />
          </div>
        </div>
      </div>
    </section>
  );
}
