import { useState, useEffect, useMemo } from "react";
import { View, Pressable, ActivityIndicator, Modal, ScrollView, TextInput } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ChevronDown, Search, Loader2 } from "lucide-react-native";
import { Text, Input, Button } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { apiErrorMessage } from "@/shared/api";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { PaystackModal } from "@/features/bills";
import { reloadlyApi, type Operator, type AirtimeTopup } from "./api";

/** International airtime flow (Reloadly). Rendered inside the airtime screen's "International" tab. */
export function IntlAirtime() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;
  const balance = Number(pickHeadline(useWallets().data?.wallets)?.balance ?? 0);

  const [country, setCountry] = useState("");
  const [countryName, setCountryName] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [topup, setTopup] = useState<AirtimeTopup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [payRef, setPayRef] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const countries = useQuery({ queryKey: ["intl", "countries"], queryFn: reloadlyApi.countries, enabled: isVerified, staleTime: 3600_000 });
  const debouncedPhone = useDebounced(phone, 600);
  const operators = useQuery({
    queryKey: ["intl", "operators", country, debouncedPhone],
    queryFn: () => reloadlyApi.operators(country, debouncedPhone.length >= 6 ? debouncedPhone : undefined),
    enabled: isVerified && !!country,
  });

  useEffect(() => {
    const ops = operators.data ?? [];
    if (ops.length === 1) setOperator(ops[0]);
  }, [operators.data]);

  const useLocal = operator?.denomination_type === "RANGE" || (operator?.local_fixed_amounts?.length ?? 0) > 0;
  const amounts = useMemo(() => (!operator ? [] : useLocal ? operator.local_fixed_amounts : operator.fixed_amounts), [operator, useLocal]);

  const quote = useQuery({
    queryKey: ["intl", "quote", operator?.operator_id, amount, useLocal],
    queryFn: () => reloadlyApi.quote({ operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal }),
    enabled: !!operator && Number(amount) > 0,
  });

  const buy = useMutation({
    mutationFn: () =>
      reloadlyApi.buy({
        operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal,
        recipient_number: phone.trim(), recipient_iso2: country, pay_with: payWith,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      if (payWith === "card" && data.authorization_url && data.reference) {
        setPayRef(data.reference); setCardUrl(data.authorization_url); return;
      }
      finish(data.topup);
    },
    onError: (err) => {
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? "Your wallet balance is too low. Add money or pay by card." : apiErrorMessage(err, "Top-up failed. Try again."));
    },
  });

  async function onCardReturn() {
    setCardUrl(null);
    if (!payRef) return;
    setVerifying(true);
    try {
      let t = await reloadlyApi.cardVerify(payRef);
      for (let i = 0; i < 5 && t.status !== "success" && t.status !== "failed"; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        t = await reloadlyApi.topup(t.reference);
      }
      finish(t);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't confirm the top-up."));
    } finally {
      setVerifying(false);
    }
  }

  function finish(t: AirtimeTopup) {
    qc.invalidateQueries({ queryKey: ["wallets"] });
    setTopup(t);
  }

  function submit() {
    setError(null);
    if (!country) return setError("Choose the recipient's country.");
    if (phone.trim().length < 6) return setError("Enter the recipient's phone number.");
    if (!operator) return setError("Choose a network operator.");
    if (Number(amount) <= 0) return setError("Choose an amount.");
    buy.mutate();
  }

  const filteredCountries = useMemo(() => {
    const all = countries.data ?? [];
    const q = countrySearch.trim().toLowerCase();
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  }, [countries.data, countrySearch]);

  const symbol = useLocal ? "" : "$";
  const priceNgn = quote.data ? naira(Number(quote.data.total_ngn)) : "";

  if (verifying) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 12 }}>
        <Loader2 size={38} color={colors.brand.green} />
        <Text variant="body" color="muted">Confirming your top-up…</Text>
      </View>
    );
  }

  if (topup) {
    const ok = topup.status === "success";
    return (
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 22, alignItems: "center" }}>
        {ok ? <CheckCircle2 size={46} color={colors.brand.green} /> : <XCircle size={46} color={colors.danger} />}
        <Text variant="heading" style={{ marginTop: 10 }}>{ok ? "Airtime sent!" : "Top-up failed"}</Text>
        <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
          {ok ? `${topup.operator_name} · ${topup.recipient_number}` : (topup.failure_reason || "If you were charged, it has been refunded.")}
        </Text>
        <Button title="Done" onPress={() => { setTopup(null); setAmount(""); }} style={{ marginTop: 16, alignSelf: "stretch" }} />
      </View>
    );
  }

  return (
    <View>
      {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

      {/* Country */}
      <Text variant="label" style={{ marginBottom: 8 }}>Recipient's country</Text>
      <Pressable onPress={() => { setCountryOpen(true); setCountrySearch(""); }} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 14 }}>
        <Text variant="body" color={countryName ? "ink" : "muted"}>{countryName || "Select country"}</Text>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>

      {/* Recipient phone */}
      <Input label="Recipient phone (with local format)" value={phone} onChangeText={(v) => { setPhone(v.replace(/[^\d+]/g, "")); setOperator(null); }} keyboardType="phone-pad" placeholder="e.g. 233501234567" autoCapitalize="none" />

      {/* Operator */}
      {country ? (
        operators.isLoading ? <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start", marginBottom: 14 }} /> : (
          <>
            <Text variant="label" style={{ marginBottom: 8 }}>Network</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {(operators.data ?? []).map((op) => {
                const sel = operator?.operator_id === op.operator_id;
                return (
                  <Pressable key={op.operator_id} onPress={() => { setOperator(op); setAmount(""); }} style={{ paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.08)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="caption" color={sel ? "green" : "ink"}>{op.name}</Text>
                  </Pressable>
                );
              })}
              {(operators.data ?? []).length === 0 ? <Text variant="caption" color="muted">No networks found — check the country and number.</Text> : null}
            </View>
          </>
        )
      ) : null}

      {/* Amount */}
      {operator ? (
        <>
          <Text variant="label" style={{ marginBottom: 8 }}>Amount {useLocal ? `(${operator.destination_currency})` : "(USD)"}</Text>
          {amounts.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {amounts.slice(0, 12).map((a) => {
                const sel = Number(amount) === a;
                return (
                  <Pressable key={a} onPress={() => setAmount(String(a))} style={{ paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="label" color={sel ? "paper" : "ink"}>{symbol}{a}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Input label="" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder={`${symbol}0`} />
          )}

          {/* Price */}
          {Number(amount) > 0 ? (
            <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 14 }}>
              {quote.isLoading ? <ActivityIndicator color={colors.brand.green} /> : (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="label" color="ink">You pay</Text>
                  <Text variant="title" color="green">{priceNgn}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Pay with */}
          <Text variant="label" style={{ marginBottom: 8 }}>Pay with</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {(["wallet", "card"] as const).map((m) => {
              const sel = payWith === m;
              return (
                <Pressable key={m} onPress={() => setPayWith(m)} style={{ flex: 1, height: 48, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="label" color={sel ? "green" : "muted"}>{m === "wallet" ? "Wallet" : "Card"}</Text>
                </Pressable>
              );
            })}
          </View>
          {payWith === "wallet" ? <Text variant="caption" color="muted" style={{ marginBottom: 12 }}>Wallet balance: {naira(balance)}</Text> : null}

          <Button title={quote.data ? `Send ${priceNgn}` : "Send airtime"} onPress={submit} loading={buy.isPending} />
        </>
      ) : null}

      {/* Country picker */}
      <Modal visible={countryOpen} transparent animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <Pressable onPress={() => setCountryOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "78%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>Choose a country</Text>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={countrySearch} onChangeText={setCountrySearch} autoFocus placeholder="Search countries" placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredCountries.map((c) => (
                <Pressable key={c.isoName} onPress={() => { setCountry(c.isoName); setCountryName(c.name); setOperator(null); setCountryOpen(false); }} style={{ paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                  <Text variant="body" color="ink">{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PaystackModal visible={!!cardUrl} url={cardUrl ?? ""} onComplete={onCardReturn} onCancel={() => setCardUrl(null)} />
    </View>
  );
}
