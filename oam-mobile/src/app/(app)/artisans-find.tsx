import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { ArrowLeft, Search, MapPin, Navigation, BadgeCheck, Star, Wrench, ChevronRight } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { PickerField } from "@/features/travel";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";
import { CITIES, type ArtisanListItem } from "@/entities/homeservices";
import { tradeLabel, tradeLabelByName } from "@/shared/i18n/labels";

const RADII = [5, 10, 25, 50];

export default function ArtisansFind() {
  const router = useRouter();
  const { t } = useTranslation();
  const [cityName, setCityName] = useState<string>(CITIES[0].name);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: CITIES[0].lat, lng: CITIES[0].lng });
  const [usingDevice, setUsingDevice] = useState(false);
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);

  const debouncedQ = useDebounced(q, 400);
  const categories = useQuery({ queryKey: ["artisans", "categories"], queryFn: homeServicesApi.categories });
  const results = useQuery({
    queryKey: ["artisans", "search", coords.lat, coords.lng, radius, category, debouncedQ],
    queryFn: () => homeServicesApi.search({ lat: coords.lat, lng: coords.lng, radius_km: radius, category: category || undefined, q: debouncedQ || undefined }),
  });

  const catOptions = [{ value: "", label: t("artisans.find.allTrades") }, ...(categories.data ?? []).map((c) => ({ value: c.slug, label: tradeLabel(t, c.slug, c.name) }))];

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setUsingDevice(true);
    } catch { /* keep city fallback */ } finally { setLocating(false); }
  }

  function pickCity(name: string) {
    const c = CITIES.find((x) => x.name === name);
    if (!c) return;
    setCityName(name); setCoords({ lat: c.lat, lng: c.lng }); setUsingDevice(false);
  }

  const list = results.data?.results ?? [];

  return (
    <Screen edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.find.back")}</Text>
        </Pressable>
        <Text variant="heading">{t("artisans.find.title")}</Text>

        {/* Location */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <PickerField value={cityName} options={CITIES.map((c) => ({ value: c.name, label: c.name }))} onSelect={pickCity} title={t("artisans.find.yourCity")} placeholder={t("artisans.dashboard.cityLabel")} />
          </View>
          <Pressable onPress={useMyLocation} style={{ height: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: usingDevice ? colors.brand.green : colors.hairline, backgroundColor: usingDevice ? "rgba(11,115,39,0.10)" : colors.paper, flexDirection: "row", alignItems: "center", gap: 6 }}>
            {locating ? <ActivityIndicator size="small" color={colors.brand.green} /> : <Navigation size={15} color={usingDevice ? colors.brand.green : colors.muted} />}
            <Text variant="caption" color={usingDevice ? "green" : "muted"}>{usingDevice ? t("artisans.find.usingGps") : t("artisans.find.nearMe")}</Text>
          </Pressable>
        </View>

        {/* Radius */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {RADII.map((r) => {
            const sel = radius === r;
            return (
              <Pressable key={r} onPress={() => setRadius(r)} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.ink : colors.paper, borderWidth: sel ? 0 : 1, borderColor: colors.hairline }}>
                <Text variant="caption" color={sel ? "paper" : "muted"}>{t("artisans.find.radiusKm", { n: r })}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Search + category */}
        <View style={{ marginTop: 12 }}>
          <View style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginBottom: 10 }}>
            <Search size={16} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={t("artisans.find.searchPlaceholder")} placeholderTextColor={colors.muted} style={{ flex: 1, height: 46, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
          </View>
          <PickerField value={category} options={catOptions} onSelect={setCategory} title={t("artisans.dashboard.tradeLabel")} placeholder={t("artisans.find.allTrades")} searchable={false} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {results.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} />
        ) : list.length === 0 ? (
          <View style={{ marginTop: 24, alignItems: "center", gap: 6 }}>
            <Text variant="title">{t("artisans.find.emptyTitle", { radius })}</Text>
            <Text variant="caption" color="muted" style={{ textAlign: "center" }}>{t("artisans.find.emptyBody")}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Text variant="caption" color="muted">{results.data?.count === 1 ? t("artisans.find.countOne", { count: results.data?.count, radius }) : t("artisans.find.countOther", { count: results.data?.count ?? 0, radius })}</Text>
            {list.map((a) => <ArtisanCard key={a.id} a={a} onPress={() => router.push({ pathname: "/artisan", params: { id: a.id } })} />)}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ArtisanCard({ a, onPress }: { a: ArtisanListItem; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 12 }}>
      <View style={{ height: 52, width: 52, borderRadius: 12, overflow: "hidden", backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
        {a.profile_photo ? <Image source={{ uri: a.profile_photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Wrench size={22} strokeWidth={1.5} color={colors.muted} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text variant="label" color="ink" numberOfLines={1} style={{ flexShrink: 1 }}>{a.business_name}</Text>
          {a.is_verified ? <BadgeCheck size={14} strokeWidth={2} color={colors.brand.green} /> : null}
          {a.is_featured ? <Star size={12} color={colors.warn} fill={colors.warn} /> : null}
        </View>
        <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>{tradeLabelByName(t, a.category_name)}</Text>
        <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1, fontSize: 11 }}>
          {[a.city, a.state].filter(Boolean).join(", ")}{a.distance_km != null ? ` · ${a.distance_km.toFixed(1)} km` : ""}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}
