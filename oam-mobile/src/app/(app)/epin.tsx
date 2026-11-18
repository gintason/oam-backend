import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Minus, Plus } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, billsApi } from "@/features/bills";
import { PinsResult } from "@/features/bills/ui/PinsResult";
import { Chip } from "@/features/bills/ui/Chip";
import type { BillOrder } from "@/entities/billing";

const VALUES = [100, 200, 500, 1000];

/** ePIN — packs of 10 printable recharge cards (₦100–₦1,000), 1–5 packs. Paid from the wallet. */
export default function Epin() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [network, setNetwork] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [packs, setPacks] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billers = useBillers("epin");
  const stock = useQuery({ queryKey: ["epin-stock"], queryFn: billsApi.getEpinStock, enabled: isVerified, refetchInterval: 60_000 });
  const wallets = useWallets();
  const balance = pickHeadline(wallets.data?.wallets)?.balance;
  const fee = Number(billers.data?.find((b) => b.code === network)?.service_fee ?? 0);
  const inStock = (v: number) => {
    const n = stock.data?.stock?.[network.toUpperCase()]?.[String(v)];
    return n === undefined ? true : n > 0;
  };

  const purchase = useMutation({
    mutationFn: () => billsApi.purchase({
      category: "epin", code: network, recipient: `${packs} pack(s)`, amount: (value ?? 0) * 10 * packs,
      plan_code: String(value), quantity: packs,
    }),
    onSuccess: (d) => setOrder(d),
    onError: (err) => setError(apiErrorMessage(err, t("bills.errPurchase", "Purchase failed. Try again."))),
  });

  function submit() {
    setError(null);
    if (!network) return setError(t("epin.errNetwork", "Choose a network."));
    if (!value) return setError(t("epin.errValue", "Choose a card value."));
    purchase.mutate();
  }

  if (order) {
    return <PinsResult order={order} title={t("epin.ready", "Your recharge cards are ready")}
                       onAgain={() => { setOrder(null); setValue(null); }} onDone={() => router.back()} />;
  }

  const total = (value ?? 0) * 10 * packs;
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <CreditCard size={22} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t("epin.title", "Recharge cards")}</Text>
            <Text variant="caption" color="muted">{t("epin.subtitle", "Printable cards in packs of 10 — great for resale.")}</Text>
          </View>
        </View>

        {error ? <Text variant="caption" color="danger" style={{ marginBottom: 10 }}>{error}</Text> : null}

        <Text variant="label" style={{ marginBottom: 8 }}>{t("epin.network", "Network")}</Text>
        {billers.isLoading ? <ActivityIndicator color={colors.brand.green} /> : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {(billers.data ?? []).map((b) => (
              <Chip key={b.id} label={b.name} active={network === b.code} onPress={() => { setNetwork(b.code); setValue(null); }} />
            ))}
          </View>
        )}

        {network ? (
          <>
            <Text variant="label" style={{ marginBottom: 8 }}>{t("epin.value", "Card value")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {VALUES.map((v) => (
                <Chip key={v} flex label={naira(v)} active={value === v} disabled={!inStock(v)}
                      sub={inStock(v) ? undefined : t("epin.out", "Out of stock")} onPress={() => setValue(v)} />
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text variant="label">{t("epin.packs", "Packs (10 cards each)")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Pressable onPress={() => setPacks(Math.max(1, packs - 1))} hitSlop={8} style={{ height: 36, width: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}><Minus size={16} color={colors.ink} /></Pressable>
                <Text variant="title">{packs}</Text>
                <Pressable onPress={() => setPacks(Math.min(5, packs + 1))} hitSlop={8} style={{ height: 36, width: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}><Plus size={16} color={colors.ink} /></Pressable>
              </View>
            </View>
            {value ? <Text variant="caption" color="muted" style={{ marginBottom: 14 }}>{packs * 10} {t("epin.cardsOf", "cards of")} {naira(value)}</Text> : null}
          </>
        ) : null}

        {value ? (
          <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 14, gap: 4 }}>
            <Text variant="caption" color="muted">{t("pins.total", "Total")}: <Text variant="label">{naira(total + fee)}</Text></Text>
            {balance != null ? <Text variant="caption" color="muted">{t("pins.balance", "Wallet balance")}: {naira(balance)}</Text> : null}
          </View>
        ) : null}

        <Button title={value ? `${t("pins.pay", "Pay")} ${naira(total + fee)}` : t("epin.buy", "Buy cards")} onPress={submit} loading={purchase.isPending} />
        <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
          {t("epin.note", "Paid from your O.A.M wallet. You'll get a printable image of your cards.")}
        </Text>
      </ScrollView>
    </Screen>
  );
}
