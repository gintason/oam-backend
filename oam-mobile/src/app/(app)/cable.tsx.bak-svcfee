import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, XCircle, Tv, Wallet, CreditCard } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { env } from "@/shared/config/env";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { saveRecent } from "@/shared/lib/recent-beneficiaries";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, useTvPlans, billsApi, ConfirmPurchase, PaySummary, PaystackModal, RecentBeneficiaries } from "@/features/bills";
import type { BillOrder, Plan } from "@/entities/billing";

export default function Cable() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [smartcard, setSmartcard] = useState("");
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [verificationId, setVerificationId] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [error, setError] = useState<string | null>(null);
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardRef, setCardRef] = useState<string | null>(null);

  const billers = useBillers("cable");
  const plans = useTvPlans(provider || undefined);
  const wallets = useWallets();
  const ngnBalance = pickHeadline(wallets.data?.wallets)?.balance;
  const selectedProvider = billers.data?.find((b) => b.code === provider);

  function resetCustomer() {
    setCustomerName(undefined);
    setVerificationId("");
  }

  const verify = useMutation({
    mutationFn: () => billsApi.verifyCustomer({ category: "cable", code: provider, customer_id: smartcard.trim() }),
    onSuccess: (data) => {
      if (data.customer_name && data.verification_id) {
        setCustomerName(data.customer_name);
        setVerificationId(data.verification_id);
        setError(null);
      } else {
        resetCustomer();
        setError(data.detail || t("cable.couldntConfirmSmartcard"));
      }
    },
    onError: (err) => {
      resetCustomer();
      setError(apiErrorMessage(err, t("cable.couldntVerifySmartcard")));
    },
  });

  const debouncedCard = useDebounced(smartcard, 700);
  useEffect(() => {
    if (provider && debouncedCard.trim().length >= 10 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, debouncedCard]);

  const purchase = useMutation({
    mutationFn: () =>
      billsApi.purchase({ category: "cable", code: provider, recipient: smartcard.trim(), amount: Number(plan?.price ?? 0), plan_code: plan?.variation_id, variation_id: plan?.variation_id || "", verification_id: verificationId }),
    onSuccess: (data) => { setOrder(data); qc.invalidateQueries({ queryKey: ["wallets"] }); qc.invalidateQueries({ queryKey: ["transactions"] }); },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Couldn't complete the purchase.");
      const st = (err as { response?: { status?: number } })?.response?.status;
      setLowFunds(st === 402 || /insufficient|balance|fund/i.test(msg));
      setError(msg);
    },
  });

  async function verifyCard(reference: string) {
    setVerifying(true);
    try {
      let checkout = await billsApi.cardStatus(reference);
      for (let i = 0; i < 4 && ["pending", "payment_received"].includes(String(checkout.status)); i++) {
        if (checkout.order_status === "success" || checkout.order_status === "failed") break;
        await new Promise((r) => setTimeout(r, 2000));
        checkout = await billsApi.cardStatus(reference);
      }
      const delivered = checkout.status === "delivered" || checkout.order_status === "success";
      const failed = checkout.status === "failed" || checkout.order_status === "failed";
      setOrder({
        id: checkout.id, category: checkout.category, biller_name: selectedProvider?.name ?? "",
        recipient: checkout.recipient, amount: checkout.amount, currency: checkout.currency, pay_with: "card",
        status: delivered ? "success" : failed ? "failed" : "pending",
        reference: checkout.order_reference ?? reference,
        provider: null, customer_name: customerName ?? null, meter_type: null, token: null, units: null,
        created_at: checkout.created_at, updated_at: checkout.created_at,
      } as BillOrder);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("bills.errVerifyPayment")));
    } finally {
      setVerifying(false);
    }
  }

  const cardPay = useMutation({
    mutationFn: () =>
      billsApi.cardStart({ category: "cable", code: provider, recipient: smartcard.trim(), amount: Number(plan?.price ?? 0), plan_code: plan?.variation_id, variation_id: plan?.variation_id || "", verification_id: verificationId, callback_url: `${env.apiUrl}/billing/purchase/card/return/` }),
    onSuccess: (data) => { setConfirming(false); setCardRef(data.reference); setCardUrl(data.authorization_url); },
    onError: (err) => setError(apiErrorMessage(err, t("airtime.errors.cardStartFailed"))),
  });

  function onCardDone() { setCardUrl(null); if (cardRef) verifyCard(cardRef); }
  const pending = purchase.isPending || cardPay.isPending;

  function submit() {
    setError(null);
    setLowFunds(false);
    if (!provider) return setError(t("cable.chooseProvider"));
    if (!plan) return setError(t("cable.choosePackage"));
    if (smartcard.trim().length < 6) return setError(t("cable.invalidSmartcard"));
    if (!verificationId) return setError(t("cable.waitSmartcard"));
    setConfirming(true);
  }

  function runPurchase() {
    setConfirming(false);
    saveRecent({ service_type: "cable", account_identifier: smartcard.trim(), biller_code: provider, biller_name: selectedProvider?.name, customer_name: customerName });
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("bills.verifyGate.title")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("bills.verifyGate.body")}</Text>
          <Button title={t("bills.goBack")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  if (verifying) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Loader2 size={40} strokeWidth={1.5} color={colors.brand.green} />
          <Text variant="heading">{t("bills.verifyingTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("bills.verifyingBody")}</Text>
        </View>
      </Screen>
    );
  }

  if (order) {
    const ok = order.status === "success";
    const isPending = ["pending", "processing"].includes(String(order.status).toLowerCase());
    return (
      <Screen edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 28, alignItems: "center" }}>
            {ok ? <CheckCircle2 size={48} strokeWidth={1.5} color={colors.brand.green} /> : isPending ? <Loader2 size={44} strokeWidth={1.5} color={colors.warn} /> : <XCircle size={48} strokeWidth={1.5} color={colors.danger} />}
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>{ok ? t("cable.successTitle") : isPending ? t("bills.result.inProgress") : t("bills.result.failed")}</Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {ok || isPending ? t("cable.successMessage", { plan: plan?.name ?? t("bills.plan"), recipient: order.recipient }) : t("bills.noChargeRetry")}
            </Text>
            <View style={{ marginTop: 18, width: "100%", borderRadius: 14, backgroundColor: colors.mist, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text variant="caption" color="muted">{t("bills.result.status")}</Text><Text variant="label" color="ink">{order.status}</Text></View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text variant="caption" color="muted">{t("bills.result.reference")}</Text><Text variant="mono" color="ink" style={{ fontSize: 11 }}>{order.reference}</Text></View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 22, width: "100%" }}>
              <Button title={t("cable.renewAgain")} variant="secondary" onPress={() => { setOrder(null); setPlan(null); }} style={{ flex: 1 }} />
              <Button title={t("bills.result.done")} onPress={() => router.back()} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <Tv size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <View><Text variant="heading">{t("cable.title")}</Text><Text variant="caption" color="muted">{t("cable.subtitle")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}
          {lowFunds ? (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12 }}>
              <Text variant="caption" color="ink">{t("bills.lowFunds")}</Text>
              <Pressable onPress={() => setPayWith("card")} style={{ marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brand.green, paddingHorizontal: 14, height: 34, borderRadius: 9 }}>
                <CreditCard size={14} strokeWidth={2} color="#FFF" /><Text variant="caption" color="paper">{t("bills.switchToCard")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Provider */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("cable.provider")}</Text>
          {billers.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 16 }} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {billers.data?.map((b) => {
                const sel = provider === b.code;
                return (
                  <Pressable key={b.id} onPress={() => { setProvider(b.code); setPlan(null); resetCustomer(); }} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper }}>
                    <Text variant="label" color={sel ? "green" : "ink"}>{b.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Packages */}
          {provider ? (
            <>
              <Text variant="label" style={{ marginBottom: 8 }}>{t("cable.package")}</Text>
              {plans.isLoading ? (
                <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 16 }} />
              ) : (plans.data?.length ?? 0) === 0 ? (
                <Text variant="caption" color="muted" style={{ marginBottom: 16 }}>{t("cable.noPackages")}</Text>
              ) : (
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {plans.data?.map((p) => {
                    const sel = plan?.variation_id === p.variation_id;
                    return (
                      <Pressable key={p.variation_id} onPress={() => setPlan(p)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.06)" : colors.paper, paddingHorizontal: 14, paddingVertical: 12 }}>
                        <Text variant="label" color="ink" numberOfLines={1} style={{ flex: 1, paddingRight: 10 }}>{p.name}</Text>
                        <Text variant="label" color="green">{naira(p.price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          {/* Saved smartcards */}
          <RecentBeneficiaries
            type="cable"
            enabled={isVerified}
            onPick={(it) => { setSmartcard(it.account_identifier); if (it.biller_code) setProvider(it.biller_code); resetCustomer(); }}
          />

          {/* Smartcard */}
          <Input
            label={t("cable.smartcard")}
            value={smartcard}
            onChangeText={(t) => { setSmartcard(t.replace(/[^\d]/g, "")); resetCustomer(); setError(null); }}
            keyboardType="number-pad"
            placeholder={t("cable.smartcardPlaceholder")}
          />
          {verify.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 12 }}>
              <ActivityIndicator size="small" color={colors.muted} /><Text variant="caption" color="muted">{t("cable.checkingSmartcard")}</Text>
            </View>
          ) : customerName ? (
            <View style={{ marginTop: -8, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <BadgeCheck size={15} strokeWidth={2} color={colors.brand.green} />
              <Text variant="label" color="green">{customerName}</Text>
            </View>
          ) : provider && smartcard.length > 0 && smartcard.length < 10 ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>{t("cable.keepTyping")}</Text>
          ) : !provider && smartcard.length > 0 ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>{t("cable.chooseProviderFirst")}</Text>
          ) : null}

          {/* Payment method */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("bills.payWith")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            {([{ key: "wallet", label: t("bills.wallet"), Icon: Wallet }, { key: "card", label: t("bills.card"), Icon: CreditCard }] as const).map((m) => {
              const sel = payWith === m.key;
              return (
                <Pressable key={m.key} onPress={() => setPayWith(m.key)} style={{ flex: 1, height: 48, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <View style={{ height: 16, width: 16, borderRadius: 8, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, alignItems: "center", justifyContent: "center" }}>{sel ? <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.brand.green }} /> : null}</View>
                  <m.Icon size={16} strokeWidth={1.75} color={sel ? colors.brand.green : colors.muted} />
                  <Text variant="label" color={sel ? "green" : "muted"}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <PaySummary amount={Number(plan?.price) || 0} payWith={payWith} balance={payWith === "wallet" ? ngnBalance : undefined} label={t("cable.package")} />

          <View style={{ marginTop: 18 }}>
            <Button title={plan ? t("cable.payAmount", { amount: Number(plan.price).toLocaleString() }) : t("cable.subscribe")} onPress={submit} loading={pending} />
          </View>
          <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
            {payWith === "card" ? t("bills.payNoteCardShort") : t("bills.payNoteWallet")}
          </Text>
        </View>
      </ScrollView>

      <PaystackModal visible={!!cardUrl} url={cardUrl ?? ""} onComplete={onCardDone} onCancel={() => setCardUrl(null)} />

      <ConfirmPurchase
        open={confirming}
        title={t("bills.confirmTitle")}
        lines={[
          { label: t("bills.service"), value: `${t("cable.title")}${selectedProvider ? ` · ${selectedProvider.name}` : ""}` },
          { label: t("cable.package"), value: plan?.name ?? "" },
          { label: t("cable.smartcard"), value: smartcard.trim() },
          { label: t("bills.result.customer"), value: customerName ?? "—" },
          { label: t("bills.amount"), value: naira(Number(plan?.price) || 0) },
          { label: t("bills.payWith"), value: payWith === "card" ? t("bills.card") : t("bills.wallet") },
        ]}
        confirmLabel={t("cable.payAmount", { amount: (Number(plan?.price) || 0).toLocaleString() })}
        pending={pending}
        onConfirm={runPurchase}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
