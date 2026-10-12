import { useTranslation } from "react-i18next";
import { ANDROID_APP_URL, IOS_APP_URL } from "../lib/appStores";

/* Store glyphs — inline SVG (lucide has no brand icons) */
export const PlayGlyph = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M3.6 2.3 13.3 12 3.6 21.7c-.3-.2-.5-.6-.5-1V3.3c0-.4.2-.8.5-1z" fill="#00D3FF" />
    <path d="M16.9 8.4 13.3 12l3.6 3.6 3.9-2.2c.7-.4.7-1.4 0-1.8l-3.9-2.2z" fill="#FFCE00" />
    <path d="M3.6 2.3c.3-.2.7-.2 1.1 0l11.2 6.1L13.3 12 3.6 2.3z" fill="#00F076" />
    <path d="M3.6 21.7 13.3 12l2.6 3.6-11.2 6.1c-.4.2-.8.2-1.1 0z" fill="#FF3A44" />
  </svg>
);

export const AppleGlyph = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.3 10.38.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.73-1.05-2.76-4.15zM14.6 4.3c.72-.87 1.2-2.08 1.07-3.3-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.44z" />
  </svg>
);

type Store = "android" | "ios";

/** An official-style store badge. Renders a calm "Coming soon" pill when the store link isn't set yet. */
export function StoreBadge({ store, size = "md", onPress }: { store: Store; size?: "md" | "lg"; onPress?: () => void }) {
  const { t } = useTranslation();
  const href = store === "android" ? ANDROID_APP_URL : IOS_APP_URL;
  const big = store === "android" ? "Google Play" : "App Store";
  const small = store === "android" ? t("appPromo.getItOn", "GET IT ON") : t("appPromo.downloadOn", "Download on the");
  const glyph = store === "android" ? <PlayGlyph size={size === "lg" ? 24 : 20} /> : <AppleGlyph size={size === "lg" ? 24 : 20} />;
  const box =
    size === "lg"
      ? "w-full justify-center gap-3 rounded-2xl px-5 py-3.5"
      : "flex-1 justify-center gap-2.5 rounded-xl px-3.5 py-2.5";
  const label = (
    <span className="text-left leading-none">
      <span className={`block ${size === "lg" ? "text-[10px]" : "text-[9px]"} tracking-wide text-white/70`}>
        {href ? small : t("appPromo.comingSoon", "Coming soon")}
      </span>
      <span className={`mt-0.5 block font-semibold ${size === "lg" ? "text-[17px]" : "text-[14px]"}`}>{big}</span>
    </span>
  );
  if (!href) {
    return (
      <span aria-disabled="true" className={`inline-flex items-center bg-ink/60 text-white ${box} cursor-default`}>
        {glyph}
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onPress}
      className={`inline-flex items-center bg-ink text-white shadow-[0_8px_20px_-8px_rgba(17,17,17,0.55)] transition hover:-translate-y-px hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 ${box}`}
    >
      {glyph}
      {label}
    </a>
  );
}
