import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

/**
 * Modern split auth layout.
 *  Left (desktop): near-black brand panel with the OAM logo, an ambient green
 *  glow, a red accent, and the signature tricolor bar (black/red/green from the
 *  logo wing). Right: clean white form area.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  altPrompt,
  altLink,
  altLabel,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  altPrompt?: string;
  altLink?: string;
  altLabel?: string;
}) {
  return (
    <div className="relative flex min-h-screen bg-white">
      {/* Brand panel — desktop only. Diagonal cut slanting into the white side,
          echoing the landing hero. The dark shape is wider than its content
          column so the slant clears the text; the content column itself stays
          vertical and padded on the left. */}
      <div
        className="relative hidden w-[54%] overflow-hidden bg-[#0a0a0a] lg:block"
        style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 0 100%)" }}
        aria-hidden="false"
      >
        {/* signature tricolor bar */}
        <div
          className="absolute inset-x-0 top-0 h-[4px]"
          style={{
            background:
              "linear-gradient(90deg,#111 0%,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%,#0B7327 100%)",
          }}
          aria-hidden="true"
        />
        {/* ambient glows */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 28% 18%, rgba(11,115,39,0.34), transparent 55%), radial-gradient(circle at 78% 92%, rgba(227,16,18,0.16), transparent 50%)",
          }}
          aria-hidden="true"
        />

        {/* content column — kept away from the slanted right edge */}
        <div className="relative flex h-full w-[80%] flex-col justify-between p-10 xl:p-12">
          {/* logo */}
          <Link to="/" className="inline-flex">
            <img src={logo} alt="OAM — All services. One app." className="h-9 w-auto brightness-0 invert" />
          </Link>

          {/* centerpiece */}
          <div>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.25rem]">
              Everything you need,
              <br />
              in one balance.
            </h2>
            <p className="mt-3.5 max-w-xs text-[13.5px] leading-relaxed text-white/60">
              Bills, marketplace, artisans, travel and transfers — one secure
              account for it all.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/75 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1a9c44]" />
                Bank-grade security
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/75 backdrop-blur">
                Instant delivery
              </span>
            </div>
          </div>

          <p className="text-[11px] text-white/40">Developed by AiTrend</p>
        </div>
      </div>

      {/* Form area. On desktop it starts a little further right so its content
          sits clear of the panel's diagonal edge; the negative margin lets the
          white flow visually under the slant for the blended look. */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 sm:py-12 lg:-ml-[6%] lg:justify-center lg:pl-[8%]">
        <div className="w-full max-w-[360px]">
          {/* logo on mobile */}
          <Link to="/" className="mb-8 inline-flex lg:hidden">
            <img src={logo} alt="OAM" className="h-8 w-auto" />
          </Link>

          <h1 className="font-display text-[1.5rem] font-bold tracking-tight text-[#0a0a0a] xs:text-[1.6rem] sm:text-[1.75rem]">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {altPrompt && altLink && (
            <p className="mt-6 text-center text-[13.5px] text-muted">
              {altPrompt}{" "}
              <Link to={altLink} className="font-semibold text-brand-red hover:underline">
                {altLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
