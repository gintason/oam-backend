/**
 * Bank + account number with a live account-name check (the same Paystack
 * lookup the Withdraw screen uses). `onChange` reports the bank code, the
 * number and the verified name ("" until the bank confirms it).
 */
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronDown, Search, X } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { payoutsApi } from "@/features/wallet/api/payouts-api";
import { Field, TextBox } from "@/features/jobs/ui/kit";

export type BankValue = { bank_code: string; bank_name: string; account_number: string; account_name: string };

export function BankFields({ value, onChange }: { value: BankValue; onChange: (v: BankValue) => void }) {
  const banks = useQuery({ queryKey: ["payouts", "banks"], queryFn: () => payoutsApi.getBanks("NGN"), staleTime: 3600_000 });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = useMemo(() => (banks.data ?? []).filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase())), [banks.data, q]);

  useEffect(() => {
    const { bank_code, account_number } = value;
    if (!bank_code || !/^\d{10}$/.test(account_number) || value.account_name) return;
    let alive = true;
    setChecking(true); setErr(null);
    payoutsApi.resolveAccount({ bank_code, account_number })
      .then((r) => {
        if (!alive) return;
        const name = String(r.account_name ?? r.name ?? "");
        if (name) onChange({ ...value, account_name: name });
        else setErr("We couldn't find this account. Check the number and bank.");
      })
      .catch(() => alive && setErr("We couldn't find this account. Check the number and bank."))
      .finally(() => alive && setChecking(false));
    return () => { alive = false; };
  }, [value.bank_code, value.account_number]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: 12 }}>
      <Field label="Bank">
        <Pressable onPress={() => setOpen(true)} accessibilityLabel="Choose bank"
          style={{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist,
                   paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="body" color={value.bank_name ? "ink" : "muted"}>{value.bank_name || "Choose your bank"}</Text>
          <ChevronDown size={18} color={colors.muted} />
        </Pressable>
      </Field>
      <Field label="Account number">
        <TextBox value={value.account_number} keyboardType="number-pad" maxLength={10} placeholder="10 digits"
          onChangeText={(t) => onChange({ ...value, account_number: t.replace(/\D/g, "").slice(0, 10), account_name: "" })} />
      </Field>
      {checking ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><ActivityIndicator size="small" color={colors.brand.green} /><Text variant="caption" color="muted">Checking with your bank…</Text></View> : null}
      {value.account_name ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.08)" }}>
          <BadgeCheck size={18} color={colors.brand.green} />
          <Text variant="label" color="green" style={{ fontFamily: fonts.bold }}>{value.account_name}</Text>
        </View>
      ) : err ? <Text variant="caption" color="danger">{err}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen edges={["top"]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <Search size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search banks" placeholderTextColor={colors.muted} autoFocus
              style={{ flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 16, color: colors.ink }} />
            <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close"><X size={22} color={colors.ink} /></Pressable>
          </View>
          {banks.isLoading ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand.green} /> : (
            <FlatList data={list} keyExtractor={(b) => `${b.code}-${b.name}`} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => { onChange({ ...value, bank_code: item.code, bank_name: item.name, account_name: "" }); setOpen(false); setQ(""); }}
                  style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                  <Text variant="body">{item.name}</Text>
                </Pressable>
              )} />
          )}
        </Screen>
      </Modal>
    </View>
  );
}
