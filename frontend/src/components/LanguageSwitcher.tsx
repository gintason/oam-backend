import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGES } from "../i18n";

/**
 * Language picker with SVG country flags (flag-icons).
 *
 * A native <select> can't render inline SVG flags, and flag emojis show as
 * two-letter codes on Windows — so this is a small custom dropdown. It renders
 * a real <span class="fi fi-xx"> flag next to each language, consistent across
 * every OS and browser.
 *
 * Requires the CSS import once at app entry (main.tsx):
 *   import "flag-icons/css/flag-icons.min.css";
 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    LANGUAGES.find((l) => l.code === (i18n.resolvedLanguage || i18n.language || "en").split("-")[0]) ??
    LANGUAGES[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(code: string) {
    i18n.changeLanguage(code);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("language.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-paper px-2.5 text-sm font-medium text-ink transition hover:bg-mist"
      >
        <Globe size={14} strokeWidth={1.75} className="text-muted" />
        <span className={`fi fi-${current.flag} rounded-[2px]`} style={{ width: 18, height: 13 }} />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown size={14} strokeWidth={2} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 z-50 mt-1.5 max-h-80 w-52 overflow-y-auto rounded-xl border border-hairline bg-paper p-1 shadow-[0_12px_32px_rgba(10,10,10,0.14)]"
        >
          {LANGUAGES.map((l) => {
            const selected = l.code === current.code;
            return (
              <li key={l.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(l.code)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition ${
                    selected ? "bg-brand-green/10 text-brand-green" : "text-ink hover:bg-mist"
                  }`}
                >
                  <span className={`fi fi-${l.flag} rounded-[2px]`} style={{ width: 20, height: 15 }} />
                  <span className="flex-1">{l.native}</span>
                  {selected && <Check size={14} strokeWidth={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
