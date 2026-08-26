import { View, ScrollView, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShoppingBag, Info } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { ECOMMERCE_PARTNERS, PARTNER_LOGOS } from "@/features/ecommerce/partners";

export default function Ecommerce() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("ecommerce.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <ShoppingBag size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <View><Text variant="heading">{t("ecommerce.title")}</Text><Text variant="caption" color="muted">{t("ecommerce.subtitle")}</Text></View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {ECOMMERCE_PARTNERS.map((p) => {
            const pending = !p.link;
            return (
              <Pressable key={p.slug} onPress={() => router.push({ pathname: "/ecommerce-company", params: { slug: p.slug } })} style={{ width: "48.5%", marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16, alignItems: "center" }}>
                {pending ? (
                  <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(180,83,9,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text variant="caption" style={{ color: colors.warn, fontSize: 9, textTransform: "uppercase" }}>{t("ecommerce.soon")}</Text>
                  </View>
                ) : null}
                <View style={{ height: 56, width: "100%", alignItems: "center", justifyContent: "center" }}>
                  <Image source={PARTNER_LOGOS[p.slug]} style={{ height: 44, width: "78%" }} resizeMode="contain" />
                </View>
                <Text variant="label" color="ink" style={{ marginTop: 8 }}>{p.name}</Text>
                <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>{t(`ecommerce.partners.${p.slug}.tagline`, { defaultValue: p.tagline })}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14, flexDirection: "row", gap: 8 }}>
          <Info size={16} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 1 }} />
          <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
            {t("ecommerce.disclosure")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
