import { useState, useEffect, useMemo } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Building2, BadgeCheck, CheckCircle2, Plus, X, Search } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { naira, money } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { payoutsApi, type BankAccount } from "@/features/wallet/api/payouts-api";
import { useTranslation } from "react-i18next";

export default function Transfer() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const wallets = useWallets();
  const ngn = pickHeadline(wallets.data?.wallets);
  const balance = Number(ngn?.balance ?? 0);

  const accountsQuery = useQuery({ queryKey: ["payouts", "accounts"], queryFn: payoutsApi.getBankAccounts, enabled: isVerified });
  const accounts = accountsQuery.data ?? [];

  const withdraw = useMutation({
    mutationFn: () => payoutsApi.withdraw({ bank_account_id: accountId, amount: Number(amount) }),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (w.status === "failed") {
        setDone(null);
        const reason = (w.failure_reason as string) || "";
        setError(reason ? t("withdraw.errFailedReason", { reason }) : t("withdraw.errFailed"));
        return;
      }
      setError(null);
      const pending = w.status === "pending" || w.status === "processing";
      setDone(pending
        ? t("xferbank.onWay", "₦{{amount}} is on its way to {{name}}.", { amount: Number(amount).toLocaleString(), name: w.account_name || t("withdraw.yourBank") })
        : t("xferbank.completed", "₦{{amount}} sent successfully.", { amount: Number(amount).toLocaleString() }));
      setAmount("");
    },
    onError: (err) => { setDone(null); setError(apiErrorMessage(err, t("withdraw.errGeneric"))); },
  });

  function submit() {
    setError(null); setDone(null);
    if (!accountId) return setError(t("withdraw.errChooseAccount"));
    if (!amount || Number(amount) < 100) return setError(t("xferbank.errMin", "Minimum transfer is ₦100."));
    if (total > balance) return setError(t("withdraw.errExceeds"));
    withdraw.mutate();
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("fund.verifyTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("withdraw.verifyBody")}</Text>
          <Button title={t("bills.goBack")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  const amt = Number(amount) || 0;
  const fee = amt >= 500 ? 25 : 10;
  const total = amt > 0 ? amt + fee : 0;
  const overBalance = Boolean(amount) && total > balance;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("withdraw.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Send size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View>
            <Text variant="heading">{t("xferbank.title", "Send to Bank")}</Text>
            <Text variant="caption" color="muted">{t("withdraw.available")} {money(ngn?.balance ?? "0", "NGN")}</Text>
          </View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}
          {done ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12, flexDirection: "row", gap: 8 }}><CheckCircle2 size={16} color={colors.brand.green} style={{ marginTop: 1 }} /><Text variant="caption" color="green" style={{ flex: 1 }}>{done}</Text></View> : null}

          {/* Header row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text variant="label">{t("withdraw.bankAccount")}</Text>
            <Pressable onPress={() => setAdding((v) => !v)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {adding ? <X size={13} color={colors.brand.green} /> : <Plus size={13} color={colors.brand.green} />}
              <Text variant="caption" color="green">{adding ? t("withdraw.cancel") : t("withdraw.addAccount")}</Text>
            </Pressable>
          </View>

          {adding ? (
            <AddAccount onDone={() => { setAdding(false); accountsQuery.refetch(); }} onError={setError} />
          ) : accountsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 16 }} />
          ) : accounts.length === 0 ? (
            <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, padding: 18, alignItems: "center", gap: 8 }}>
              <Building2 size={22} strokeWidth={1.5} color={colors.muted} />
              <Text variant="caption" color="muted">{t("withdraw.noAccounts")}</Text>
              <Button title={t("withdraw.addYourBank")} onPress={() => setAdding(true)} style={{ marginTop: 4 }} />
            </View>
          ) : (
            <View style={{ gap: 8, marginBottom: 16 }}>
              {accounts.map((a) => {
                const sel = accountId === a.id;
                return (
                  <Pressable key={a.id} onPress={() => setAccountId(a.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.06)" : colors.paper, paddingHorizontal: 12, paddingVertical: 12 }}>
                    <View style={{ height: 36, width: 36, borderRadius: 18, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
                      <Building2 size={16} strokeWidth={1.75} color={colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" color="ink" numberOfLines={1}>{a.account_name}</Text>
                      <Text variant="caption" color="muted" numberOfLines={1}>{a.bank_name} · {a.account_number}</Text>
                    </View>
                    {sel ? <BadgeCheck size={16} color={colors.brand.green} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {!adding ? (
            <>
              <Input label={t("withdraw.amountLabel")} value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="0" />
              {overBalance ? <Text variant="caption" color="danger" style={{ marginTop: -8, marginBottom: 12 }}>{t("withdraw.exceedsInline")}</Text> : null}
              {amt > 0 ? (
                <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="caption" color="muted">{t("withdraw.transferAmount", "Transfer amount")}</Text><Text variant="caption" color="ink">{naira(amt)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <Text variant="caption" color="muted">{t("withdraw.transferFee", "Transfer fee")}</Text><Text variant="caption" color="ink">{naira(fee)}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 8 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="label" color="ink">{t("withdraw.totalDebited", "Total debited")}</Text><Text variant="label" color="ink">{naira(total)}</Text>
                  </View>
                </View>
              ) : null}
              <View style={{ marginTop: 4 }}>
                <Button title={amount ? t("xferbank.sendAmount", "Send ₦{{amount}}", { amount: Number(amount).toLocaleString() }) : t("xferbank.sendBtn", "Send to bank")} onPress={submit} loading={withdraw.isPending} />
              </View>
              <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>{t("xferbank.note", "Sent to any bank account. Includes a small transfer fee.")}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Searchable bank picker + automatic account-name verification. */
function AddAccount({ onDone, onError }: { onDone: () => void; onError: (m: string | null) => void }) {
  const { t } = useTranslation();
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | undefined>();

  const banksQuery = useQuery({ queryKey: ["payouts", "banks"], queryFn: () => payoutsApi.getBanks("NGN") });

  const banks = useMemo(() => {
    const all = [...(banksQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const q = bankSearch.trim().toLowerCase();
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  }, [banksQuery.data, bankSearch]);

  const resolve = useMutation({
    mutationFn: () => payoutsApi.resolveAccount({ bank_code: bankCode, account_number: accountNumber.trim() }),
    onSuccess: (d) => {
      const name = (d.account_name as string) || (d.name as string) || "";
      if (name) { setResolvedName(name); onError(null); }
      else { setResolvedName(undefined); onError(d.detail || t("withdraw.errResolve")); }
    },
    onError: (err) => { setResolvedName(undefined); onError(apiErrorMessage(err, t("withdraw.errResolve"))); },
  });

  const save = useMutation({
    mutationFn: () => payoutsApi.addBankAccount({ bank_code: bankCode, account_number: accountNumber.trim() }),
    onSuccess: () => onDone(),
    onError: (err) => onError(apiErrorMessage(err, t("withdraw.errSave"))),
  });

  const debouncedAccount = useDebounced(accountNumber, 600);
  useEffect(() => {
    if (bankCode && debouncedAccount.length === 10 && !resolvedName && !resolve.isPending) {
      resolve.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, debouncedAccount]);

  return (
    <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: "rgba(248,250,252,0.6)", padding: 14 }}>
      <Text variant="label" style={{ marginBottom: 8 }}>{t("withdraw.bankLabel")}</Text>
      <Pressable onPress={() => { setBankOpen(true); setBankSearch(""); }} style={{ height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginBottom: 12 }}>
        <Search size={15} color={colors.muted} />
        <Text variant="body" color={bankName ? "ink" : "muted"} style={{ flex: 1 }} numberOfLines={1}>{bankName || (banksQuery.isLoading ? t("withdraw.loadingBanks") : t("withdraw.searchBank"))}</Text>
        {bankName ? <BadgeCheck size={15} color={colors.brand.green} /> : null}
      </Pressable>

      <Input label={t("withdraw.accountNumberLabel")} value={accountNumber} onChangeText={(v) => { setAccountNumber(v.replace(/[^\d]/g, "").slice(0, 10)); setResolvedName(undefined); }} keyboardType="number-pad" maxLength={10} placeholder={t("withdraw.accountNumberPlaceholder")} />

      {resolve.isPending ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 10 }}>
          <ActivityIndicator size="small" color={colors.muted} /><Text variant="caption" color="muted">{t("withdraw.checkingAccount")}</Text>
        </View>
      ) : resolvedName ? (
        <View style={{ marginTop: -8, marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <BadgeCheck size={15} strokeWidth={2} color={colors.brand.green} /><Text variant="label" color="green">{resolvedName}</Text>
        </View>
      ) : null}

      <Button title={save.isPending ? t("withdraw.saving") : t("withdraw.saveAccount")} onPress={() => save.mutate()} loading={save.isPending} disabled={!resolvedName} />

      <Modal visible={bankOpen} transparent animationType="slide" onRequestClose={() => setBankOpen(false)}>
        <Pressable onPress={() => setBankOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "75%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>{t("withdraw.chooseBank")}</Text>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={bankSearch} onChangeText={setBankSearch} autoFocus placeholder={t("withdraw.searchBank")} placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {banksQuery.isLoading ? (
                <Text variant="caption" color="muted" style={{ paddingHorizontal: 20, paddingVertical: 12 }}>{t("withdraw.loadingBanks")}</Text>
              ) : banks.length === 0 ? (
                <Text variant="caption" color="muted" style={{ paddingHorizontal: 20, paddingVertical: 12 }}>{t("withdraw.noBankMatch", { query: bankSearch })}</Text>
              ) : (
                banks.map((b) => (
                  <Pressable key={String(b.code)} onPress={() => { setBankCode(String(b.code)); setBankName(String(b.name)); setBankOpen(false); setResolvedName(undefined); }} style={{ paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                    <Text variant="body" color="ink">{String(b.name)}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
