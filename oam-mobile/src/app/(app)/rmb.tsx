import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, ImagePlus, JapaneseYen } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { Chip } from "@/features/bills/ui/Chip";
import { tradeApi, useTradeAvailability, type TradeOrder, type UploadFile } from "@/features/trade/api";
import { TradeHistory, TradeResult } from "@/features/trade/TradeResult";

/** Pay suppliers in China — RMB to Alipay, WeChat Pay or a Chinese bank account. */
export default function RmbScreen() {
  const router = useRouter();
  const avail = useTradeAvailability();
  const rates = useQuery({ queryKey: ["rmb-rates"], queryFn: tradeApi.rmbRates, enabled: avail.rmb });
  const [channel, setChannel] = useState<"alipay" | "wechat" | "bank">("alipay");
  const [acct, setAcct] = useState("nigerian");
  const [rmb, setRmb] = useState("");
  const [name, setName] = useState("");
  const [ident, setIdent] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAcct, setBankAcct] = useState("");
  const [note, setNote] = useState("");
  const [qr, setQr] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TradeOrder | null>(null);
  const [history, setHistory] = useState(false);
  const amount = useDebounced(Number(rmb) || 0, 500);
  const quote = useQuery({ queryKey: ["rmb-quote", channel, acct, amount], queryFn: () => tradeApi.rmbQuote(channel, channel === "bank" ? undefined : acct, amount),
                           enabled: avail.rmb && amount > 0, retry: false });

  async function pickQr() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets[0]) { const a = res.assets[0]; setQr({ uri: a.uri, name: a.fileName ?? "qr.jpg", type: a.mimeType ?? "image/jpeg" }); }
  }
  async function submit() {
    setError(null);
    if (!Number(rmb)) return setError("Enter the amount in ¥.");
    if (!name.trim()) return setError("Enter the recipient's full name.");
    if (channel !== "bank" && !qr) return setError("Upload the recipient's receive QR code.");
    if (channel === "bank" && (!bankName.trim() || !bankAcct.trim())) return setError("Enter the bank name and account number.");
    const f = new FormData();
    const fields: Record<string, string> = { channel, rmb_amount: rmb, recipient_name: name.trim(), recipient_identifier: channel === "bank" ? bankAcct.trim() : ident.trim(),
      recipient_bank_name: channel === "bank" ? bankName.trim() : "", recipient_bank_account_number: channel === "bank" ? bankAcct.trim() : "", description: note.trim() };
    if (channel === "alipay") fields.alipay_account_type = acct;
    if (channel === "wechat") fields.wechat_account_type = acct;
    Object.entries(fields).forEach(([k, v]) => { if (v) f.append(k, v); });
    if (qr && channel !== "bank") f.append("qr_code", qr as unknown as Blob);
    setBusy(true);
    try { setResult(await tradeApi.rmbBuy(f)); } catch (err) { setError(apiErrorMessage(err, "Couldn't place the order.")); } finally { setBusy(false); }
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">Back</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}><JapaneseYen size={22} color={colors.brand.green} /></View>
          <View style={{ flex: 1 }}><Text variant="heading">Pay in China</Text><Text variant="caption" color="muted">Send RMB to Alipay, WeChat Pay or a Chinese bank.</Text></View>
        </View>
        {!avail.rmb ? <Text variant="body" color="muted">This service is coming soon.</Text>
          : result ? <TradeResult order={result} onClose={() => { setResult(null); setHistory(true); }} />
          : history ? (<><TradeHistory kind="rmb_buy" onOpen={setResult} /><Button title="New payment" variant="secondary" onPress={() => setHistory(false)} style={{ marginTop: 14 }} /></>)
          : (
            <View>
              {error ? <Text variant="caption" color="danger" style={{ marginBottom: 10 }}>{error}</Text> : null}
              <Text variant="label" style={{ marginBottom: 8 }}>Pay with</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {(["alipay", "wechat", "bank"] as const).map((c) => {
                  const ok = rates.data?.channels.find((x) => x.channel === c)?.is_available ?? true;
                  return <Chip key={c} flex label={c === "alipay" ? "Alipay" : c === "wechat" ? "WeChat" : "Bank"} active={channel === c} disabled={!ok} onPress={() => setChannel(c)} />;
                })}
              </View>
              {channel !== "bank" ? (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {["nigerian", "chinese"].map((t) => <Chip key={t} flex label={t === "nigerian" ? "Nigerian account" : "Chinese account"} active={acct === t} onPress={() => setAcct(t)} />)}
                </View>
              ) : null}
              <Input label="Amount (¥)" keyboardType="decimal-pad" value={rmb} onChangeText={(v) => setRmb(v.replace(/[^\d.]/g, ""))}
                     placeholder={rates.data ? `${rates.data.limits.min_rmb} – ${rates.data.limits.max_rmb}` : "e.g. 500"} />
              <Text variant="caption" color="muted" style={{ marginVertical: 8 }}>
                {quote.isFetching ? "Getting rate…" : quote.data ? `You pay ${naira(quote.data.price)}` : quote.error ? apiErrorMessage(quote.error, "Couldn't get a rate.") : " "}
              </Text>
              <Input label="Recipient's full name" value={name} onChangeText={setName} placeholder="e.g. Zhang Wei" />
              <View style={{ height: 12 }} />
              {channel === "bank" ? (
                <><Input label="Bank name" value={bankName} onChangeText={setBankName} placeholder="e.g. ICBC" /><View style={{ height: 12 }} />
                  <Input label="Account number" value={bankAcct} onChangeText={setBankAcct} /></>
              ) : (
                <><Input label={channel === "alipay" ? "Alipay ID / email / phone (optional)" : "WeChat ID (optional)"} value={ident} onChangeText={setIdent} />
                  <Pressable onPress={pickQr} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 16, marginTop: 12, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline }}>
                    <ImagePlus size={18} color={colors.muted} /><Text variant="caption" color="muted">{qr ? qr.name : "Upload the recipient's receive QR code"}</Text>
                  </Pressable></>
              )}
              <View style={{ height: 12 }} />
              <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Invoice #2045" />
              <Button title={quote.data ? `Pay ${naira(quote.data.price)}` : "Pay"} onPress={submit} loading={busy} disabled={!quote.data} style={{ marginTop: 16 }} />
              <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>Paid from your O.A.M wallet. Refunded automatically if it can't be completed.</Text>
              <Button title="My RMB payments" variant="ghost" onPress={() => setHistory(true)} style={{ marginTop: 6 }} />
            </View>
          )}
      </ScrollView>
    </Screen>
  );
}
