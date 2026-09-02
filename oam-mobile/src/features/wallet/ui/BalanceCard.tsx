import { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { naira } from "@/shared/lib/format";

type Code = "NGN" | "USD" | "GBP" | "EUR";
const CCY: { code: Code; symbol: string; fallback: number }[] = [
  { code: "NGN", symbol: "\u20a6", fallback: 1 },
  { code: "USD", symbol: "$", fallback: 0.00065 },
  { code: "GBP", symbol: "\u00a3", fallback: 0.00051 },
  { code: "EUR", symbol: "\u20ac", fallback: 0.0006 },
];

/**
 * Available-balance card. The stored balance is in NGN; the currency tabs
 * convert it to USD/GBP/EUR at live rates (fetched from a free FX endpoint,
 * with sensible fallbacks if the request fails). Display-only — settlement
 * stays in Naira.
 */
export function BalanceCard({
  balance,
  loading,
}: {
  balance?: string;
  currency?: string;
  loading?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [code, setCode] = useState<Code>("NGN");
  const [rates, setRates] = useState<Record<string, number>>({
    NGN: 1, USD: 0.00065, GBP: 0.00051, EUR: 0.0006,
  });

  // Live NGN -> {USD,GBP,EUR} rates. rates[X] = X per 1 NGN.
  useEffect(() => {
    let alive = true;
    fetch("https://open.er-api.com/v6/latest/NGN")
      .then((r) => r.json())
      .then((d) => { if (alive && d && d.rates) setRates((prev) => ({ ...prev, ...d.rates })); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const meta = CCY.find((c) => c.code === code) ?? CCY[0];
  const rate = Number(rates[code]) || meta.fallback;
  const ngn = Number(balance ?? 0);
  const converted = ngn * rate;
  const display =
    code === "NGN"
      ? naira(ngn)
      : `${meta.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#0a0a0a" }}>
      <LinearGradient
        colors={["rgba(21,162,68,0.42)", "rgba(11,115,39,0.10)", "transparent"]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.85, y: 0.65 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flexDirection: "row", height: 4 }}>
        <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="label" color="paper" style={{ opacity: 0.75 }}>
            Available balance
          </Text>
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            {hidden ? (
              <EyeOff size={18} color="rgba(255,255,255,0.75)" />
            ) : (
              <Eye size={18} color="rgba(255,255,255,0.75)" />
            )}
          </Pressable>
        </View>

        <Text style={{ fontFamily: fonts.bold, fontSize: 34, color: "#FFFFFF", marginTop: 8 }}>
          {loading ? "\u2026" : hidden ? "\u2022\u2022\u2022\u2022\u2022\u2022" : display}
        </Text>
        <Text variant="caption" color="paper" style={{ opacity: 0.6, marginTop: 2 }}>
          {code}{code !== "NGN" ? "  \u00b7  converted from \u20a6" : ""}
        </Text>

        {/* Currency tabs */}
        <View style={{ flexDirection: "row", marginTop: 16 }}>
          {CCY.map((c) => {
            const sel = c.code === code;
            return (
              <Pressable
                key={c.code}
                onPress={() => setCode(c.code)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 8,
                  backgroundColor: sel ? "#FFFFFF" : "rgba(255,255,255,0.12)",
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, color: sel ? colors.brand.green : "#FFFFFF" }}>
                  {c.code}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
