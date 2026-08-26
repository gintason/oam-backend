import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Loader2, XCircle, Smartphone, Wallet, CreditCard } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { env } from "@/shared/config/env";
import { colors } from "@/shared/theme";
import { naira, formatPhone, detectNetwork } from "@/shared/lib/format";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, billsApi, ConfirmPurchase, PaySummary, PaystackModal, RecentBeneficiaries } from "@/features/bills";
import { saveRecent } from "@/shared/lib/recent-beneficiaries";
import type { BillOrder } from "@/entities/billing";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

const { width } = Dimensions.get("window");
const NET_GAP = 8;
const NET_W = (width - 40 - 32 - NET_GAP * 3) / 4; // screen pad 20*2, card pad 16*2, 3 gaps

export default function Airtime() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [error, setError] = useState<string | null>(null);
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardRef, setCardRef] = useState<string | null>(null);
  const [touchedNetwork, setTouchedNetwork] = useState(false);

  const billers = useBillers("airtime");
  const wallets = useWallets();
  const ngnBalance = pickHeadline(wallets.data?.wallets)?.balance;

  // Suggest network from the phone prefix; stop once the user picks one.
  useEffect(() => {
    if (touchedNetwork || phone.length < 4) return;
    const guess = detectNetwork(phone);
    if (!guess) return;
    const match = billers.data?.find(
      (b) => b.code.toLowerCase().includes(guess) || b.name.toLowerCase().includes(guess),
    );
    if (match && match.code !== network) setNetwork(match.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, billers.data, touchedNetwork]);

  const purchase = useMutation({
    mutationFn: () => billsApi.purchase({ category: "airtime", code: network, recipient: phone.trim(), amount: Number(amount) }),
    onSuccess: (data) => {
      setOrder(data);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, t("bills.errPurchase"));
      const status = (err as { response?: { status?: number } })?.response?.status;
      const insufficient = status === 402 || /insufficient|balance|fund/i.test(msg);
      setLowFunds(insufficient);
      setError(msg);
    },
  });

  async function verifyCard(reference: string) {
    setVerifying(true);
    try {
      // Poll briefly while the Paystack webhook settles.
      let checkout = await billsApi.cardStatus(reference);
      for (let i = 0; i < 4 && ["pending", "payment_received"].includes(String(checkout.status)); i++) {
        if (checkout.order_status === "success" || checkout.order_status === "failed") break;
        await new Promise((r) => setTimeout(r, 2000));
        checkout = await billsApi.cardStatus(reference);
      }
      const delivered = checkout.status === "delivered" || checkout.order_status === "success";
      const failed = checkout.status === "failed" || checkout.order_status === "failed";
      setOrder({
        id: checkout.id,
        category: checkout.category,
        biller_name: selectedBiller?.name ?? "",
        recipient: checkout.recipient,
        amount: checkout.amount,
        currency: checkout.currency,
        pay_with: "card",
        status: delivered ? "success" : failed ? "failed" : "pending",
        reference: checkout.order_reference ?? reference,
        provider: null,
        customer_name: null,
        meter_type: null,
        token: null,
        units: null,
        created_at: checkout.created_at,
        updated_at: checkout.created_at,
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
      billsApi.cardStart({
        category: "airtime",
        code: network,
        recipient: phone.trim(),
        amount: Number(amount),
        callback_url: `${env.apiUrl}/billing/purchase/card/return/`,
      }),
    onSuccess: (data) => {
      setConfirming(false);
      setCardRef(data.reference);
      setCardUrl(data.authorization_url); // opens the in-app Paystack WebView
    },
    onError: (err) => setError(apiErrorMessage(err, t("airtime.errors.cardStartFailed"))),
  });

  function onCardDone() {
    setCardUrl(null);
    if (cardRef) verifyCard(cardRef);
  }

  const pending = purchase.isPending || cardPay.isPending;

  function submit() {
    setError(null);
    setLowFunds(false);
    if (!network) return setError(t("airtime.errors.chooseNetwork"));
    if (phone.trim().length < 10) return setError(t("airtime.errors.invalidPhone"));
    if (!amount || Number(amount) <= 0) return setError(t("airtime.errors.enterAmount"));
    setConfirming(true);
  }

  function runPurchase() {
    setConfirming(false);
    saveRecent({
      service_type: "airtime",
      account_identifier: phone.trim(),
      biller_code: network,
      biller_name: selectedBiller?.name,
    });
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  const selectedBiller = billers.data?.find((b) => b.code === network);

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("airtime.gate.title")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>
            {t("airtime.gate.body")}
          </Text>
          <Button title={t("bills.goBack", "Go back")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  // ---- verifying card payment ----
  if (verifying) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Loader2 size={40} strokeWidth={1.5} color={colors.brand.green} />
          <Text variant="heading">{t("bills.verifyingTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>
            {t("bills.verifyingBody")}
          </Text>
        </View>
      </Screen>
    );
  }

  // ---- success screen ----
  if (order) {
    const ok = order.status === "success";
    const isPending = ["pending", "processing"].includes(String(order.status).toLowerCase());
    return (
      <Screen edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 28, alignItems: "center" }}>
            {ok ? (
              <CheckCircle2 size={48} strokeWidth={1.5} color={colors.brand.green} />
            ) : isPending ? (
              <Loader2 size={44} strokeWidth={1.5} color={colors.warn} />
            ) : (
              <XCircle size={48} strokeWidth={1.5} color={colors.danger} />
            )}
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>
              {ok ? t("airtime.success.titleOk") : isPending ? t("bills.result.inProgress") : t("airtime.success.titleFailed")}
            </Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {ok
                ? `${naira(order.amount)} · ${order.recipient} · ${order.biller_name}`
                : isPending
                ? t("bills.processingShort")
                : t("bills.noChargeRetry")}
            </Text>

            <View style={{ marginTop: 18, width: "100%", borderRadius: 14, backgroundColor: colors.mist, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color="muted">{t("airtime.success.status")}</Text>
                <Text variant="label" color="ink">{order.status}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color="muted">{t("airtime.success.reference")}</Text>
                <Text variant="mono" color="ink" style={{ fontSize: 11 }}>{order.reference}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 22, width: "100%" }}>
              <Button title={t("airtime.success.buyAgain")} variant="secondary" onPress={() => { setOrder(null); setAmount(""); }} style={{ flex: 1 }} />
              <Button title={t("airtime.success.done")} onPress={() => router.back()} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ---- form ----
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} />
          <Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Smartphone size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View>
            <Text variant="heading">{t("airtime.title")}</Text>
            <Text variant="caption" color="muted">{t("airtime.subtitle")}</Text>
          </View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text variant="caption" color="danger">{error}</Text>
            </View>
          ) : null}

          {lowFunds ? (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12 }}>
              <Text variant="caption" color="ink">{t("bills.lowFundsAdd")}</Text>
              <Pressable onPress={() => router.push("/wallet")} style={{ marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brand.green, paddingHorizontal: 14, height: 34, borderRadius: 9 }}>
                <CreditCard size={14} strokeWidth={2} color="#FFF" />
                <Text variant="caption" color="paper">{t("bills.fundWallet")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Network */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("airtime.network")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: NET_GAP, marginBottom: 16 }}>
            {billers.data?.map((b) => {
              const selected = network === b.code;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => { setNetwork(b.code); setTouchedNetwork(true); }}
                  style={{
                    width: NET_W,
                    height: 48,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? colors.brand.green : colors.hairline,
                    backgroundColor: selected ? "rgba(11,115,39,0.10)" : colors.paper,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="label" color={selected ? "green" : "ink"} numberOfLines={1}>{b.name}</Text>
                  {selected ? (
                    <View style={{ position: "absolute", top: -6, right: -6, height: 20, width: 20, borderRadius: 10, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center" }}>
                      <Check size={12} strokeWidth={3} color="#FFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Recent numbers */}
          <RecentBeneficiaries
            type="airtime"
            enabled={isVerified}
            onPick={(it) => {
              setPhone(it.account_identifier);
              if (it.biller_code) {
                setNetwork(it.biller_code);
                setTouchedNetwork(true);
              }
            }}
          />

          {/* Phone */}
          <Input
            label={t("airtime.phoneNumber")}
            value={formatPhone(phone)}
            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 11))}
            keyboardType="number-pad"
            placeholder={t("airtime.phonePlaceholder")}
          />
          {phone.length >= 4 && detectNetwork(phone) && !touchedNetwork ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>
              {t("airtime.networkGuess", { network: detectNetwork(phone)?.toUpperCase() })}
            </Text>
          ) : null}

          {/* Amount */}
          <Input
            label={t("airtime.amountLabel")}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("airtime.amountPlaceholder")}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -6, marginBottom: 18 }}>
            {QUICK_AMOUNTS.map((a) => {
              const selected = Number(amount) === a;
              return (
                <Pressable
                  key={a}
                  onPress={() => setAmount(String(a))}
                  style={{
                    height: 38,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected ? colors.brand.green : colors.hairline,
                    backgroundColor: selected ? colors.brand.green : colors.paper,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="label" color={selected ? "paper" : "ink"}>{naira(a)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Payment method */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("bills.payWith")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            {([
              { key: "wallet", label: t("bills.wallet"), Icon: Wallet },
              { key: "card", label: t("bills.card"), Icon: CreditCard },
            ] as const).map((m) => {
              const selected = payWith === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setPayWith(m.key)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? colors.brand.green : colors.hairline,
                    backgroundColor: selected ? "rgba(11,115,39,0.10)" : colors.paper,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <View style={{ height: 16, width: 16, borderRadius: 8, borderWidth: 2, borderColor: selected ? colors.brand.green : colors.hairline, alignItems: "center", justifyContent: "center" }}>
                    {selected ? <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.brand.green }} /> : null}
                  </View>
                  <m.Icon size={16} strokeWidth={1.75} color={selected ? colors.brand.green : colors.muted} />
                  <Text variant="label" color={selected ? "green" : "muted"}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <PaySummary amount={Number(amount) || 0} payWith={payWith} balance={payWith === "wallet" ? ngnBalance : undefined} />

          <View style={{ marginTop: 18 }}>
            <Button title={amount ? t("airtime.pay", { amount: Number(amount).toLocaleString() }) : t("airtime.buyAirtime")} onPress={submit} loading={pending} />
          </View>
          <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
            {payWith === "card" ? t("bills.payNoteCardShort") : t("bills.payNoteWallet")}
          </Text>
        </View>
      </ScrollView>

      <PaystackModal
        visible={!!cardUrl}
        url={cardUrl ?? ""}
        onComplete={onCardDone}
        onCancel={() => setCardUrl(null)}
      />

      <ConfirmPurchase
        open={confirming}
        title={t("airtime.confirm.title")}
        lines={[
          { label: t("airtime.confirm.service"), value: `${t("airtime.title")}${selectedBiller ? ` · ${selectedBiller.name}` : ""}` },
          { label: t("airtime.confirm.phone"), value: formatPhone(phone) },
          { label: t("airtime.confirm.amount"), value: naira(Number(amount) || 0) },
          { label: t("airtime.confirm.payWith"), value: payWith === "card" ? t("bills.card") : t("bills.wallet") },
        ]}
        confirmLabel={t("airtime.confirm.confirmLabel", { amount: naira(Number(amount) || 0) })}
        pending={pending}
        onConfirm={runPurchase}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
