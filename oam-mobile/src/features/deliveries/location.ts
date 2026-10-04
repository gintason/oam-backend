/**
 * Location helpers: current position, address search / reverse lookup, map
 * deep links, and the rider's live-location reporter.
 *
 * Search uses OSM Nominatim (no key). Reverse lookup prefers the phone's own
 * geocoder (expo-location) and falls back to Nominatim.
 */
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { riderApi } from "./api";

export type Hit = { address: string; lat: number; lng: number };

const NOMINATIM = "https://nominatim.openstreetmap.org";
const HEADERS: Record<string, string> = Platform.OS === "web"
  ? { Accept: "application/json" }
  : { Accept: "application/json", "User-Agent": "OAM-App/1.0 (support@oam-app.com)" };

function shorten(s: string) {
  return s.split(",").map((p) => p.trim()).filter((p) => p && p !== "Nigeria" && !/^\d{5,6}$/.test(p)).slice(0, 4).join(", ");
}

export async function searchPlaces(q: string, near?: { lat: number; lng: number }): Promise<Hit[]> {
  if (q.trim().length < 3) return [];
  const p = new URLSearchParams({ q: q.trim(), format: "jsonv2", limit: "6", countrycodes: "ng" });
  if (near) { const d = 0.6; p.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`); }
  try {
    const r = await fetch(`${NOMINATIM}/search?${p}`, { headers: HEADERS });
    if (!r.ok) return [];
    const rows = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    return rows.map((x) => ({ address: shorten(x.display_name), lat: Number(x.lat), lng: Number(x.lon) }));
  } catch { return []; }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (Platform.OS !== "web") {
    try {
      const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const parts = [a?.name, a?.street, a?.district ?? a?.subregion, a?.city].filter(Boolean) as string[];
      const uniq = parts.filter((v, i) => parts.indexOf(v) === i);
      if (uniq.length) return uniq.join(", ");
    } catch { /* fall through */ }
  }
  try {
    const p = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "18" });
    const r = await fetch(`${NOMINATIM}/reverse?${p}`, { headers: HEADERS });
    const j = (await r.json()) as { display_name?: string };
    if (j.display_name) return shorten(j.display_name);
  } catch { /* ignore */ }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export async function currentPosition(): Promise<{ lat: number; lng: number }> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error("Allow location access to use your current position.");
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 }).catch(() => null);
  const pos = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Turn-by-turn in Google Maps (or Apple Maps), falling back to the web. */
export function openDirections(lat: number | string, lng: number | string, label = "") {
  const dest = `${lat},${lng}`;
  const native = Platform.select({
    ios: `comgooglemaps://?daddr=${dest}&directionsmode=driving`,
    android: `google.navigation:q=${dest}`,
    default: "",
  });
  const apple = `http://maps.apple.com/?daddr=${dest}&q=${encodeURIComponent(label)}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  (async () => {
    try {
      if (native && (await Linking.canOpenURL(native))) return Linking.openURL(native);
      if (Platform.OS === "ios") return Linking.openURL(apple);
    } catch { /* fall back */ }
    Linking.openURL(web).catch(() => {});
  })();
}

export function callNumber(phone: string) {
  const tel = phone.replace(/[^\d+]/g, "");
  if (tel) Linking.openURL(`tel:${tel}`).catch(() => {});
}

export function smsNumber(phone: string, body = "") {
  const tel = phone.replace(/[^\d+]/g, "");
  if (tel) Linking.openURL(`sms:${tel}${body ? `${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}` : ""}`).catch(() => {});
}

/**
 * While the rider is online, report their position (every ~15 s or 40 m) so
 * dispatch can match them and customers can watch them move. Foreground only.
 */
export function useRiderLocationReporter(enabled: boolean, onPosition?: (p: { lat: number; lng: number }) => void) {
  const cb = useRef(onPosition);
  cb.current = onPosition;
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    let lastSent = 0;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || cancelled) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 15_000, distanceInterval: 40 },
          (pos) => {
            const p = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
            cb.current?.(p);
            const now = Date.now();
            if (now - lastSent < 10_000) return;      // stay well under the server throttle
            lastSent = now;
            riderApi.location(p.lat, p.lng).catch(() => {});
          },
        );
        if (cancelled) sub.remove();
      } catch { /* location unavailable */ }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled]);
}
