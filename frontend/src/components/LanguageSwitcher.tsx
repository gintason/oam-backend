import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";

/**
 * Language switcher. Shows a globe + current language; opens a dropdown of the
 * 12 supported languages. Selection is remembered in React state (and can be
 * lifted to context / i18n later). This is the CONTROL — wiring it to real
 * translations needs an i18n layer (e.g. react-i18next) and translated strings,
 * which is a separate step. RTL languages are flagged for when that lands.
 *
 * Matches the backend's supported set.
 */

type Lang = { code: string; label: string; native: string; rtl?: boolean };

const LANGUAGES: Lang[] = [
  { code: "en", label: "English",    native: "English" },
  { code: "fr", label: "French",     native: "Français" },
  { code: "es", label: "Spanish",    native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ar", label: "Arabic",     native: "العربية", rtl: true },
  { code: "ur", label: "Urdu",       native: "اردو", rtl: true },
  { code: "zh", label: "Chinese",    native: "中文" },
  { code: "hi", label: "Hindi",      native: "हिन्दी" },
  { code: "sw", label: "Swahili",    native: "Kiswahili" },
  { code: "ha", label: "Hausa",      native: "Hausa" },
  { code: "yo", label: "Yoruba",     native: "Yorùbá" },
  { code: "ig", label: "Igbo",       native: "Igbo" },
];

export default function LanguageSwitcher({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Lang>(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click / Escape
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(lang: Lang) {
    setCurrent(lang);
    setOpen(false);
    // Later: call your i18n setter here, e.g. i18n.changeLanguage(lang.code)
    // and set document.dir = lang.rtl ? "rtl" : "ltr".
    document.documentElement.lang = lang.code;
  }

  return (
    <div className={inline ? "relative w-full" : "relative"} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-sm font-medium text-ink transition hover:bg-mist ${inline ? "h-10 w-full justify-between" : "h-9"}`}
      >
        <Globe size={18} strokeWidth={1.75} />
        <span className={inline ? "inline" : "hidden sm:inline"}>{current.code.toUpperCase()}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className={
            inline
              ? "mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-hairline bg-paper p-1.5"
              : "absolute right-0 z-40 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-hairline bg-paper p-1.5 shadow-lg"
          }
        >
          {LANGUAGES.map((lang) => {
            const selected = lang.code === current.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={selected}
                onClick={() => choose(lang)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected ? "bg-mist" : "hover:bg-mist"
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-medium text-ink" dir={lang.rtl ? "rtl" : "ltr"}>
                    {lang.native}
                  </span>
                  <span className="text-[12px] text-muted">{lang.label}</span>
                </span>
                {selected && (
                  <Check size={16} strokeWidth={2} className="text-brand-green" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
