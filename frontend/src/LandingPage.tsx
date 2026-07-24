import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Hero from "./Hero";
import Services from "./sections/Services";
import Marketplace from "./sections/Marketplace";
import FeaturedArtisans from "./sections/FeaturedArtisans";
import { CTA, Footer } from "./sections/CTAFooter";
import LanguageSwitcher from "./components/LanguageSwitcher";
import CurrencySwitcher from "./components/CurrencySwitcher";
import logo from "./assets/logo.png";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Find Artisans", href: "#artisans" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <img
            src={logo}
            alt="OAM — All services. One app."
            className="h-8 w-auto sm:h-9"
          />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-ink transition">
                {l.label}
              </a>
            ))}
            <LanguageSwitcher />
            <CurrencySwitcher />
            <button onClick={() => navigate("/sign-in")} className="h-9 rounded-lg border border-hairline bg-paper px-4 text-sm font-medium text-ink transition hover:bg-mist">
              Sign in
            </button>
            <button onClick={() => navigate("/sign-up")} className="h-9 rounded-lg bg-brand-red px-4 text-sm font-medium text-white transition hover:brightness-95">
              Get started
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-hairline text-ink md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <div
          className={`border-t border-hairline bg-paper transition-opacity duration-300 md:hidden ${
            open ? "block opacity-100" : "hidden opacity-0"
          }`}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[15px] text-ink transition hover:bg-mist"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 border-t border-hairline pt-3">
              <span className="mb-2 block px-3 text-[12px] font-medium uppercase tracking-wider text-muted">
                Language &amp; currency
              </span>
              <div className="flex flex-col gap-3 px-1">
                <LanguageSwitcher inline />
                <CurrencySwitcher inline />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { setOpen(false); navigate("/sign-in"); }} className="h-11 rounded-lg border border-hairline bg-paper text-sm font-medium text-ink transition hover:bg-mist">
                Sign in
              </button>
              <button onClick={() => { setOpen(false); navigate("/sign-up"); }} className="h-11 rounded-lg bg-brand-red text-sm font-medium text-white transition hover:brightness-95">
                Get started
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <Hero />
        <Services />
        <Marketplace />
        <FeaturedArtisans />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
