import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wrench, Search, ChevronRight, BadgeCheck, ShieldCheck, Rocket } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";

export default function Artisans() {
  const router = useRouter();
  const { t } = useTranslation();
  const mine = useQuery({ queryKey: ["artisans", "me"], queryFn: homeServicesApi.me, retry: false });
  const isArtisan = !!mine.data?.id;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.hub.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Wrench size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("artisans.hub.title")}</Text><Text variant="caption" color="muted">{t("artisans.hub.tagline")}</Text></View>
        </View>

        {/* Find an artisan */}
        <Pressable onPress={() => router.push("/artisans-find")} style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ height: 46, width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Search size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title">{t("artisans.hub.findTitle")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("artisans.hub.findDesc")}</Text>
          </View>
          <ChevronRight size={20} color={colors.muted} />
        </Pressable>

        {/* Get listed / dashboard */}
        <Pressable onPress={() => router.push("/artisan-register")} style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ height: 46, width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <BadgeCheck size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title">{isArtisan ? t("artisans.hub.profileTitleMine") : t("artisans.hub.profileActionNew")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{isArtisan ? t("artisans.hub.profileDescMine") : t("artisans.hub.profileDescNew")}</Text>
          </View>
          <ChevronRight size={20} color={colors.muted} />
        </Pressable>

        {isArtisan ? (
          <Pressable onPress={() => router.push("/artisan-verify")} style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ height: 46, width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
              <ShieldCheck size={22} strokeWidth={1.75} color={colors.brand.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title">{t("artisans.dashboard.getVerified")}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("artisans.dashboard.getVerifiedBody")}</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        {isArtisan ? (
          <Pressable onPress={() => router.push("/boost")} style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ height: 46, width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
              <Rocket size={22} strokeWidth={1.75} color={colors.brand.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title">{t("artisans.boost.hubTitle", "Boost your profile")}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("artisans.boost.hubDesc", "Get featured and rank higher in search.")}</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        <View style={{ marginTop: 20, borderRadius: 14, backgroundColor: colors.mist, padding: 14, flexDirection: "row", gap: 8 }}>
          <ShieldCheck size={16} strokeWidth={1.75} color={colors.brand.green} style={{ marginTop: 1 }} />
          <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
            {t("artisans.hub.privacyBody")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
