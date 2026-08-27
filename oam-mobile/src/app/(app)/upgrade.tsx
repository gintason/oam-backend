import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Crown, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import { CheckoutModal } from "@/features/payments/ui/CheckoutModal";
import { pricingApi } from "@/features/payments/api/pricing-api";
import { PaymentCurrencyChips } from "@/features/payments/ui/PaymentCurrencyChips";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/features/currency";

const SELLER_TIERS = [
  { key: "free", label: "Free", price: 0, perks: ["Up to 3 active listings", "Message buyers in-app"] },
  { key: "premium", label: "Premium", price: 2500, perks: ["Up to 20 active listings", "Featured placement", "Message buyers in-app"] },
  { key: "pro", label: "Pro", price: 5000, perks: ["Unlimited listings", "Featured placement", "Priority in search"] },
] as const;

type Phase = "plans" | "verifying" | "result";
type Outcome = { kind: "success" | "pending" | "failed"; msg: string };
const PAID = ["paid", "success", "successful", "active"];

export default function Upgrade() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const sub = useQuery({ queryKey: ["marketplace", "subscription"], queryFn: marketplaceApi.subscription });
  const current = sub.data?.active_tier ?? "free";

  const pricing = useQuery({ queryKey: ["payments", "pricing"], queryFn: pricingApi.get });
  const supported = pricing.data?.supported_currencies ?? ["NGN"];
  const { currency: displayCcy } = useCurrency();
  const [payCcy, setPayCcy] = useState<string>("NGN");
  useEffect(() => {
    setPayCcy(supported.includes(displayCcy.code) ? displayCcy.code : "NGN");
  }, [pricing.data, displayCcy.code]);

  function priceFor(tierKey: string): number {
    const p = pricing.data?.subscription?.[tierKey]?.[payCcy];
    return p != null ? Number(p) : (SELLER_TIERS.find((s) => s.key === tierKey)?.price ?? 0);
  }
  function fmtCcy(amount: number): string {
    const sym = CURRENCIES[payCcy as CurrencyCode]?.symbol ?? "";
    const digits = payCcy === "NGN" || amount >= 1000 || Number.isInteger(amount) ? 0 : 2;
    return `${sym}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  }

  const [checkout, setCheckout] = useState<{ url: string; reference: string } | null>(null);
  const [pendingTier, setPendingTier] = useState<"premium" | "pro" | null>(null);
  const [phase, setPhase] = useState<Phase>("plans");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const start = useMutation({
    mutationFn: (tier: "premium" | "pro") => marketplaceApi.subscribe(tier, payCcy),
    onMutate: (tier) => setPendingTier(tier),
    onSettled: () => setPendingTier(null),
    onSuccess: (data) => setCheckout({ url: data.authorization_url, reference: data.reference }),
    onError: (err) => {
      setPhase("result");
      setOutcome({ kind: "failed", msg: apiErrorMessage(err, t("marketplace.upgrade.errStart", "Couldn't start the upgrade. Try again.")) });
    },
  });

  async function onReturn(returnUrl: string) {
    const ref = checkout?.reference ?? "";
    const status = /[?&]status=([^&]+)/.exec(returnUrl)?.[1]?.toLowerCase();
    setCheckout(null);
    if (status === "cancelled") {
      setPhase("result");
      setOutcome({ kind: "failed", msg: t("marketplace.upgrade.cancelled", "Payment cancelled. You have not been charged.") });
      return;
    }
    if (!ref) {
      setPhase("result");
      setOutcome({ kind: "failed", msg: t("marketplace.upgrade.noRef", "Missing payment reference.") });
      return;
    }
    setPhase("verifying");
    try {
      const r = await marketplaceApi.verifySubscription(ref);
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      const st = String(r.payment_status ?? "").toLowerCase();
      if (PAID.includes(st) || r.expires_at) {
        setOutcome({ kind: "success", msg: r.tier ? t("marketplace.upgrade.okBody", "Your seller account is now {{tier}}.", { tier: String(r.tier).toUpperCase() }) : t("marketplace.upgrade.okBodyGeneric", "Your upgrade is active.") });
      } else if (st === "pending" || st === "processing") {
        setOutcome({ kind: "pending", msg: t("marketplace.upgrade.pendingBody", "Payment received. Your upgrade will activate shortly.") });
      } else {
        setOutcome({ kind: "failed", msg: t("marketplace.upgrade.failedBody", "Payment not completed. If you were charged, it will be reversed.") });
      }
    } catch {
      setOutcome({ kind: "pending", msg: t("marketplace.upgrade.unconfirmed", "We couldn't confirm just yet. If you were charged, your upgrade will activate soon.") });
    }
    setPhase("result");
  }

  // ---- result state ----
  if (phase === "result" && outcome) {
    const Icon = outcome.kind === "success" ? CheckCircle2 : outcome.kind === "pending" ? Clock : XCircle;
    const tint = outcome.kind === "success" ? colors.brand.green : outcome.kind === "pending" ? colors.warn : colors.danger;
    const title = outcome.kind === "success" ? t("marketplace.upgrade.okTitle", "Upgrade successful!") : outcome.kind === "pending" ? t("marketplace.upgrade.pendingTitle", "Payment received") : t("marketplace.upgrade.failedTitle", "Payment not completed");
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <Icon size={56} strokeWidth={1.5} color={tint} />
          <Text variant="heading" style={{ marginTop: 16, textAlign: "center" }}>{title}</Text>
          <Text variant="body" color="muted" style={{ marginTop: 8, textAlign: "center", lineHeight: 21 }}>{outcome.msg}</Text>
          <View style={{ height: 20 }} />
          <Button title={t("bills.result.done", "Done")} onPress={() => router.replace("/marketplace")} style={{ width: 220 }} />
        </View>
      </Screen>
    );
  }

  // ---- verifying state ----
  if (phase === "verifying") {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <ActivityIndicator size="large" color={colors.brand.green} />
          <Text variant="title" style={{ marginTop: 16 }}>{t("marketplace.upgrade.verifyTitle", "Confirming your payment…")}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>{t("marketplace.upgrade.verifyBody", "This only takes a moment.")}</Text>
        </View>
      </Screen>
    );
  }

  // ---- plans ----
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("marketplace.navMarketplace", "Marketplace")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <Crown size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <View><Text variant="heading">{t("marketplace.upgrade.title", "Seller plans")}</Text><Text variant="caption" color="muted">{t("marketplace.upgrade.subtitle", "List more and get seen first.")}</Text></View>
        </View>

        <PaymentCurrencyChips options={supported} value={payCcy} onChange={setPayCcy} />

        <View style={{ gap: 12, marginTop: 16 }}>
          {SELLER_TIERS.map((tier) => {
            const isCurrent = tier.key === current;
            const canBuy = tier.price > 0 && !isCurrent;
            return (
              <View key={tier.key} style={{ borderRadius: 18, borderWidth: 1, borderColor: isCurrent ? colors.brand.green : colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text variant="title">{tier.label}</Text>
                  {isCurrent ? (
                    <View style={{ borderRadius: 999, backgroundColor: "rgba(11,115,39,0.10)", paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text variant="caption" color="green">{t("marketplace.upgrade.current", "Current plan")}</Text>
                    </View>
                  ) : (
                    <Text variant="title" color="ink">{tier.price === 0 ? t("marketplace.upgrade.freePrice", "Free") : `${fmtCcy(priceFor(tier.key))}${t("marketplace.upgrade.perMonth", "/mo")}`}</Text>
                  )}
                </View>
                <View style={{ gap: 6, marginTop: 12 }}>
                  {tier.perks.map((perk) => (
                    <View key={perk} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Check size={15} strokeWidth={2.25} color={colors.brand.green} />
                      <Text variant="caption" color="ink">{perk}</Text>
                    </View>
                  ))}
                </View>
                {canBuy ? (
                  <View style={{ marginTop: 14 }}>
                    <Button
                      title={t("marketplace.upgrade.choose", "Choose {{label}}", { label: tier.label })}
                      onPress={() => start.mutate(tier.key as "premium" | "pro")}
                      loading={pendingTier === tier.key}
                      disabled={start.isPending && pendingTier !== tier.key}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text variant="caption" color="muted" style={{ marginTop: 16, textAlign: "center", lineHeight: 18 }}>
          {t("marketplace.upgrade.secured", "Payments are processed securely by Flutterwave.")}
        </Text>
      </ScrollView>

      <CheckoutModal
        url={checkout?.url ?? ""}
        visible={!!checkout}
        title={t("marketplace.upgrade.checkoutTitle", "Upgrade payment")}
        onComplete={onReturn}
        onCancel={() => setCheckout(null)}
      />
    </Screen>
  );
}
