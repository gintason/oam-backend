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
 *   3. add an entry to LANGUAGES (and to RTL_LANGS if it reads right-to-left)
 *
 * The active language is remembered in localStorage ("oam_lang") and, on a
 * fresh visitor, guessed from their browser. <html lang/dir> is kept in sync
 * so RTL languages (Arabic, etc.) mirror the entire layout automatically.
 */

// Languages that read right-to-left. Layout mirrors for these.
export const RTL_LANGS = ["ar", "he", "fa", "ur"];

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

/** Mirror <html> to the active language: sets lang + dir (ltr/rtl). */
function applyDir(lng: string) {
  const base = (lng || "en").split("-")[0];
  const dir = RTL_LANGS.includes(base) ? "rtl" : "ltr";
  const root = document.documentElement;
  root.setAttribute("lang", base);
  root.setAttribute("dir", dir);
}

applyDir(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", applyDir);

export default i18n;
