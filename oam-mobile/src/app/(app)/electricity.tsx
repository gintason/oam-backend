import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, XCircle, Zap, Wallet, CreditCard, ChevronDown, Check } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { env } from "@/shared/config/env";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { saveRecent } from "@/shared/lib/recent-beneficiaries";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, billsApi, ConfirmPurchase, PaySummary, PaystackModal, RecentBeneficiaries, TokenCard } from "@/features/bills";
import type { BillOrder } from "@/entities/billing";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

export default function Electricity() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [disco, setDisco] = useState("");
  const [discoOpen, setDiscoOpen] = useState(false);
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [verificationId, setVerificationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardRef, setCardRef] = useState<string | null>(null);

  const billers = useBillers("electricity");
  const wallets = useWallets();
  const ngnBalance = pickHeadline(wallets.data?.wallets)?.balance;
  const selectedDisco = billers.data?.find((b) => b.code === disco);

  function resetCustomer() {
    setCustomerName(undefined);
    setVerificationId("");
  }

  const verify = useMutation({
    mutationFn: () => billsApi.verifyCustomer({ category: "electricity", code: disco, customer_id: meter.trim(), meter_type: meterType }),
    onSuccess: (data) => {
      if (data.customer_name && data.verification_id) {
        setCustomerName(data.customer_name);
        setVerificationId(data.verification_id);
        setError(null);
      } else {
        resetCustomer();
        setError(data.detail || t("electricity.couldntConfirmMeter"));
      }
    },
    onError: (err) => {
      resetCustomer();
      setError(apiErrorMessage(err, t("electricity.couldntVerifyMeter")));
    },
  });

  // Auto-verify once a disco is picked and the meter number looks complete.
  const debouncedMeter = useDebounced(meter, 700);
  useEffect(() => {
    if (disco && debouncedMeter.trim().length >= 11 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disco, debouncedMeter, meterType]);

  const purchase = useMutation({
    mutationFn: () => billsApi.purchase({ category: "electricity", code: disco, recipient: meter.trim(), amount: Number(amount), meter_type: meterType, verification_id: verificationId }),
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
      // Card orders may carry a token once delivered — read the order for it.
      let tok: string | null = null;
      let unit: string | null = null;
      try {
        if (checkout.order_reference) {
          const list = await billsApi.cardStatus(reference);
          tok = (list as { token?: string }).token ?? null;
          unit = (list as { units?: string }).units ?? null;
        }
      } catch { /* token optional */ }
      setOrder({
        id: checkout.id, category: checkout.category, biller_name: selectedDisco?.name ?? "",
        recipient: checkout.recipient, amount: checkout.amount, currency: checkout.currency, pay_with: "card",
        status: delivered ? "success" : failed ? "failed" : "pending",
        reference: checkout.order_reference ?? reference,
        provider: null, customer_name: customerName ?? null, meter_type: meterType, token: tok, units: unit,
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
    mutationFn: () => billsApi.cardStart({ category: "electricity", code: disco, recipient: meter.trim(), amount: Number(amount), meter_type: meterType, verification_id: verificationId, callback_url: `${env.apiUrl}/billing/purchase/card/return/` }),
    onSuccess: (data) => { setConfirming(false); setCardRef(data.reference); setCardUrl(data.authorization_url); },
    onError: (err) => setError(apiErrorMessage(err, t("airtime.errors.cardStartFailed"))),
  });

  function onCardDone() { setCardUrl(null); if (cardRef) verifyCard(cardRef); }
  const pending = purchase.isPending || cardPay.isPending;

  function submit() {
    setError(null);
    setLowFunds(false);
    if (!disco) return setError(t("electricity.chooseProvider"));
    if (meter.trim().length < 6) return setError(t("electricity.invalidMeter"));
    if (!verificationId) return setError(t("electricity.confirmMeterFirst"));
    if (!amount || Number(amount) < 100) return setError(t("electricity.minAmount"));
    setConfirming(true);
  }

  function runPurchase() {
    setConfirming(false);
    saveRecent({ service_type: "electricity", account_identifier: meter.trim(), biller_code: disco, biller_name: selectedDisco?.name, customer_name: customerName });
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
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, paddingBottom: 40 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 24, alignItems: "center" }}>
            {ok ? <CheckCircle2 size={48} strokeWidth={1.5} color={colors.brand.green} /> : isPending ? <Loader2 size={44} strokeWidth={1.5} color={colors.warn} /> : <XCircle size={48} strokeWidth={1.5} color={colors.danger} />}
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>{ok ? t("electricity.successTitle") : isPending ? t("bills.result.inProgress") : t("bills.result.failed")}</Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {ok || isPending ? t("electricity.successMessage", { amount: Number(order.amount).toLocaleString(), recipient: order.recipient }) : t("bills.noChargeRetry")}
            </Text>
          </View>

          {order.token ? (
            <View style={{ marginTop: 16 }}>
              <TokenCard token={order.token} units={order.units ?? undefined} />
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Button title={t("bills.result.buyAgain")} variant="secondary" onPress={() => { setOrder(null); setAmount(""); }} style={{ flex: 1 }} />
            <Button title={t("bills.result.done")} onPress={() => router.back()} style={{ flex: 1 }} />
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
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Zap size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("electricity.title")}</Text><Text variant="caption" color="muted">{t("electricity.subtitle")}</Text></View>
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
          <Text variant="label" style={{ marginBottom: 8 }}>{t("electricity.provider")}</Text>
          {billers.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 16 }} />
          ) : (
            <Pressable onPress={() => setDiscoOpen(true)} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 16 }}>
              <Text variant="body" color={selectedDisco ? "ink" : "muted"}>{selectedDisco?.name ?? t("electricity.selectDisco")}</Text>
              <ChevronDown size={18} color={colors.muted} />
            </Pressable>
          )}

          {/* Meter type */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("electricity.meterType")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {(["prepaid", "postpaid"] as const).map((mt) => {
              const sel = meterType === mt;
              return (
                <Pressable key={mt} onPress={() => { setMeterType(mt); resetCustomer(); }} style={{ flex: 1, height: 46, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="label" color={sel ? "green" : "ink"}>{t(`electricity.${mt}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Saved meters */}
          <RecentBeneficiaries
            type="electricity"
            enabled={isVerified}
            onPick={(it) => { setMeter(it.account_identifier); if (it.biller_code) setDisco(it.biller_code); resetCustomer(); }}
          />

          {/* Meter number */}
          <Input
            label={t("electricity.meterNumber")}
            value={meter}
            onChangeText={(t) => { setMeter(t.replace(/[^\d]/g, "")); resetCustomer(); setError(null); }}
            keyboardType="number-pad"
            placeholder={t("electricity.meterPlaceholder")}
          />
          {verify.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 12 }}>
              <ActivityIndicator size="small" color={colors.muted} /><Text variant="caption" color="muted">{t("electricity.checkingMeter")}</Text>
            </View>
          ) : customerName ? (
            <View style={{ marginTop: -8, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <BadgeCheck size={15} strokeWidth={2} color={colors.brand.green} />
              <Text variant="label" color="green">{customerName}</Text>
            </View>
          ) : disco && meter.length > 0 && meter.length < 11 ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>
              {t("electricity.keepTyping", { count: meter.length })}
            </Text>
          ) : !disco && meter.length > 0 ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>{t("electricity.chooseProviderFirst")}</Text>
          ) : null}

          {/* Amount */}
          <Input
            label={t("electricity.amountLabel")}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("electricity.amountPlaceholder")}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -6, marginBottom: 18 }}>
            {QUICK_AMOUNTS.map((a) => {
              const sel = Number(amount) === a;
              return (
                <Pressable key={a} onPress={() => setAmount(String(a))} style={{ height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="label" color={sel ? "paper" : "ink"}>{naira(a)}</Text>
                </Pressable>
              );
            })}
          </View>

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

          <PaySummary amount={Number(amount) || 0} payWith={payWith} balance={payWith === "wallet" ? ngnBalance : undefined} />

          <View style={{ marginTop: 18 }}>
            <Button title={amount ? t("electricity.payAmount", { amount: Number(amount).toLocaleString() }) : t("electricity.buyUnits")} onPress={submit} loading={pending} />
          </View>
          <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
            {payWith === "card" ? t("bills.payNoteCardShort") : t("bills.payNoteWallet")}
          </Text>
        </View>
      </ScrollView>

      {/* Disco picker */}
      <Modal visible={discoOpen} transparent animationType="slide" onRequestClose={() => setDiscoOpen(false)}>
        <Pressable onPress={() => setDiscoOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 28, maxHeight: "70%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>{t("electricity.chooseProvider")}</Text>
            <ScrollView>
              {billers.data?.map((b) => {
                const sel = b.code === disco;
                return (
                  <Pressable key={b.id} onPress={() => { setDisco(b.code); resetCustomer(); setDiscoOpen(false); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                    <Text variant="body" color={sel ? "green" : "ink"}>{b.name}</Text>
                    {sel ? <Check size={18} strokeWidth={2.5} color={colors.brand.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PaystackModal visible={!!cardUrl} url={cardUrl ?? ""} onComplete={onCardDone} onCancel={() => setCardUrl(null)} />

      <ConfirmPurchase
        open={confirming}
        title={t("bills.confirmTitle")}
        lines={[
          { label: t("bills.service"), value: `${t("electricity.label")}${selectedDisco ? ` · ${selectedDisco.name}` : ""}` },
          { label: t("electricity.meterNumber"), value: `${meter.trim()} (${t(`electricity.${meterType}`)})` },
          { label: t("bills.result.customer"), value: customerName ?? "—" },
          { label: t("bills.amount"), value: naira(Number(amount) || 0) },
          { label: t("bills.payWith"), value: payWith === "card" ? t("bills.card") : t("bills.wallet") },
        ]}
        confirmLabel={t("electricity.payAmount", { amount: (Number(amount) || 0).toLocaleString() })}
        pending={pending}
        onConfirm={runPurchase}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
