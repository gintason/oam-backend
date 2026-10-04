/**
 * Maps without a new npm dependency or an API key:
 *  - Leaflet is loaded once from the unpkg CDN on first use.
 *  - Tiles: OpenStreetMap. Address search / reverse lookup: OSM Nominatim
 *    (free; keep requests user-driven and debounced — max ~1/s).
 *
 * Swap `searchPlaces` / `reverseGeocode` for Google Places later without
 * touching the pages that call them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LeafletNS = any;

const LEAFLET_VERSION = "1.9.4";
let loading: Promise<LeafletNS> | null = null;

export function loadLeaflet(): Promise<LeafletNS> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    s.async = true;
    s.onload = () => resolve(w.L);
    s.onerror = () => { loading = null; reject(new Error("Map failed to load")); };
    document.head.appendChild(s);
  });
  return loading;
}

export const LAGOS = { lat: 6.5244, lng: 3.3792 };

export type PlaceHit = { address: string; lat: number; lng: number };

const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function searchPlaces(query: string, near?: { lat: number; lng: number }): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "6", countrycodes: "ng", addressdetails: "0" });
  if (near) {
    const d = 0.6;
    params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  const r = await fetch(`${NOMINATIM}/search?${params}`, { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const rows = (await r.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((x) => ({ address: shorten(x.display_name), lat: Number(x.lat), lng: Number(x.lon) }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "18" });
    const r = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error();
    const j = (await r.json()) as { display_name?: string };
    return j.display_name ? shorten(j.display_name) : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/** "12, Adeola Odeku Street, Victoria Island, Eti-Osa, Lagos State, 106104, Nigeria" → first 4 parts. */
function shorten(s: string) {
  return s.split(",").map((p) => p.trim()).filter((p) => p && p !== "Nigeria" && !/^\d{5,6}$/.test(p))
    .slice(0, 4).join(", ");
}

export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available in this browser."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error("Allow location access, or search for the address.")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function directionsUrl(lat: number | string, lng: number | string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
