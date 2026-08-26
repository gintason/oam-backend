import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
 * Mobile i18n — mirrors the web's 20-language setup.
 *
 * English is the source of truth; any missing key falls back to English
 * (fallbackLng). The chosen language is remembered in AsyncStorage
 * ("oam_lang" — same key name as the web's localStorage) and, on first launch,
 * guessed from the device language. Text-only: layout stays LTR everywhere.
 */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "ig", label: "Igbo", native: "Igbo" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "cs", label: "Czech", native: "Čeština" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "zh", label: "Simplified Chinese", native: "简体中文" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "bg", label: "Bulgarian", native: "Български" },
  { code: "sr", label: "Serbian", native: "Српски" },
] as const;

export const STORAGE_KEY = "oam_lang";

const resources = {
  en: { translation: en }, fr: { translation: fr }, ha: { translation: ha }, ig: { translation: ig },
  yo: { translation: yo }, es: { translation: es }, de: { translation: de }, ru: { translation: ru },
  it: { translation: it }, pt: { translation: pt }, cs: { translation: cs }, pl: { translation: pl },
  tr: { translation: tr }, el: { translation: el }, hi: { translation: hi }, ar: { translation: ar },
  zh: { translation: zh }, th: { translation: th }, bg: { translation: bg }, sr: { translation: sr },
};

function deviceLanguage(): string {
  try {
    const code = getLocales()?.[0]?.languageCode ?? null;
    return code && LANGUAGES.some((l) => l.code === code) ? code : "en";
  } catch {
    return "en";
  }
}

// Synchronous init so text is ready on first paint (resources are bundled).
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: "en",
  supportedLngs: LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Then apply the saved preference (if any) once AsyncStorage resolves.
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language && LANGUAGES.some((l) => l.code === saved)) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => {});

/** Change language app-wide and remember it. */
export async function setLanguage(code: string) {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore persistence errors */
  }
}

export function currentLanguage() {
  const base = (i18n.language || "en").split("-")[0];
  return LANGUAGES.find((l) => l.code === base) ?? LANGUAGES[0];
}

export default i18n;
