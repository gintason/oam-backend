import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ha from "./locales/ha.json";
import ig from "./locales/ig.json";
import yo from "./locales/yo.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ru from "./locales/ru.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import cs from "./locales/cs.json";
import pl from "./locales/pl.json";
import tr from "./locales/tr.json";
import el from "./locales/el.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import th from "./locales/th.json";
import bg from "./locales/bg.json";
import sr from "./locales/sr.json";

/**
 * i18n setup for OAM — 20 languages.
 *
 * PROGRESSIVE FILL: English is the complete source of truth. Any key missing
 * from a language falls back to English (fallbackLng), so a not-yet-translated
 * language shows English rather than machine output. French is the current
 * fully-translated demo language (home page + Bills pages).
 *
 * Text-only switch; layout stays left-to-right in every language (applyLang).
 *
 * `flag` is an ISO 3166-1 alpha-2 country code, rendered as SVG via flag-icons.
 * Flags represent countries, not languages, so some are approximations
 * (Hausa/Igbo/Yoruba -> ng; Arabic -> sa; English -> gb).
 */
export const LANGUAGES = [
  { code: "en", label: "English",            native: "English",   flag: "gb" },
  { code: "fr", label: "French",             native: "Français",  flag: "fr" },
  { code: "ha", label: "Hausa",              native: "Hausa",     flag: "ng" },
  { code: "ig", label: "Igbo",               native: "Igbo",      flag: "ng" },
  { code: "yo", label: "Yoruba",             native: "Yorùbá",    flag: "ng" },
  { code: "es", label: "Spanish",            native: "Español",   flag: "es" },
  { code: "de", label: "German",             native: "Deutsch",   flag: "de" },
  { code: "ru", label: "Russian",            native: "Русский",   flag: "ru" },
  { code: "it", label: "Italian",            native: "Italiano",  flag: "it" },
  { code: "pt", label: "Portuguese",         native: "Português", flag: "pt" },
  { code: "cs", label: "Czech",              native: "Čeština",   flag: "cz" },
  { code: "pl", label: "Polish",             native: "Polski",    flag: "pl" },
  { code: "tr", label: "Turkish",            native: "Türkçe",    flag: "tr" },
  { code: "el", label: "Greek",              native: "Ελληνικά",  flag: "gr" },
  { code: "hi", label: "Hindi",              native: "हिन्दी",     flag: "in" },
  { code: "ar", label: "Arabic",             native: "العربية",   flag: "sa" },
  { code: "zh", label: "Simplified Chinese", native: "简体中文",   flag: "cn" },
  { code: "th", label: "Thai",               native: "ไทย",       flag: "th" },
  { code: "bg", label: "Bulgarian",          native: "Български", flag: "bg" },
  { code: "sr", label: "Serbian",            native: "Српски",    flag: "rs" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }, fr: { translation: fr }, ha: { translation: ha },
      ig: { translation: ig }, yo: { translation: yo }, es: { translation: es },
      de: { translation: de }, ru: { translation: ru }, it: { translation: it },
      pt: { translation: pt }, cs: { translation: cs }, pl: { translation: pl },
      tr: { translation: tr }, el: { translation: el }, hi: { translation: hi }, ar: { translation: ar },
      zh: { translation: zh }, th: { translation: th }, bg: { translation: bg },
      sr: { translation: sr },
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
