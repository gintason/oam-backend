import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Rocket, Star, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { shortDate } from "@/shared/lib/format";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";
import { CheckoutModal } from "@/features/payments/ui/CheckoutModal";
import { pricingApi } from "@/features/payments/api/pricing-api";
import { PaymentCurrencyChips } from "@/features/payments/ui/PaymentCurrencyChips";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/features/currency";

const BOOST_TIERS = [
  { key: "premium", label: "Premium", days: 30, price: 2500, perks: ["Featured for 30 days", "Ranks above standard artisans", "The green Featured badge"] },
  { key: "pro", label: "Pro", days: 90, price: 5000, perks: ["Featured for 90 days", "Top of search in your area", "The green Featured badge"] },
] as const;

type Phase = "plans" | "verifying" | "result";
type Outcome = { kind: "success" | "pending" | "failed"; msg: string };
const PAID = ["paid", "success", "successful", "active"];

export default function Boost() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const mine = useQuery({ queryKey: ["artisans", "me"], queryFn: homeServicesApi.me, retry: false });
  const isFeatured = !!mine.data?.is_featured;

  const pricing = useQuery({ queryKey: ["payments", "pricing"], queryFn: pricingApi.get });
  const supported = pricing.data?.supported_currencies ?? ["NGN"];
  const { currency: displayCcy } = useCurrency();
  const [payCcy, setPayCcy] = useState<string>("NGN");
  useEffect(() => {
    setPayCcy(supported.includes(displayCcy.code) ? displayCcy.code : "NGN");
  }, [pricing.data, displayCcy.code]);

  function priceForDays(days: number): number {
    const p = pricing.data?.boost?.[String(days)]?.[payCcy];
    return p != null ? Number(p) : (BOOST_TIERS.find((b) => b.days === days)?.price ?? 0);
  }
  function fmtCcy(amount: number): string {
    const sym = CURRENCIES[payCcy as CurrencyCode]?.symbol ?? "";
    const digits = payCcy === "NGN" || amount >= 1000 || Number.isInteger(amount) ? 0 : 2;
    return `${sym}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  }

  const [checkout, setCheckout] = useState<{ url: string; reference: string } | null>(null);
  const [pendingDays, setPendingDays] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("plans");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const start = useMutation({
    mutationFn: (days: number) => homeServicesApi.startBoost(days, payCcy),
    onMutate: (days) => setPendingDays(days),
    onSettled: () => setPendingDays(null),
    onSuccess: (data) => setCheckout({ url: data.authorization_url, reference: data.reference }),
    onError: (err) => {
      setPhase("result");
      setOutcome({ kind: "failed", msg: apiErrorMessage(err, t("artisans.boost.errStart", "Couldn't start the boost. Try again.")) });
    },
  });

  async function onReturn(returnUrl: string) {
    const ref = checkout?.reference ?? "";
    const status = /[?&]status=([^&]+)/.exec(returnUrl)?.[1]?.toLowerCase();
    setCheckout(null);
    if (status === "cancelled") {
      setPhase("result");
      setOutcome({ kind: "failed", msg: t("artisans.boost.cancelled", "Payment cancelled. You have not been charged.") });
      return;
    }
    if (!ref) {
      setPhase("result");
      setOutcome({ kind: "failed", msg: t("artisans.boost.noRef", "Missing payment reference.") });
      return;
    }
    setPhase("verifying");
    try {
      const r = await homeServicesApi.verifyBoost(ref);
      qc.invalidateQueries({ queryKey: ["artisans"] });
      const st = String(r.status ?? "").toLowerCase();
      if (PAID.includes(st) || r.featured_until) {
        setOutcome({ kind: "success", msg: r.featured_until ? t("artisans.boost.okBodyUntil", "Your profile is featured until {{date}}.", { date: shortDate(r.featured_until) }) : t("artisans.boost.okBody", "Your profile is now featured and ranks higher in search.") });
      } else if (st === "pending" || st === "processing") {
        setOutcome({ kind: "pending", msg: t("artisans.boost.pendingBody", "Payment received. Your boost will activate shortly.") });
      } else {
        setOutcome({ kind: "failed", msg: t("artisans.boost.failedBody", "Payment not completed. If you were charged, it will be reversed.") });
      }
    } catch {
      setOutcome({ kind: "pending", msg: t("artisans.boost.unconfirmed", "We couldn't confirm just yet. If you were charged, your boost will activate soon.") });
    }
    setPhase("result");
  }

  if (phase === "result" && outcome) {
    const Icon = outcome.kind === "success" ? CheckCircle2 : outcome.kind === "pending" ? Clock : XCircle;
    const tint = outcome.kind === "success" ? colors.brand.green : outcome.kind === "pending" ? colors.warn : colors.danger;
    const title = outcome.kind === "success" ? t("artisans.boost.okTitle", "Profile boosted!") : outcome.kind === "pending" ? t("artisans.boost.pendingTitle", "Payment received") : t("artisans.boost.failedTitle", "Payment not completed");
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <Icon size={56} strokeWidth={1.5} color={tint} />
          <Text variant="heading" style={{ marginTop: 16, textAlign: "center" }}>{title}</Text>
          <Text variant="body" color="muted" style={{ marginTop: 8, textAlign: "center", lineHeight: 21 }}>{outcome.msg}</Text>
          <View style={{ height: 20 }} />
          <Button title={t("bills.result.done", "Done")} onPress={() => router.replace("/artisans")} style={{ width: 220 }} />
        </View>
      </Screen>
    );
  }

  if (phase === "verifying") {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <ActivityIndicator size="large" color={colors.brand.green} />
          <Text variant="title" style={{ marginTop: 16 }}>{t("artisans.boost.verifyTitle", "Confirming your payment…")}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>{t("artisans.boost.verifyBody", "This only takes a moment.")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.hub.back", "Home services")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Rocket size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("artisans.boost.title", "Boost your profile")}</Text><Text variant="caption" color="muted">{t("artisans.boost.subtitle", "Get seen first by customers nearby.")}</Text></View>
        </View>

        {isFeatured ? (
          <View style={{ marginTop: 14, borderRadius: 12, backgroundColor: "rgba(11,115,39,0.06)", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Star size={15} color={colors.brand.green} fill={colors.brand.green} />
            <Text variant="caption" color="ink" style={{ flex: 1 }}>
              {mine.data?.featured_until ? t("artisans.boost.activeUntil", "Your profile is featured until {{date}}. Extend it below.", { date: shortDate(mine.data.featured_until) }) : t("artisans.boost.activeNow", "Your profile is currently featured. Extend it below.")}
            </Text>
          </View>
        ) : null}

        <PaymentCurrencyChips options={supported} value={payCcy} onChange={setPayCcy} />

        <View style={{ gap: 12, marginTop: 16 }}>
          {BOOST_TIERS.map((tier) => (
            <View key={tier.key} style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text variant="title">{tier.label}</Text>
                  <Text variant="caption" color="muted">{t("artisans.boost.days", "{{days}} days featured", { days: tier.days })}</Text>
                </View>
                <Text variant="title" color="ink">{fmtCcy(priceForDays(tier.days))}</Text>
              </View>
              <View style={{ gap: 6, marginTop: 12 }}>
                {tier.perks.map((perk) => (
                  <View key={perk} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Check size={15} strokeWidth={2.25} color={colors.brand.green} />
                    <Text variant="caption" color="ink">{perk}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 14 }}>
                <Button
                  title={isFeatured ? t("artisans.boost.extend", "Extend with {{label}}", { label: tier.label }) : t("artisans.boost.choose", "Boost · {{label}}", { label: tier.label })}
                  onPress={() => start.mutate(tier.days)}
                  loading={pendingDays === tier.days}
                  disabled={start.isPending && pendingDays !== tier.days}
                />
              </View>
            </View>
          ))}
        </View>

        <Text variant="caption" color="muted" style={{ marginTop: 16, textAlign: "center", lineHeight: 18 }}>
          {t("artisans.boost.secured", "Payments are processed securely by Flutterwave.")}
        </Text>
      </ScrollView>

      <CheckoutModal
        url={checkout?.url ?? ""}
        visible={!!checkout}
        title={t("artisans.boost.checkoutTitle", "Boost payment")}
        onComplete={onReturn}
        onCancel={() => setCheckout(null)}
      />
    </Screen>
  );
}
