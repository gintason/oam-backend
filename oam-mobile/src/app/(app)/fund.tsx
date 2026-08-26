import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, ShieldCheck, CheckCircle2, Loader2, XCircle } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { env } from "@/shared/config/env";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useAuthStore } from "@/features/auth";
import { PaystackModal } from "@/features/bills";
import { paymentsApi, type FundVerify } from "@/features/wallet/api/payments-api";
import { useTranslation } from "react-i18next";

const QUICK = [1000, 2000, 5000, 10000, 20000];

export default function Fund() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<FundVerify | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [fundRef, setFundRef] = useState<string | null>(null);

  const init = useMutation({
    mutationFn: () =>
      paymentsApi.fundInit({ amount: Number(amount), callback_url: `${env.apiUrl}/billing/purchase/card/return/` }),
    onSuccess: (data) => { setFundRef(data.reference); setCardUrl(data.authorization_url); },
    onError: (err) => setError(apiErrorMessage(err, t("fund.errStart"))),
  });

  async function verifyFunding(reference: string) {
    setVerifying(true);
    try {
      let txn = await paymentsApi.verifyFunding(reference);
      for (let i = 0; i < 4 && ["pending", "processing"].includes(String(txn.status).toLowerCase()); i++) {
        await new Promise((r) => setTimeout(r, 2000));
        txn = await paymentsApi.verifyFunding(reference);
      }
      setResult(txn);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      setError(apiErrorMessage(err, t("bills.errVerifyPayment")));
    } finally {
      setVerifying(false);
    }
  }

  function onCardDone() {
    setCardUrl(null);
    if (fundRef) verifyFunding(fundRef);
  }

  function submit() {
    setError(null);
    const n = Number(amount);
    if (!n || n < 100) return setError(t("fund.minAmount"));
    init.mutate();
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("fund.verifyTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("fund.verifyBody")}</Text>
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
          <Text variant="heading">{t("fund.confirmingTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("fund.confirmingBody")}</Text>
        </View>
      </Screen>
    );
  }

  if (result) {
    const ok = result.status === "success";
    const isPending = ["pending", "processing"].includes(String(result.status).toLowerCase());
    return (
      <Screen edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 28, alignItems: "center" }}>
            {ok ? <CheckCircle2 size={48} strokeWidth={1.5} color={colors.brand.green} /> : isPending ? <Loader2 size={44} strokeWidth={1.5} color={colors.warn} /> : <XCircle size={48} strokeWidth={1.5} color={colors.danger} />}
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>{ok ? t("fund.okTitle") : isPending ? t("fund.pendingTitle") : t("fund.failedTitle")}</Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {ok ? t("fund.okBody", { amount: naira(result.amount) }) : isPending ? t("fund.pendingBody") : t("fund.failedBody")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 22, width: "100%" }}>
              <Button title={t("fund.addMore")} variant="secondary" onPress={() => { setResult(null); setAmount(""); }} style={{ flex: 1 }} />
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
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("fund.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <CreditCard size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("fund.title")}</Text><Text variant="caption" color="muted">{t("fund.subtitle")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          <Input label={t("fund.amountLabel")} value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="0" autoFocus />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -6, marginBottom: 18 }}>
            {QUICK.map((a) => {
              const sel = Number(amount) === a;
              return (
                <Pressable key={a} onPress={() => setAmount(String(a))} style={{ height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="label" color={sel ? "paper" : "ink"}>{naira(a)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title={amount ? t("fund.continueAmount", { amount: naira(Number(amount)) }) : t("fund.continue")} onPress={submit} loading={init.isPending} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
            <ShieldCheck size={14} strokeWidth={1.75} color={colors.brand.green} />
            <Text variant="caption" color="muted">{t("fund.secured")}</Text>
          </View>
        </View>
      </ScrollView>

      <PaystackModal visible={!!cardUrl} url={cardUrl ?? ""} onComplete={onCardDone} onCancel={() => setCardUrl(null)} />
    </Screen>
  );
}
