import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

/**
 * i18n setup for OAM.
 *
 * Add a language in three steps:
 *   1. create src/i18n/locales/<code>.json (copy en.json, translate values)
 *   2. import it and add to `resources` below
 *   3. add an entry to LANGUAGES
 *
 * The active language is remembered in localStorage ("oam_lang") and, on a
 * fresh visitor, guessed from their browser. Only the *text* changes — the
 * layout stays left-to-right for every language (see applyLang below).
 */

// Shown in the language switcher, in this order.
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "ar", label: "Arabic", native: "العربية" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "oam_lang",
    },
    // Resources are bundled inline, so translation is synchronous — no Suspense
    // boundary needed and no risk of a blank flash on first paint.
    react: { useSuspense: false },
  });

/**
 * Keep <html lang> in sync for accessibility, but always force LTR layout.
 *
 * We deliberately do NOT switch to dir="rtl" for Arabic: the app should only
 * translate the *text*, keeping the visual layout left-to-right in every
 * language. (RTL mirroring can be re-enabled later by setting dir from
 * RTL_LANGS if a fully right-to-left experience is ever wanted.)
 */
function applyLang(lng: string) {
  const base = (lng || "en").split("-")[0];
  const root = document.documentElement;
  root.setAttribute("lang", base);
  root.setAttribute("dir", "ltr");
}

applyLang(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", applyLang);

export default i18n;
