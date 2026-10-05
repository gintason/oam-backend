/**
 * City input for the artisan profile: type ANY city, pick from suggestions
 * (the popular Nigerian cities instantly, plus worldwide matches from
 * OpenStreetMap), or use the phone's location. A typed city that isn't picked
 * is still saved as typed, and located in the background so artisans keep
 * showing up in "near me" searches.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { Crosshair, MapPin } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { CITIES } from "@/entities/homeservices";

export type CityPick = { city: string; state?: string; country?: string; lat?: number; lng?: number };
type Hit = Required<Pick<CityPick, "city">> & CityPick & { label: string };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const HEADERS: Record<string, string> = Platform.OS === "web"
  ? { Accept: "application/json" }
  : { Accept: "application/json", "User-Agent": "OAM-App/1.0 (support@oam-app.com)" };

async function searchCities(q: string): Promise<Hit[]> {
  const p = new URLSearchParams({ q, format: "jsonv2", addressdetails: "1", limit: "8", featureType: "city", "accept-language": "en" });
  try {
    const r = await fetch(`${NOMINATIM}?${p}`, { headers: HEADERS });
    if (!r.ok) return [];
    const rows = (await r.json()) as { name?: string; display_name: string; lat: string; lon: string;
      address?: Record<string, string> }[];
    const seen = new Set<string>();
    return rows.map((x) => {
      const a = x.address ?? {};
      const city = x.name || a.city || a.town || a.village || x.display_name.split(",")[0];
      const state = a.state || a.region || a.county || "";
      const country = a.country || "";
      return { city, state, country, lat: Number(x.lat), lng: Number(x.lon), label: [city, state, country].filter(Boolean).join(", ") };
    }).filter((h) => (seen.has(h.label) ? false : (seen.add(h.label), true)));
  } catch { return []; }
}

export function CityField({
  label, value, onChange, placeholder = "e.g. Abuja, Accra, London",
}: { label: string; value: string; onChange: (pick: CityPick) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState("");
  const picked = useRef(value);

  // Follow outside updates (profile prefill).
  const last = useRef(value);
  if (value !== last.current) { last.current = value; if (value !== text) setText(value); }

  const q = text.trim();
  const local: Hit[] = q.length >= 1
    ? CITIES.filter((c) => c.name.toLowerCase().startsWith(q.toLowerCase()))
        .map((c) => ({ city: c.name, country: "Nigeria", lat: c.lat, lng: c.lng, label: `${c.name}, Nigeria` }))
    : [];

  useEffect(() => {
    if (!focused || q.length < 2 || q === picked.current) { setHits([]); return; }
    const id = setTimeout(async () => { setBusy("search"); setHits(await searchCities(q)); setBusy(null); }, 500);
    return () => clearTimeout(id);
  }, [q, focused]);

  function choose(h: CityPick) {
    picked.current = h.city;
    setText(h.city);
    setHits([]);
    setErr("");
    onChange(h);
  }

  const textRef = useRef(text);
  textRef.current = text;

  function onBlur() {
    // Wait a moment so a tap on a suggestion is handled first; then keep
    // whatever was typed (if no suggestion was picked).
    setTimeout(async () => {
      setFocused(false);
      const typed = textRef.current.trim();
      if (!typed || typed === picked.current) return;
      picked.current = typed;
      onChange({ city: typed });                    // keep exactly what they typed …
      const [best] = await searchCities(typed);     // … and locate it quietly for distance search
      if (best && best.city.toLowerCase() === typed.toLowerCase() && picked.current === typed) {
        onChange({ city: typed, state: best.state, country: best.country, lat: best.lat, lng: best.lng });
      }
    }, 250);
  }

  async function useLocation() {
    setErr(""); setBusy("gps");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("Allow location access, or type your city.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let city = "", state = "", country = "";
      try {
        const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        city = a?.city || a?.subregion || a?.district || "";
        state = a?.region || ""; country = a?.country || "";
      } catch { /* fall through */ }
      if (!city) throw new Error("Couldn't work out your city — please type it.");
      choose({ city, state, country, lat, lng });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  const list = [...local, ...hits.filter((h) => !local.some((l) => l.city.toLowerCase() === h.city.toLowerCase() && h.country === "Nigeria"))].slice(0, 8);
  const showList = focused && q.length >= 1 && q !== picked.current && list.length > 0;

  return (
    <View style={{ marginBottom: 2 }}>
      <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 52, borderRadius: 12, borderWidth: focused ? 2 : 1,
                     borderColor: focused ? colors.brand.green : colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12 }}>
        <MapPin size={17} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); setErr(""); }}
          onFocus={() => setFocused(true)}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel={label}
          style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, height: "100%" }}
        />
        {busy === "search" ? <ActivityIndicator size="small" color={colors.muted} /> : null}
        <Pressable onPress={useLocation} hitSlop={6} accessibilityLabel="Use my location"
          style={{ height: 34, width: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
          {busy === "gps" ? <ActivityIndicator size="small" color={colors.brand.green} /> : <Crosshair size={16} color={colors.brand.green} />}
        </Pressable>
      </View>
      {err ? <Text variant="caption" color="danger" style={{ marginTop: 6 }}>{err}</Text> : null}
      {showList ? (
        <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
          {list.map((h, i) => (
            <Pressable key={`${h.label}-${i}`} onPress={() => choose(h)}
              style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
              <MapPin size={15} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text variant="body">{h.city}</Text>
                <Text variant="caption" color="muted">{[h.state, h.country].filter(Boolean).join(", ")}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text variant="caption" color="muted" style={{ marginTop: 6 }}>Type any city, or tap the target to use your location.</Text>
      )}
    </View>
  );
}
