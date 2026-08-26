import { useState } from "react";
import { View, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, KeyRound } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { colors } from "@/shared/theme";

/** Prepaid electricity token — large, monospaced, grouped in fours, copyable. */
export function TokenCard({ token, units }: { token: string; units?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const pretty = token.replace(/\s|-/g, "").replace(/(.{4})/g, "$1 ").trim();

  async function copy() {
    try {
      await Clipboard.setStringAsync(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — token is on screen */
    }
  }

  return (
    <View style={{ borderRadius: 18, borderWidth: 2, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.04)", padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <KeyRound size={14} strokeWidth={2} color={colors.brand.green} />
        <Text variant="label" color="green" style={{ letterSpacing: 0.5 }}>
          {t("bills.tokenTitle")}
        </Text>
      </View>

      <Text variant="mono" color="ink" selectable style={{ marginTop: 12, textAlign: "center", fontSize: 24, letterSpacing: 2 }}>
        {pretty}
      </Text>

      {units ? (
        <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 6 }}>
          <Text variant="caption" color="ink">{units}</Text> {t("bills.tokenUnits")}
        </Text>
      ) : null}

      <Pressable onPress={copy} style={{ marginTop: 14, height: 46, borderRadius: 11, backgroundColor: colors.brand.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {copied ? <Check size={16} strokeWidth={2.5} color="#FFF" /> : <Copy size={15} strokeWidth={2} color="#FFF" />}
        <Text variant="label" color="paper">{copied ? t("bills.tokenCopied") : t("bills.tokenCopy")}</Text>
      </Pressable>

      <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 12 }}>
        {t("bills.tokenHint")}
      </Text>
    </View>
  );
}
