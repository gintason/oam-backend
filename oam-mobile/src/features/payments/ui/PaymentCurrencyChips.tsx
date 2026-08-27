import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { CURRENCIES, type CurrencyCode } from "@/features/currency";

/**
 * Currency selector for the upgrade/boost screens — mirrors the web dashboards.
 * Shows only the currencies the backend says Flutterwave can collect
 * (SUPPORTED_PAYMENT_CURRENCIES). Hidden when just one is supported (the default
 * NGN-only setup), so nothing extra appears until more are enabled.
 */
export function PaymentCurrencyChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (c: string) => void;
}) {
  const { t } = useTranslation();
  if (!options || options.length <= 1) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <Text variant="caption" color="muted" style={{ marginBottom: 8 }}>
        {t("payments.payIn", "Pay in")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((c) => {
          const sel = c === value;
          const sym = CURRENCIES[c as CurrencyCode]?.symbol ?? "";
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: sel ? colors.brand.green : colors.hairline,
                backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 5,
              }}
            >
              <Text variant="label" color={sel ? "green" : "ink"} style={{ fontSize: 13.5 }}>
                {sym} {c}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
