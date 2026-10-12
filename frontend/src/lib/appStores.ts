/**
 * Where to download the OAM mobile apps.
 *
 * Set VITE_ANDROID_APP_URL / VITE_IOS_APP_URL on Render to override. Android
 * defaults to the Play Store page for the app's package (com.oam.mobile); iOS has
 * no default because App Store links contain a numeric app id — until it's set,
 * the App Store badge shows "Coming soon" and iPhone visitors aren't prompted.
 */
export const ANDROID_APP_URL =
  (import.meta.env.VITE_ANDROID_APP_URL as string | undefined) ||
  "https://play.google.com/store/apps/details?id=com.oam.mobile";

export const IOS_APP_URL = (import.meta.env.VITE_IOS_APP_URL as string | undefined) || "";

export type DevicePlatform = "ios" | "android" | "desktop";

export function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}
