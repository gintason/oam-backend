import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { LANGUAGES } from "../i18n";

/**
 * Language picker. Changing it flips i18next's active language, which the
 * i18n module turns into <html lang/dir> — so choosing Arabic mirrors the
 * whole app to RTL automatically.
 *
 * Uses logical spacing utilities (ps-*, pe-*, start-*) so the icon and chevron
 * sit correctly in both LTR and RTL.
 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  return (
    <div className={`relative ${className}`}>
      <Globe
        size={15}
        strokeWidth={1.75}
        className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <select
        aria-label={t("language.label")}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-hairline bg-paper ps-8 pe-3 text-sm font-medium text-ink outline-none transition hover:bg-mist focus:border-brand-green"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  );
}
