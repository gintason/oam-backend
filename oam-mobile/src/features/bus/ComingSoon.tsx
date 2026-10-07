import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bus, Car, Plane } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

/** Shown on the Bus Tickets screen while bus tickets are switched off (see shared/config/features.ts). */
export function BusComingSoon() {
  const router = useRouter();
  const { t } = useTranslation();
  const Alt = ({ to, Icon, label }: { to: string; Icon: typeof Plane; label: string }) => (
    <Pressable onPress={() => router.push(to as never)} accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
      <Icon size={17} color={colors.brand.green} /><Text variant="label" color="ink">{label}</Text>
    </Pressable>
  );
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>
        <View style={{ marginTop: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 24, alignItems: "center" }}>
          <View style={{ height: 64, width: 64, borderRadius: 18, backgroundColor: "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Bus size={30} color={colors.brand.green} strokeWidth={1.75} />
          </View>
          <View style={{ marginTop: 18, borderRadius: 999, backgroundColor: "rgba(227,16,18,0.10)", paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text variant="caption" style={{ color: colors.brand.red, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("busSoon.badge", "Coming soon")}
            </Text>
          </View>
          <Text variant="heading" style={{ marginTop: 12, textAlign: "center" }}>{t("busSoon.title", "Bus tickets are coming soon")}</Text>
          <Text variant="body" color="muted" style={{ marginTop: 10, textAlign: "center", lineHeight: 21 }}>
            {t("busSoon.body", "We're putting the finishing touches on intercity bus booking. You'll be able to pick your route, choose your seats and pay from your wallet very soon.")}
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 22, textTransform: "uppercase", letterSpacing: 0.8 }}>{t("busSoon.meanwhile", "In the meantime")}</Text>
          <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            <Alt to="/flights" Icon={Plane} label={t("busSoon.flights", "Book a flight")} />
            <Alt to="/carhire" Icon={Car} label={t("busSoon.carHire", "Hire a car")} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
