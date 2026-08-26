import { View, ScrollView, Pressable, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, ExternalLink, ShoppingCart, ShieldCheck, Clock } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { partnerBySlug, PARTNER_LOGOS } from "@/features/ecommerce/partners";

export default function EcommerceCompany() {
  const router = useRouter();
  const { t } = useTranslation();
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const p = partnerBySlug(slug);

  if (!p) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}><Text variant="title">{t("ecommerce.storeNotFound")}</Text></View>
      </Screen>
    );
  }

  const pending = !p.link;
  const open = () => { if (p.link) WebBrowser.openBrowserAsync(p.link); };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("ecommerce.allStores")}</Text>
        </Pressable>

        {/* Hero */}
        <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
          <View style={{ height: 6, backgroundColor: p.accent }} />
          <View style={{ padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ height: 72, width: 96, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", padding: 10 }}>
                <Image source={PARTNER_LOGOS[p.slug]} style={{ height: "100%", width: "100%" }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="heading" style={{ fontSize: 22 }}>{p.name}</Text>
                <Text variant="caption" color="muted">{t(`ecommerce.partners.${p.slug}.tagline`, { defaultValue: p.tagline })}</Text>
              </View>
            </View>
            <Text variant="body" color="ink" style={{ marginTop: 14, lineHeight: 21 }}>{t(`ecommerce.partners.${p.slug}.blurb`, { defaultValue: p.blurb })}</Text>

            {pending ? (
              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(180,83,9,0.3)", backgroundColor: "rgba(180,83,9,0.05)", paddingHorizontal: 14, paddingVertical: 12 }}>
                <Clock size={16} strokeWidth={1.75} color={colors.warn} />
                <Text variant="caption" color="ink" style={{ flex: 1 }}>{t("ecommerce.pending", { name: p.name })}</Text>
              </View>
            ) : (
              <Pressable onPress={open} style={{ marginTop: 16, height: 50, borderRadius: 12, backgroundColor: colors.brand.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <ShoppingCart size={17} strokeWidth={1.75} color="#FFF" />
                <Text variant="label" color="paper">{t("ecommerce.shopOn", { name: p.name })}</Text>
                <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Categories */}
        <Text variant="title" style={{ marginTop: 22, marginBottom: 12 }}>{t("ecommerce.popularCategories")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {p.categories.map((c) => (
            <Pressable key={c} onPress={open} disabled={pending} style={{ width: "48.5%", marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 14, opacity: pending ? 0.5 : 1 }}>
              <Text variant="label" color="ink">{c}</Text>
              <ExternalLink size={14} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14, flexDirection: "row", gap: 8 }}>
          <ShieldCheck size={16} strokeWidth={1.75} color={colors.brand.green} style={{ marginTop: 1 }} />
          <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
            {t("ecommerce.companyDisclosure", { name: p.name })}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
