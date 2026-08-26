import { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { ChevronDown, Check, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { CURRENCIES, CURRENCY_ORDER, useCurrency } from "./CurrencyContext";

/**
 * Compact display-currency switcher that sits on the (dark) balance card.
 * Display-only: it changes how the balance is shown, not how money settles.
 */
export function CurrencyPicker() {
  const { t } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
          paddingHorizontal: 10,
          height: 28,
        }}
      >
        <Text variant="caption" style={{ color: "#FFFFFF", fontSize: 12 }}>
          {currency.symbol} {currency.code}
        </Text>
        <ChevronDown size={12} color="rgba(255,255,255,0.75)" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 28 }}
        >
          <Pressable onPress={() => {}} style={{ borderRadius: 18, backgroundColor: colors.paper, padding: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text variant="title">{t("currency.title", "Display currency")}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            {CURRENCY_ORDER.map((c) => {
              const cur = CURRENCIES[c];
              const selected = c === currency.code;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setCurrency(c);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: selected ? colors.mist : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        height: 30,
                        width: 30,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.mist,
                      }}
                    >
                      <Text variant="label" color="ink">{cur.symbol}</Text>
                    </View>
                    <View>
                      <Text variant="label" color="ink">{cur.code}</Text>
                      <Text variant="caption" color="muted">{cur.label}</Text>
                    </View>
                  </View>
                  {selected ? <Check size={18} strokeWidth={2} color={colors.brand.green} /> : null}
                </Pressable>
              );
            })}

            <Text variant="caption" color="muted" style={{ paddingHorizontal: 12, paddingVertical: 8, lineHeight: 16 }}>
              {t("currency.note", "Prices shown are indicative. Payments are processed in Naira (₦).")}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
