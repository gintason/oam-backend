import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import zh from "./locales/zh.json";
import ar from "./locales/ar.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";
import hi from "./locales/hi.json";
import ru from "./locales/ru.json";
import ha from "./locales/ha.json";
import ig from "./locales/ig.json";
import yo from "./locales/yo.json";

/**
 * i18n setup for OAM — 12 languages.
 *
 * PROGRESSIVE FILL: English is the complete source of truth. Any key missing
 * from a language falls back to English (fallbackLng), so a not-yet-translated
 * language shows English rather than machine output — nothing unreviewed
 * reaches users by accident. French is the current fully-translated demo
 * language (home page + Bills pages).
 *
 * Only the text changes on switch — layout stays left-to-right in every
 * language (see applyLang; no RTL mirroring).
 *
 * `flag` is an ISO 3166-1 alpha-2 country code, rendered as an SVG via the
 * flag-icons package (see LanguageSwitcher). Flags represent countries, not
 * languages, so several are approximations (Hausa/Igbo/Yoruba -> ng, etc.).
 */
export const LANGUAGES = [
  { code: "en", label: "English",    native: "English",   flag: "gb" },
  { code: "es", label: "Spanish",    native: "Español",   flag: "es" },
  { code: "fr", label: "French",     native: "Français",  flag: "fr" },
  { code: "zh", label: "Mandarin",   native: "中文",       flag: "cn" },
  { code: "ar", label: "Arabic",     native: "العربية",   flag: "sa" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "pt" },
  { code: "de", label: "German",     native: "Deutsch",   flag: "de" },
  { code: "hi", label: "Hindi",      native: "हिन्दी",     flag: "in" },
  { code: "ru", label: "Russian",    native: "Русский",   flag: "ru" },
  { code: "ha", label: "Hausa",      native: "Hausa",     flag: "ng" },
  { code: "ig", label: "Igbo",       native: "Igbo",      flag: "ng" },
  { code: "yo", label: "Yoruba",     native: "Yorùbá",    flag: "ng" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }, es: { translation: es }, fr: { translation: fr },
      zh: { translation: zh }, ar: { translation: ar }, pt: { translation: pt },
      de: { translation: de }, hi: { translation: hi }, ru: { translation: ru },
      ha: { translation: ha }, ig: { translation: ig }, yo: { translation: yo },
    },
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "oam_lang",
    },
    react: { useSuspense: false },
  });

function applyLang(lng: string) {
  const base = (lng || "en").split("-")[0];
  const root = document.documentElement;
  root.setAttribute("lang", base);
  root.setAttribute("dir", "ltr");
}
applyLang(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", applyLang);

export default i18n;
