import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, SlidersHorizontal, Star, X } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import { CONDITIONS } from "@/entities/marketplace";
import { catLabel } from "@/shared/i18n/labels";

export default function MarketBrowse() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ category?: string }>();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(params.category ?? "");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQ = useDebounced(q, 400);
  const categories = useQuery({ queryKey: ["marketplace", "categories"], queryFn: marketplaceApi.categories });

  const listings = useQuery({
    queryKey: ["marketplace", "browse", debouncedQ, category, condition, location, minPrice, maxPrice],
    queryFn: () => marketplaceApi.browse({
      q: debouncedQ || undefined, category: category || undefined, condition: condition || undefined,
      location: location || undefined, min_price: minPrice || undefined, max_price: maxPrice || undefined,
    }),
  });

  const catChips = [{ slug: "", label: t("marketplace.browse.all") }, ...(categories.data ?? [])
    .map((c) => ({ slug: c.slug, label: catLabel(t, c.slug, c.name) }))
    .sort((a, b) => (a.slug === "oam-motors" ? -1 : b.slug === "oam-motors" ? 1 : 0))];

  const activeFilters = [condition, location, minPrice, maxPrice].filter(Boolean).length;
  const results = listings.data?.results ?? [];

  return (
    <Screen edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("marketplace.navMarketplace")}</Text>
        </Pressable>

        {/* Search + filters */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
            <Search size={16} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={t("marketplace.browse.searchPlaceholder")} placeholderTextColor={colors.muted} style={{ flex: 1, height: 46, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
          </View>
          <Pressable onPress={() => setShowFilters(true)} style={{ height: 46, width: 46, borderRadius: 12, borderWidth: 1, borderColor: activeFilters ? colors.brand.green : colors.hairline, backgroundColor: activeFilters ? "rgba(11,115,39,0.10)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
            <SlidersHorizontal size={18} color={activeFilters ? colors.brand.green : colors.muted} />
          </Pressable>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4, paddingVertical: 12 }}>
          {catChips.map((c) => {
            const sel = category === c.slug;
            return (
              <Pressable key={c.slug || "all"} onPress={() => setCategory(c.slug)} style={{ paddingHorizontal: 14, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper }}>
                <Text variant="caption" color={sel ? "paper" : "ink"}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {listings.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 40 }} />
        ) : results.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: "center", gap: 6 }}>
            <Text variant="title">{t("marketplace.browse.emptyTitle")}</Text>
            <Text variant="caption" color="muted">{t("marketplace.browse.emptyFiltered")}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {results.map((l) => (
              <Pressable key={l.id} onPress={() => router.push({ pathname: "/listing", params: { id: l.id } })} style={{ width: "48.5%", marginBottom: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
                <View style={{ height: 130, backgroundColor: colors.mist }}>
                  {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
                  {l.is_featured ? (
                    <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(227,16,18,0.92)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                      <Star size={10} color="#FFF" fill="#FFF" /><Text variant="caption" color="paper" style={{ fontSize: 10 }}>{t("marketplace.featured")}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ padding: 10 }}>
                  <Text variant="label" color="ink" numberOfLines={1}>{l.title}</Text>
                  <Text variant="label" color="red" style={{ marginTop: 2 }}>{naira(l.price)}{l.negotiable ? <Text variant="caption" color="muted"> · {t("marketplace.negotiable")}</Text> : null}</Text>
                  {l.location ? <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>{l.location}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filters sheet */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable onPress={() => setShowFilters(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text variant="heading">{t("marketplace.browse.filters")}</Text>
              <Pressable onPress={() => setShowFilters(false)} hitSlop={8}><X size={20} color={colors.muted} /></Pressable>
            </View>

            <Text variant="label" style={{ marginBottom: 8 }}>{t("marketplace.browse.condition")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[{ value: "", label: t("marketplace.browse.anyCondition") }, ...CONDITIONS].map((c) => {
                const sel = condition === c.value;
                const label = c.value ? t(`marketplace.conditions.${c.value}`, { defaultValue: c.label }) : c.label;
                return (
                  <Pressable key={c.value || "any"} onPress={() => setCondition(c.value)} style={{ paddingHorizontal: 14, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper }}>
                    <Text variant="caption" color={sel ? "green" : "ink"}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input label={t("marketplace.browse.location")} value={location} onChangeText={setLocation} placeholder={t("marketplace.browse.locationPlaceholder")} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Input label={t("marketplace.browse.min")} value={minPrice} onChangeText={(v) => setMinPrice(v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="0" /></View>
              <View style={{ flex: 1 }}><Input label={t("marketplace.browse.max")} value={maxPrice} onChangeText={(v) => setMaxPrice(v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder={t("marketplace.browse.any")} /></View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Button title={t("marketplace.browse.clearFilters")} variant="secondary" onPress={() => { setCondition(""); setLocation(""); setMinPrice(""); setMaxPrice(""); }} style={{ flex: 1 }} />
              <Button title={t("marketplace.browse.showResults")} onPress={() => setShowFilters(false)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
