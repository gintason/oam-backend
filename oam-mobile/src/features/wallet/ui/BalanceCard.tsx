import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { useCurrency, CurrencyPicker } from "@/features/currency";

export function BalanceCard({
  balance,
  currency = "NGN",
  loading,
}: {
  balance?: string;
  currency?: string;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const { format, isConverted } = useCurrency();
  const [hidden, setHidden] = useState(false);

  return (
    <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#0a0a0a" }}>
      {/* Light-green wash brightening the left side, fading into the dark base. */}
      <LinearGradient
        colors={["rgba(21,162,68,0.42)", "rgba(11,115,39,0.10)", "transparent"]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.85, y: 0.65 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Red | green split accent — same pattern as the bottom tab bar. */}
      <View style={{ flexDirection: "row", height: 4 }}>
        <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="label" color="paper" style={{ opacity: 0.75 }}>
            {t("dashboard.walletBalance", "Available balance")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <CurrencyPicker />
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
              {hidden ? (
                <EyeOff size={18} color="rgba(255,255,255,0.75)" />
              ) : (
                <Eye size={18} color="rgba(255,255,255,0.75)" />
              )}
            </Pressable>
          </View>
        </View>

        <Text style={{ fontFamily: fonts.bold, fontSize: 34, color: "#FFFFFF", marginTop: 8 }}>
          {loading ? "…" : hidden ? "••••••" : format(balance ?? 0)}
        </Text>
        <Text variant="caption" color="paper" style={{ opacity: 0.6, marginTop: 2 }}>
          {isConverted ? t("currency.indicative", "Indicative · settled in ₦") : currency}
        </Text>
      </View>
    </View>
  );
}
