import { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft, Gift, Globe2, Search, ExternalLink, TriangleAlert, Zap, ShieldCheck,
  Gamepad2, Clapperboard, Music, ShoppingBag, Smartphone, CreditCard, type LucideIcon,
} from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";

const G2A_LINK = "https://www.g2a.com/n/reflink-c49af69f49";

// Each item carries an i18n `key`; the English text is the built-in fallback,
// so the screen is always readable even before a language is fully translated.
const CATEGORIES: { Icon: LucideIcon; key: string; title: string; text: string }[] = [
  { Icon: Gamepad2, key: "gaming", title: "Gaming", text: "Steam, PlayStation, Xbox, Nintendo credit and game keys." },
  { Icon: Clapperboard, key: "streaming", title: "Streaming", text: "Subscription credit for major film and TV services." },
  { Icon: Music, key: "music", title: "Music", text: "Top up streaming accounts without a local card." },
  { Icon: ShoppingBag, key: "retail", title: "Retail", text: "Store credit for global online marketplaces." },
  { Icon: Smartphone, key: "appStores", title: "App stores", text: "Credit for mobile app and in-app purchases." },
  { Icon: CreditCard, key: "prepaid", title: "Prepaid", text: "Prepaid codes usable across many online services." },
];

const REGIONS: { key: string; region: string; note: string }[] = [
  { key: "us", region: "United States", note: "The widest catalogue. US-region codes usually need a US account." },
  { key: "uk", region: "United Kingdom", note: "GBP-denominated codes for UK accounts and stores." },
  { key: "europe", region: "Europe", note: "EUR codes, often region-locked to specific countries." },
  { key: "global", region: "Global", note: "Codes that work regardless of account region — safest if unsure." },
];

const SELL_TIPS: { key: string; bold: string; rest: string }[] = [
  { key: "verify", bold: "Verification comes first.", rest: " Marketplaces require identity checks before payouts — expect this to take time." },
  { key: "receipts", bold: "Keep every receipt.", rest: " Proof of legitimate purchase is what protects you in a dispute." },
  { key: "fees", bold: "Understand the fees.", rest: " Listing fees, commission and withdrawal charges all affect your real margin." },
  { key: "pricing", bold: "Price against live rates.", rest: " Card values move; stale pricing is how sellers lose money." },
  { key: "ownCards", bold: "Never sell a card you didn't buy yourself.", rest: " Handling cards obtained by others is how people end up implicated in fraud." },
];

const SAFETY: { key: string; bold: string; rest: string }[] = [
  { key: "noOrg", bold: "No legitimate organisation asks to be paid in gift cards.", rest: " Not tax authorities, police, a bank or an employer. Any such request is a scam." },
  { key: "neverShare", bold: "Never share a code before you're paid.", rest: " Once the digits are seen, the value can be redeemed instantly and is gone." },
  { key: "redeem", bold: "Redeem promptly", rest: " and keep the purchase receipt until you have." },
  { key: "region", bold: "Check the region before paying", rest: " — region-locked codes are rarely refundable once revealed." },
  { key: "rating", bold: "Buy from sellers with a long, high-volume rating history", rest: " rather than the cheapest listing." },
];

const VALUE_PROPS: { Icon: LucideIcon; key: string; title: string; text: string }[] = [
  { Icon: Zap, key: "instant", title: "Instant delivery", text: "Most codes arrive within minutes of payment." },
  { Icon: Globe2, key: "worldwide", title: "Worldwide sellers", text: "A global marketplace, often below retail price." },
  { Icon: ShieldCheck, key: "protection", title: "Buyer protection", text: "Marketplace protection applies — read its terms." },
];

function Bullets({ items, dot = colors.brand.green }: { items: { bold: string; rest: string }[]; dot?: string }) {
  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      {items.map((it) => (
        <View key={it.bold} style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ marginTop: 7, height: 6, width: 6, borderRadius: 3, backgroundColor: dot }} />
          <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 19 }}>
            <Text variant="caption" color="ink">{it.bold}</Text>{it.rest}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function GiftCards() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  const open = () => WebBrowser.openBrowserAsync(G2A_LINK);

  const card = { borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 } as const;

  // Translated content arrays (fall back to the English defined above).
  const categories = CATEGORIES.map((c) => ({ ...c, title: t(`giftcards.categories.${c.key}.title`, c.title), text: t(`giftcards.categories.${c.key}.text`, c.text) }));
  const regionBullets = REGIONS.map((r) => ({ bold: t(`giftcards.regions.${r.key}.name`, r.region), rest: ` — ${t(`giftcards.regions.${r.key}.note`, r.note)}` }));
  const sellTips = SELL_TIPS.map((x) => ({ bold: t(`giftcards.sell.tips.${x.key}.bold`, x.bold), rest: t(`giftcards.sell.tips.${x.key}.rest`, x.rest) }));
  const safety = SAFETY.map((x) => ({ bold: t(`giftcards.safety.items.${x.key}.bold`, x.bold), rest: t(`giftcards.safety.items.${x.key}.rest`, x.rest) }));
  const valueProps = VALUE_PROPS.map((v) => ({ ...v, title: t(`giftcards.value.${v.key}.title`, v.title), text: t(`giftcards.value.${v.key}.text`, v.text) }));

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("giftcards.back", "Back")}</Text>
        </Pressable>

        {/* Hero */}
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#0a0a0a" }}>
          <LinearGradient colors={["rgba(11,115,39,0.30)", "transparent"]} start={{ x: 0, y: 1 }} end={{ x: 0.8, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: "row", height: 3 }}>
            <View style={{ flex: 1, backgroundColor: colors.brand.black }} />
            <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
            <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
          </View>
          <View style={{ padding: 22 }}>
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
              <Globe2 size={13} color="rgba(255,255,255,0.8)" />
              <Text variant="caption" color="paper" style={{ opacity: 0.8 }}>{t("giftcards.hero.badge", "Global digital marketplace")}</Text>
            </View>
            <Text variant="display" color="paper" style={{ fontSize: 28, marginTop: 14 }}>{t("giftcards.hero.title", "Gift cards & digital codes")}</Text>
            <Text variant="body" color="paper" style={{ opacity: 0.7, marginTop: 8, lineHeight: 21 }}>
              {t("giftcards.hero.subtitle", "Buy gaming credit, streaming subscriptions, app store top-ups and retail gift cards from sellers worldwide — delivered as a code, usually within minutes.")}
            </Text>
            <Pressable onPress={open} style={{ marginTop: 20, alignSelf: "flex-start", height: 48, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand.red, paddingHorizontal: 22, borderRadius: 12 }}>
              <Search size={17} strokeWidth={2} color="#FFF" />
              <Text variant="label" color="paper">{t("giftcards.hero.cta", "Browse gift cards")}</Text>
              <ExternalLink size={14} strokeWidth={2} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Text variant="caption" color="paper" style={{ opacity: 0.45, marginTop: 12 }}>{t("giftcards.hero.note", "Opens with G2A, our marketplace partner. Purchase and delivery happen there.")}</Text>
          </View>
        </View>

        {/* Buy / Sell tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 6 }}>
          {(["buy", "sell"] as const).map((tabKey) => {
            const sel = tab === tabKey;
            return (
              <Pressable key={tabKey} onPress={() => setTab(tabKey)} style={{ flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: sel ? "rgba(11,115,39,0.10)" : "transparent" }}>
                <Text variant="label" color={sel ? "green" : "muted"}>{tabKey === "buy" ? t("giftcards.tabs.buy", "Buying") : t("giftcards.tabs.sell", "Selling")}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "buy" ? (
          <>
            <Text variant="title" style={{ marginTop: 20, marginBottom: 12 }}>{t("giftcards.buyHeading", "What you can buy")}</Text>
            <View style={{ gap: 10 }}>
              {categories.map((c) => (
                <Pressable key={c.key} onPress={open} style={card}>
                  <View style={{ height: 40, width: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
                    <c.Icon size={19} strokeWidth={1.75} color={colors.brand.green} />
                  </View>
                  <Text variant="label" color="ink" style={{ marginTop: 10 }}>{c.title}</Text>
                  <Text variant="caption" color="muted" style={{ marginTop: 2, lineHeight: 18 }}>{c.text}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[card, { marginTop: 22 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Globe2 size={16} strokeWidth={1.75} color={colors.brand.green} />
                <Text variant="title">{t("giftcards.regionsHeading", "Understanding regions")}</Text>
              </View>
              <Text variant="caption" color="muted" style={{ marginTop: 8, lineHeight: 19 }}>
                {t("giftcards.regionsIntro", "This is the single most common reason a code fails to redeem. Most gift cards are tied to a country — a US code generally won't work on a UK account.")}
              </Text>
              <Bullets items={regionBullets} />
            </View>
          </>
        ) : (
          <View style={[card, { marginTop: 20 }]}>
            <Text variant="title">{t("giftcards.sellHeading", "Selling digital codes")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 8, lineHeight: 19 }}>
              {t("giftcards.sellIntro", "The same marketplace lets verified sellers list codes to a global audience. A few things are worth knowing before you start:")}
            </Text>
            <Bullets items={sellTips} />
            <View style={{ marginTop: 16 }}>
              <Button title={t("giftcards.sellCta", "Visit the marketplace")} variant="primary" onPress={open} />
            </View>
          </View>
        )}

        {/* Safety */}
        <View style={{ marginTop: 22, borderRadius: 18, borderWidth: 1, borderColor: "rgba(180,83,9,0.3)", backgroundColor: "rgba(180,83,9,0.04)", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TriangleAlert size={16} strokeWidth={2} color={colors.warn} />
            <Text variant="title">{t("giftcards.safetyHeading", "Stay safe with gift cards")}</Text>
          </View>
          <Bullets items={safety} dot={colors.warn} />
        </View>

        {/* Value props */}
        <View style={{ gap: 10, marginTop: 16 }}>
          {valueProps.map((v) => (
            <View key={v.key} style={card}>
              <View style={{ height: 36, width: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
                <v.Icon size={18} strokeWidth={1.75} color={colors.brand.green} />
              </View>
              <Text variant="label" color="ink" style={{ marginTop: 10 }}>{v.title}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 2, lineHeight: 18 }}>{v.text}</Text>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={{ marginTop: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 24, alignItems: "center" }}>
          <View style={{ height: 48, width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <Gift size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <Text variant="heading" style={{ fontSize: 19, marginTop: 12, textAlign: "center" }}>{t("giftcards.bottomTitle", "Browse thousands of digital codes")}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 6, textAlign: "center", lineHeight: 19 }}>
            {t("giftcards.bottomBody", "Gaming, streaming, retail and prepaid credit from sellers around the world.")}
          </Text>
          <Pressable onPress={open} style={{ marginTop: 18, height: 48, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand.green, paddingHorizontal: 26, borderRadius: 12 }}>
            <Text variant="label" color="paper">{t("giftcards.bottomCta", "Open marketplace")}</Text>
            <ExternalLink size={15} strokeWidth={2} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
