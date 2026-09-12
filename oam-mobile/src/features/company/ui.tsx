import type { ReactNode } from "react";
import { View, ScrollView, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { ArrowLeft } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

const logo = require("../../../assets/images/oam-splash-logo.png");

/** Renders a translated string containing <1>bold</1> / <n>email</n> tags. */
export function Rich({ k, values, color = "muted" }: { k: string; values?: Record<string, unknown>; color?: "muted" | "ink" }) {
  const { t } = useTranslation();
  const raw = String(t(k, (values ?? {}) as never));
  const parts = raw.split(/(<\d>[\s\S]*?<\/\d>)/g).filter((x) => x !== "");
  return (
    <Text variant="body" color={color} style={{ lineHeight: 22 }}>
      {parts.map((part, i) => {
        const m = part.match(/^<(\d)>([\s\S]*?)<\/\1>$/);
        if (!m) return <Text key={i} variant="body" color={color}>{part}</Text>;
        const inner = m[2];
        if (inner.includes("@")) {
          return <Text key={i} variant="body" color="green" onPress={() => Linking.openURL(`mailto:${inner}`)}>{inner}</Text>;
        }
        return <Text key={i} variant="body" color="ink" style={{ fontWeight: "700" }}>{inner}</Text>;
      })}
    </Text>
  );
}

export function Block({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16, gap: 8, marginBottom: 12 }}>
      {heading ? <Text variant="title" color="ink" style={{ marginBottom: 2 }}>{heading}</Text> : null}
      {children}
    </View>
  );
}

export function PageShell({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Image source={logo} style={{ width: 96, height: 30 }} contentFit="contain" />
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <ArrowLeft size={15} color={colors.muted} /><Text variant="label" color="muted">{t("company.shell.home", "Home")}</Text>
          </Pressable>
        </View>

        {/* dark hero with the red|green top seam */}
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#0a0a0a", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", height: 3 }}>
            <View style={{ flex: 1, backgroundColor: "#111" }} /><View style={{ flex: 1, backgroundColor: colors.brand.red }} /><View style={{ flex: 1, backgroundColor: colors.brand.green }} />
          </View>
          <View style={{ padding: 20 }}>
            <Text variant="heading" color="paper">{title}</Text>
            {intro ? <Text variant="body" style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 21 }}>{intro}</Text> : null}
            {updated ? <Text variant="caption" style={{ color: "rgba(255,255,255,0.4)", marginTop: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>{t("company.shell.lastUpdated", { updated, defaultValue: `Last updated ${updated}` })}</Text> : null}
          </View>
        </View>

        {children}

        <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 8 }}>
          {t("company.shell.questions", "Questions?")}{" "}
          <Text variant="caption" color="green" onPress={() => Linking.openURL("mailto:oamapp26@gmail.com")}>oamapp26@gmail.com</Text>
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** Renders a list of {title, paragraph-keys} sections — used by Terms / Refund. */
export function Sections({ base, spec }: { base: string; spec: { title: string; paras: string[] }[] }) {
  const { t } = useTranslation();
  return (
    <>
      {spec.map((s) => (
        <Block key={s.title} heading={t(`${base}.${s.title}`)}>
          {s.paras.map((p) => <Rich key={p} k={`${base}.${p}`} />)}
        </Block>
      ))}
    </>
  );
}
