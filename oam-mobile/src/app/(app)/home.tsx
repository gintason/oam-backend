import { View, ScrollView, Pressable, ActivityIndicator, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Smartphone, Wifi, Zap, Tv, Plus, ArrowUpRight, Send, Gift,
  Plane, BedDouble, Car, MapPinned, Store, Wrench, ShoppingBag, Ticket, type LucideIcon,
} from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useAuthStore } from "@/features/auth";
import { useWallets, useTransactions, pickHeadline, BalanceCard, TransactionRow } from "@/features/wallet";

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "home.greetMorning";
  if (h < 17) return "home.greetAfternoon";
  return "home.greetEvening";
}

type Tint = "green" | "red";
type Tile = { id: string; lkey: string; label: string; Icon: LucideIcon; tint: Tint };

const GROUPS: { title: string; gkey: string; items: Tile[] }[] = [
  {
    title: "Bills & Utilities", gkey: "bills",
    items: [
      { id: "airtime", lkey: "airtime", label: "Airtime", Icon: Smartphone, tint: "green" },
      { id: "data", lkey: "data", label: "Data", Icon: Wifi, tint: "green" },
      { id: "electricity", lkey: "electricity", label: "Electricity", Icon: Zap, tint: "green" },
      { id: "cable", lkey: "cable", label: "Cable TV", Icon: Tv, tint: "red" },
    ],
  },
  {
    title: "Money", gkey: "money",
    items: [
      { id: "fund", lkey: "fund", label: "Fund", Icon: Plus, tint: "green" },
      { id: "withdraw", lkey: "withdraw", label: "Withdraw", Icon: ArrowUpRight, tint: "green" },
      { id: "transfer", lkey: "transfer", label: "Transfer", Icon: Send, tint: "green" },
      { id: "giftcards", lkey: "giftCards", label: "Gift Cards", Icon: Gift, tint: "red" },
    ],
  },
  {
    title: "Travel & more", gkey: "travel",
    items: [
      { id: "flights", lkey: "flights", label: "Flights", Icon: Plane, tint: "green" },
      { id: "hotels", lkey: "hotels", label: "Hotels", Icon: BedDouble, tint: "green" },
      { id: "carhire", lkey: "carHire", label: "Car Hire", Icon: Car, tint: "green" },
      { id: "pickup", lkey: "pickup", label: "Pick Up", Icon: MapPinned, tint: "green" },
    ],
  },
  {
    title: "Shop & services", gkey: "shop",
    items: [
      { id: "marketplace", lkey: "marketplace", label: "Marketplace", Icon: Store, tint: "green" },
      { id: "artisans", lkey: "artisans", label: "Artisans", Icon: Wrench, tint: "green" },
      { id: "ecommerce", lkey: "ecommerce", label: "E-commerce", Icon: ShoppingBag, tint: "red" },
      { id: "betting", lkey: "betting", label: "Fund Betting", Icon: Ticket, tint: "red" },
    ],
  },
];

const H_PADDING = 20;
const GAP = 10;
const COLS = 4;
const TILE_W = (Dimensions.get("window").width - H_PADDING * 2 - GAP * (COLS - 1)) / COLS;

function ServiceTile({ label, Icon, tint, onPress }: Omit<Tile, "id"> & { onPress: () => void }) {
  const accent = tint === "red" ? colors.brand.red : colors.brand.green;
  const bg = tint === "red" ? "rgba(227,16,18,0.10)" : "rgba(11,115,39,0.10)";
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: TILE_W,
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.paper,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
        }}
      >
        <Icon size={20} color={accent} strokeWidth={1.75} />
      </View>
      <Text variant="caption" color="ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const wallets = useWallets();
  const headline = pickHeadline(wallets.data?.wallets);
  const txns = useTransactions(headline?.currency);

  function onTile(id: string) {
    if (id === "airtime") return router.push("/airtime");
    if (id === "data") return router.push("/data");
    if (id === "electricity") return router.push("/electricity");
    if (id === "cable") return router.push("/cable");
    if (id === "fund") return router.push("/fund");
    if (id === "transfer") return router.push("/transfer");
    if (id === "withdraw") return router.push("/withdraw");
    if (id === "giftcards") return router.push("/giftcards");
    if (id === "flights") return router.push("/flights");
    if (id === "hotels") return router.push("/hotels");
    if (id === "carhire") return router.push("/carhire");
    if (id === "pickup") return router.push("/pickup");
    if (id === "marketplace") return router.push("/marketplace");
    if (id === "artisans") return router.push("/artisans");
    if (id === "ecommerce") return router.push("/ecommerce");
    if (id === "betting") return router.push("/betting");
    Alert.alert("Coming soon", "This service arrives in an upcoming update.");
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: H_PADDING, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text variant="body" color="muted">
          {t(greetingKey())}
        </Text>
        <Text variant="heading" style={{ marginBottom: 18 }}>
          {user?.first_name || t("dashboard.greeting")}
        </Text>

        <BalanceCard balance={headline?.balance} currency={headline?.currency} loading={wallets.isLoading} />

        {GROUPS.map((group) => (
          <View key={group.gkey} style={{ marginTop: 22 }}>
            <Text variant="title" style={{ marginBottom: 12 }}>
              {t(`dashboard.groups.${group.gkey}`)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {group.items.map((item) => (
                <ServiceTile
                  key={item.id}
                  label={t(`dashboard.services.${item.lkey}`)}
                  Icon={item.Icon}
                  tint={item.tint}
                  onPress={() => onTile(item.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <Text variant="title" style={{ marginTop: 26, marginBottom: 4 }}>
          {t("dashboard.recentTransactions")}
        </Text>
        {txns.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 16 }} />
        ) : txns.data && txns.data.length > 0 ? (
          txns.data.slice(0, 6).map((t) => <TransactionRow key={t.id} txn={t} />)
        ) : (
          <Text variant="body" color="muted" style={{ marginTop: 8 }}>
            {t("dashboard.noTransactions")}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
