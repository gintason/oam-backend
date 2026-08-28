import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, XCircle, Ticket, ChevronDown, Check, Wallet, CreditCard } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { env } from "@/shared/config/env";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { useBillers, billsApi, ConfirmPurchase, PaystackModal } from "@/features/bills";
import type { BillOrder } from "@/entities/billing";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const SERVICE_FEE = 50;

export default function Betting() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [provider, setProvider] = useState("");
  const [providerOpen, setProviderOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [verificationId, setVerificationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardRef, setCardRef] = useState<string | null>(null);

  const billers = useBillers("betting");
  const wallets = useWallets();
  const ngnBalance = pickHeadline(wallets.data?.wallets)?.balance;
  const selected = billers.data?.find((b) => b.code === provider);

  function resetCustomer() {
    setCustomerName(undefined);
    setVerificationId("");
  }

  const verify = useMutation({
    mutationFn: () => billsApi.verifyCustomer({ category: "betting", code: provider, customer_id: account.trim() }),
    onSuccess: (data) => {
      if (data.customer_name && data.verification_id) {
        setCustomerName(data.customer_name);
        setVerificationId(data.verification_id);
        setError(null);
      } else {
        resetCustomer();
        setError(data.detail || t("betting.couldntConfirm", "Couldn't confirm that betting account."));
      }
    },
    onError: (err) => {
      resetCustomer();
      setError(apiErrorMessage(err, t("betting.couldntVerify", "Couldn't verify that betting account.")));
    },
  });

  const debouncedAccount = useDebounced(account, 700);
  useEffect(() => {
    if (provider && debouncedAccount.trim().length >= 4 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, debouncedAccount]);

  const amt = Number(amount) || 0;
  const total = amt > 0 ? amt + SERVICE_FEE : 0;

  const fund = useMutation({
    mutationFn: () => billsApi.fundBetting({ code: provider, customer_id: account.trim(), amount: amt, verification_id: verificationId }),
    onSuccess: (data) => { setOrder(data); qc.invalidateQueries({ queryKey: ["wallets"] }); qc.invalidateQueries({ queryKey: ["transactions"] }); },
    onError: (err) => {
      const msg = apiErrorMessage(err, t("betting.errFund", "Funding failed. Try again."));
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? t("betting.lowFunds", "Your wallet balance is too low. Add money and try again.") : msg);
    },
  });

  const cardPay = useMutation({
    mutationFn: () => billsApi.cardStart({ category: "betting", code: provider, recipient: account.trim(), amount: total, verification_id: verificationId, callback_url: `${env.apiUrl}/billing/purchase/card/return/` }),
    onSuccess: (data) => { setConfirming(false); setCardRef(data.reference); setCardUrl(data.authorization_url); },
    onError: (err) => setError(apiErrorMessage(err, t("betting.errCard", "Couldn't start card payment."))),
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
        id: checkout.id, category: checkout.category, biller_name: selected?.name ?? "",
        recipient: checkout.recipient, amount: checkout.amount, cost_amount: String(amt), currency: checkout.currency, pay_with: "card",
        status: delivered ? "success" : failed ? "failed" : "pending",
        reference: checkout.order_reference ?? reference,
        provider: null, customer_name: customerName ?? null, created_at: checkout.created_at, updated_at: checkout.created_at,
      } as BillOrder);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("bills.errVerifyPayment", "Couldn't verify the payment.")));
    } finally {
      setVerifying(false);
    }
  }

  function onCardDone() { setCardUrl(null); if (cardRef) verifyCard(cardRef); }
  const pending = fund.isPending || cardPay.isPending;

  function submit() {
    setError(null);
    if (!provider) return setError(t("betting.chooseProvider", "Choose a betting provider."));
    if (account.trim().length < 3) return setError(t("betting.invalidAccount", "Enter a valid betting account ID."));
    if (!verificationId) return setError(t("betting.confirmFirst", "Confirm the betting account first."));
    if (amt < 100) return setError(t("betting.minAmount", "Enter an amount of at least ₦100."));
    if (amt > 100000) return setError(t("betting.maxAmount", "Maximum funding is ₦100,000."));
    setConfirming(true);
  }

  function runFund() {
    setConfirming(false);
    if (payWith === "card") cardPay.mutate();
    else fund.mutate();
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("bills.verifyGate.title", "Verify your account")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("bills.verifyGate.body", "You need a verified account to fund betting wallets.")}</Text>
          <Button title={t("bills.goBack", "Go back")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  if (verifying) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Loader2 size={40} strokeWidth={1.5} color={colors.brand.green} />
          <Text variant="heading">{t("bills.verifyingTitle", "Confirming payment…")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("bills.verifyingBody", "This only takes a moment.")}</Text>
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
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>
              {ok ? t("betting.successTitle", "Betting wallet funded!") : isPending ? t("bills.result.inProgress", "Payment in progress") : t("bills.result.failed", "Payment not completed")}
            </Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {ok || isPending
                ? t("betting.successMessage", "₦{{amount}} to {{provider}} account {{account}}.", { amount: Number(order.cost_amount ?? order.amount).toLocaleString(), provider: order.biller_name, account: order.recipient })
                : t("bills.noChargeRetry", "If you were charged, it will be reversed. Please try again.")}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Button title={t("betting.fundAgain", "Fund again")} variant="secondary" onPress={() => { setOrder(null); setAmount(""); }} style={{ flex: 1 }} />
            <Button title={t("bills.result.done", "Done")} onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
            <Ticket size={22} strokeWidth={1.75} color={colors.brand.red} />
          </View>
          <View><Text variant="heading">{t("betting.title", "Fund Betting Wallet")}</Text><Text variant="caption" color="muted">{t("betting.subtitle", "Top up your betting account instantly.")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          {/* Provider */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("betting.provider", "Betting provider")}</Text>
          {billers.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 16 }} />
          ) : (
            <Pressable onPress={() => setProviderOpen(true)} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 16 }}>
              <Text variant="body" color={selected ? "ink" : "muted"}>{selected?.name ?? t("betting.selectProvider", "Select provider…")}</Text>
              <ChevronDown size={18} color={colors.muted} />
            </Pressable>
          )}

          {/* Account ID */}
          <Input
            label={t("betting.accountId", "Betting account ID")}
            value={account}
            onChangeText={(v) => { setAccount(v.trim()); resetCustomer(); setError(null); }}
            autoCapitalize="none"
            placeholder={t("betting.accountPlaceholder", "Your betting user ID")}
          />
          {verify.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 12 }}>
              <ActivityIndicator size="small" color={colors.muted} /><Text variant="caption" color="muted">{t("betting.checking", "Checking account…")}</Text>
            </View>
          ) : customerName ? (
            <View style={{ marginTop: -8, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <BadgeCheck size={15} strokeWidth={2} color={colors.brand.green} />
              <Text variant="label" color="green">{customerName}</Text>
            </View>
          ) : !provider && account.length > 0 ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>{t("betting.chooseProviderFirst", "Choose your provider above to confirm the account.")}</Text>
          ) : null}

          {/* Amount */}
          <Input
            label={t("betting.amountLabel", "Amount (₦)")}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("betting.amountPlaceholder", "Enter amount")}
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
          <Text variant="label" style={{ marginBottom: 8 }}>{t("bills.payWith", "Pay with")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {([{ key: "wallet", label: t("bills.wallet", "Wallet"), Icon: Wallet }, { key: "card", label: t("bills.card", "Card"), Icon: CreditCard }] as const).map((m) => {
              const sel = payWith === m.key;
              return (
                <Pressable key={m.key} onPress={() => setPayWith(m.key)} style={{ flex: 1, height: 48, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <m.Icon size={16} strokeWidth={1.75} color={sel ? colors.brand.green : colors.muted} />
                  <Text variant="label" color={sel ? "green" : "muted"}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Fee breakdown */}
          <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="caption" color="muted">{t("betting.credit", "Betting credit")}</Text><Text variant="caption" color="ink">{naira(amt)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text variant="caption" color="muted">{t("betting.serviceFee", "Service fee")}</Text><Text variant="caption" color="ink">{naira(SERVICE_FEE)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="label" color="ink">{t("betting.youPay", "You pay")}</Text><Text variant="label" color="ink">{naira(total)}</Text>
            </View>
            {payWith === "wallet" && ngnBalance !== undefined ? (
              <Text variant="caption" color="muted" style={{ marginTop: 8 }}>{t("betting.walletBalance", "Wallet balance: {{balance}}", { balance: naira(Number(ngnBalance)) })}</Text>
            ) : null}
          </View>

          <View style={{ marginTop: 18 }}>
            <Button title={total ? t("betting.payAmount", "Pay {{amount}}", { amount: naira(total) }) : t("betting.fundWallet", "Fund wallet")} onPress={submit} loading={pending} />
          </View>
          <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>
            {payWith === "card" ? t("betting.payNoteCard", "You'll pay securely on Paystack. Includes a ₦50 service fee.") : t("betting.payNote", "Paid instantly from your OAM wallet. Includes a ₦50 service fee.")}
          </Text>
        </View>
      </ScrollView>

      {/* Provider picker */}
      <Modal visible={providerOpen} transparent animationType="slide" onRequestClose={() => setProviderOpen(false)}>
        <Pressable onPress={() => setProviderOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 28, maxHeight: "70%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>{t("betting.chooseProvider", "Choose a betting provider.")}</Text>
            <ScrollView>
              {billers.data?.map((b) => {
                const sel = b.code === provider;
                return (
                  <Pressable key={b.id} onPress={() => { setProvider(b.code); resetCustomer(); setProviderOpen(false); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
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
        title={t("bills.confirmTitle", "Confirm payment")}
        lines={[
          { label: t("bills.service", "Service"), value: `${t("betting.label", "Betting")}${selected ? ` · ${selected.name}` : ""}` },
          { label: t("betting.accountId", "Betting account ID"), value: account.trim() },
          { label: t("bills.result.customer", "Customer"), value: customerName ?? "—" },
          { label: t("betting.credit", "Betting credit"), value: naira(amt) },
          { label: t("betting.serviceFee", "Service fee"), value: naira(SERVICE_FEE) },
          { label: t("betting.youPay", "You pay"), value: naira(total) },
          { label: t("bills.payWith", "Pay with"), value: payWith === "card" ? t("bills.card", "Card") : t("bills.wallet", "Wallet") },
        ]}
        confirmLabel={t("betting.payAmount", "Pay {{amount}}", { amount: naira(total) })}
        pending={pending}
        onConfirm={runFund}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
