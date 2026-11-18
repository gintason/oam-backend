import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, GraduationCap, Minus, Plus } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, billsApi } from "@/features/bills";
import { PinsResult } from "@/features/bills/ui/PinsResult";
import { Chip } from "@/features/bills/ui/Chip";
import type { BillOrder, Plan } from "@/entities/billing";

/** Education — WAEC result checker / registration and JAMB PINs. Paid from the wallet. */
export default function Education() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [exam, setExam] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [qty, setQty] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [verificationId, setVerificationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const isJamb = exam.toLowerCase() === "jamb";

  const billers = useBillers("education");
  const plans = useQuery({ queryKey: ["education-plans", exam], queryFn: () => billsApi.getEducationPlans(exam), enabled: isVerified && Boolean(exam) });
  const wallets = useWallets();
  const balance = pickHeadline(wallets.data?.wallets)?.balance;
  const fee = Number(billers.data?.find((b) => b.code === exam)?.service_fee ?? 0);

  const verify = useMutation({
    mutationFn: () => billsApi.verifyCustomer({ category: "education", code: exam, customer_id: profileId.trim(), variation_id: plan?.variation_id }),
    onSuccess: (d) => {
      if (d.customer_name && d.verification_id) { setCustomerName(d.customer_name); setVerificationId(d.verification_id); setError(null); }
      else { setCustomerName(undefined); setVerificationId(""); setError(t("education.errProfile", "Couldn't confirm that JAMB profile.")); }
    },
    onError: (err) => { setCustomerName(undefined); setError(apiErrorMessage(err, t("education.errProfile", "Couldn't confirm that JAMB profile."))); },
  });
  const debounced = useDebounced(profileId, 700);
  useEffect(() => {
    if (isJamb && plan && debounced.trim().length >= 10 && !customerName && !verify.isPending) verify.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJamb, plan, debounced]);

  const purchase = useMutation({
    mutationFn: () => billsApi.purchase({
      category: "education", code: exam, recipient: isJamb ? profileId.trim() : "self",
      amount: Number(plan?.price ?? 0) * qty, variation_id: plan?.variation_id, plan_code: plan?.variation_id,
      quantity: isJamb ? 1 : qty, verification_id: verificationId || undefined,
    }),
    onSuccess: (d) => setOrder(d),
    onError: (err) => setError(apiErrorMessage(err, t("bills.errPurchase", "Purchase failed. Try again."))),
  });

  function submit() {
    setError(null);
    if (!exam) return setError(t("education.errExam", "Choose an exam."));
    if (!plan) return setError(t("education.errType", "Choose what you want to buy."));
    if (isJamb && !verificationId) return setError(t("education.errVerify", "Enter the JAMB profile ID and wait for it to be confirmed."));
    purchase.mutate();
  }

  if (order) {
    return <PinsResult order={order} title={t("education.ready", "Your exam PIN is ready")}
                       onAgain={() => { setOrder(null); setPlan(null); }} onDone={() => router.back()} />;
  }

  const total = (Number(plan?.price) || 0) * (isJamb ? 1 : qty);
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <GraduationCap size={22} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t("education.title", "Education")}</Text>
            <Text variant="caption" color="muted">{t("education.subtitle", "WAEC result checker, WAEC registration and JAMB PINs.")}</Text>
          </View>
        </View>

        {error ? <Text variant="caption" color="danger" style={{ marginBottom: 10 }}>{error}</Text> : null}

        <Text variant="label" style={{ marginBottom: 8 }}>{t("education.exam", "Exam")}</Text>
        {billers.isLoading ? <ActivityIndicator color={colors.brand.green} /> : (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {(billers.data ?? []).map((b) => (
              <Chip key={b.id} label={b.name} active={exam === b.code}
                    onPress={() => { setExam(b.code); setPlan(null); setCustomerName(undefined); setVerificationId(""); }} />
            ))}
          </View>
        )}

        {exam ? (
          <>
            <Text variant="label" style={{ marginBottom: 8 }}>{t("education.type", "Type")}</Text>
            {plans.isLoading ? <ActivityIndicator color={colors.brand.green} style={{ marginBottom: 16 }} /> :
              (plans.data?.length ?? 0) === 0 ? (
                <Text variant="caption" color="muted" style={{ marginBottom: 16 }}>{t("education.none", "Not available right now. Please try again later.")}</Text>
              ) : (
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {plans.data!.map((p) => (
                    <Pressable key={p.variation_id} onPress={() => { setPlan(p); setCustomerName(undefined); setVerificationId(""); }}
                               style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1,
                                        borderColor: plan?.variation_id === p.variation_id ? colors.brand.green : colors.hairline,
                                        backgroundColor: plan?.variation_id === p.variation_id ? "rgba(11,115,39,0.05)" : colors.paper }}>
                      <Text variant="label" style={{ flex: 1 }} numberOfLines={2}>{p.name}</Text>
                      <Text variant="label" color="green">{naira(p.price)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
          </>
        ) : null}

        {plan && isJamb ? (
          <View style={{ marginBottom: 16 }}>
            <Input label={t("education.profileId", "JAMB profile ID")} keyboardType="number-pad" value={profileId}
                   onChangeText={(v) => { setProfileId(v.replace(/[^\d]/g, "")); setCustomerName(undefined); setVerificationId(""); }}
                   placeholder={t("education.profilePlaceholder", "Enter the candidate's profile ID")} />
            {verify.isPending ? <Text variant="caption" color="muted" style={{ marginTop: 6 }}>{t("education.checking", "Checking profile…")}</Text> : null}
            {customerName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                <BadgeCheck size={15} color={colors.brand.green} /><Text variant="label" color="green">{customerName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {plan && !isJamb ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text variant="label">{t("education.howMany", "How many?")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Pressable onPress={() => setQty(Math.max(1, qty - 1))} hitSlop={8} style={{ height: 36, width: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}><Minus size={16} color={colors.ink} /></Pressable>
              <Text variant="title">{qty}</Text>
              <Pressable onPress={() => setQty(Math.min(5, qty + 1))} hitSlop={8} style={{ height: 36, width: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}><Plus size={16} color={colors.ink} /></Pressable>
            </View>
          </View>
        ) : null}

        {plan ? (
          <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 14, gap: 4 }}>
            <Text variant="caption" color="muted">{t("pins.total", "Total")}: <Text variant="label">{naira(total + fee)}</Text>{fee ? ` (${t("pins.inclFee", "incl.")} ${naira(fee)} ${t("pins.fee", "fee")})` : ""}</Text>
            {balance != null ? <Text variant="caption" color="muted">{t("pins.balance", "Wallet balance")}: {naira(balance)}</Text> : null}
          </View>
        ) : null}

        <Button title={plan ? `${t("pins.pay", "Pay")} ${naira(total + fee)}` : t("education.buy", "Buy PIN")} onPress={submit} loading={purchase.isPending} />
        <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
          {t("education.note", "Paid from your O.A.M wallet. Your PIN appears here and in your order history.")}
        </Text>
      </ScrollView>
    </Screen>
  );
}
