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
 * PROGRESSIVE FILL (important):
 * English is the complete source of truth. Every other language file only needs
 * the keys that have been *translated and reviewed*. Any key missing from a
 * language automatically falls back to English (fallbackLng below). This is
 * deliberate: a not-yet-translated language shows English rather than machine
 * output, so nothing unreviewed reaches users by accident. Fill each language
 * in over time by copying en.json's structure and translating the values.
 *
 * Only the *text* changes on switch — layout stays left-to-right in every
 * language (see applyLang; no RTL mirroring).
 */

// Shown in the switcher, in this order. `native` is the label users see.
export const LANGUAGES = [
  { code: "en", label: "English",    native: "English",  flag: "🇬🇧" },
  { code: "es", label: "Spanish",    native: "Español",  flag: "🇪🇸" },
  { code: "fr", label: "French",     native: "Français", flag: "🇫🇷" },
  { code: "zh", label: "Mandarin",   native: "中文",      flag: "🇨🇳" },
  { code: "ar", label: "Arabic",     native: "العربية",  flag: "🇸🇦" },
  { code: "pt", label: "Portuguese", native: "Português",flag: "🇵🇹" },
  { code: "de", label: "German",     native: "Deutsch",  flag: "🇩🇪" },
  { code: "hi", label: "Hindi",      native: "हिन्दी",    flag: "🇮🇳" },
  { code: "ru", label: "Russian",    native: "Русский",  flag: "🇷🇺" },
  { code: "ha", label: "Hausa",      native: "Hausa",    flag: "🇳🇬" },
  { code: "ig", label: "Igbo",       native: "Igbo",     flag: "🇳🇬" },
  { code: "yo", label: "Yoruba",     native: "Yorùbá",   flag: "🇳🇬" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      zh: { translation: zh },
      ar: { translation: ar },
      pt: { translation: pt },
      de: { translation: de },
      hi: { translation: hi },
      ru: { translation: ru },
      ha: { translation: ha },
      ig: { translation: ig },
      yo: { translation: yo },
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

/**
 * Keep <html lang> in sync for accessibility, but always force LTR layout.
 * We translate text only; the visual layout stays left-to-right in every
 * language (including Arabic).
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
