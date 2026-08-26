import { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, BedDouble, Globe2, Search, ExternalLink, MapPin } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { HOTEL_DESTINATIONS, KLOOK_LINK } from "@/features/travel";

const REGION_TABS = Object.keys(HOTEL_DESTINATIONS);

export default function Hotels() {
  const router = useRouter();
  const { t } = useTranslation();
  const [region, setRegion] = useState(REGION_TABS[0]);
  const open = () => WebBrowser.openBrowserAsync(KLOOK_LINK);

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("travel.hotels.back")}</Text>
        </Pressable>

        {/* Hero */}
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#0a0a0a" }}>
          <LinearGradient colors={["rgba(11,115,39,0.30)", "transparent"]} start={{ x: 0, y: 1 }} end={{ x: 0.8, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: "row", height: 3 }}>
            <View style={{ flex: 1, backgroundColor: colors.brand.black }} />
            <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
            <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
          </View>
          <View style={{ padding: 22 }}>
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
              <Globe2 size={13} color="rgba(255,255,255,0.8)" />
              <Text variant="caption" color="paper" style={{ opacity: 0.8 }}>{t("travel.hotels.badge")}</Text>
            </View>
            <Text variant="display" color="paper" style={{ fontSize: 28, marginTop: 14 }}>{t("travel.hotels.title")}</Text>
            <Text variant="body" color="paper" style={{ opacity: 0.7, marginTop: 8, lineHeight: 21 }}>
              {t("travel.hotels.subtitle")}
            </Text>
            <Pressable onPress={open} style={{ marginTop: 20, alignSelf: "flex-start", height: 48, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand.red, paddingHorizontal: 22, borderRadius: 12 }}>
              <Search size={17} strokeWidth={2} color="#FFF" />
              <Text variant="label" color="paper">{t("travel.hotels.search")}</Text>
              <ExternalLink size={14} strokeWidth={2} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Text variant="caption" color="paper" style={{ opacity: 0.45, marginTop: 12 }}>{t("travel.hotels.opensKlook")}</Text>
          </View>
        </View>

        {/* Region tabs */}
        <Text variant="title" style={{ marginTop: 22, marginBottom: 12 }}>{t("travel.hotels.whereToStay")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {REGION_TABS.map((r) => {
            const sel = region === r;
            return (
              <Pressable key={r} onPress={() => setRegion(r)} style={{ paddingHorizontal: 16, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper }}>
                <Text variant="label" color={sel ? "paper" : "ink"}>{r}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Destinations */}
        <View style={{ gap: 10, marginTop: 14 }}>
          {HOTEL_DESTINATIONS[region].map((d) => (
            <Pressable key={d.city} onPress={open} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MapPin size={15} strokeWidth={1.75} color={colors.brand.green} />
                <Text variant="label" color="ink">{d.city}</Text>
                <Text variant="caption" color="muted">· {d.country}</Text>
              </View>
              <Text variant="caption" color="muted" style={{ marginTop: 6, lineHeight: 18 }}>{d.blurb}</Text>
            </Pressable>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={{ marginTop: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 24, alignItems: "center" }}>
          <View style={{ height: 48, width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <BedDouble size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <Text variant="heading" style={{ fontSize: 19, marginTop: 12, textAlign: "center" }}>{t("travel.hotels.readyTitle")}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 6, textAlign: "center", lineHeight: 19 }}>{t("travel.hotels.readyBody")}</Text>
          <Pressable onPress={open} style={{ marginTop: 18, height: 48, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand.green, paddingHorizontal: 26, borderRadius: 12 }}>
            <Text variant="label" color="paper">{t("travel.hotels.search")}</Text>
            <ExternalLink size={15} strokeWidth={2} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
