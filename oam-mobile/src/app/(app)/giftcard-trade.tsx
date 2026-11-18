import { useMemo, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Gift, ImagePlus } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { Chip } from "@/features/bills/ui/Chip";
import { tradeApi, useTradeAvailability, CURRENCY_BY_COUNTRY, type GcProduct, type SellCard, type TradeOrder, type UploadFile } from "@/features/trade/api";
import { TradeHistory, TradeResult } from "@/features/trade/TradeResult";

const box = { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, marginBottom: 14 } as const;

/** Gift cards — buy (codes delivered), sell (wallet credited on approval), my trades. */
export default function GiftCardTradeScreen() {
  const router = useRouter();
  const avail = useTradeAvailability();
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");
  const [result, setResult] = useState<TradeOrder | null>(null);
  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">Back</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}><Gift size={22} color={colors.brand.green} /></View>
          <View style={{ flex: 1 }}><Text variant="heading">Gift cards</Text><Text variant="caption" color="muted">Buy gift cards or sell yours for naira.</Text></View>
        </View>
        {!avail.giftcards ? <Text variant="body" color="muted">Gift cards are coming soon.</Text>
          : result ? <TradeResult order={result} onClose={() => { setResult(null); setTab("history"); }} />
          : (
            <>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["buy", "sell", "history"] as const).map((t) => <Chip key={t} flex label={t === "buy" ? "Buy" : t === "sell" ? "Sell" : "My trades"} active={tab === t} onPress={() => setTab(t)} />)}
              </View>
              {tab === "buy" ? <BuyTab onDone={setResult} /> : tab === "sell" ? <SellTab onDone={setResult} /> : <TradeHistory onOpen={setResult} />}
            </>
          )}
      </ScrollView>
    </Screen>
  );
}

function BuyTab({ onDone }: { onDone: (o: TradeOrder) => void }) {
  const [country, setCountry] = useState("US");
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<GcProduct | null>(null);
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const products = useQuery({ queryKey: ["gc-products", country], queryFn: () => tradeApi.products(country), enabled: country.length === 2 });
  const list = useMemo(() => (products.data ?? []).filter((p) => p.product_name.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [products.data, q]);
  const amt = useDebounced(Number(amount) || 0, 500);
  const quote = useQuery({ queryKey: ["gc-quote", product?.product_id, amt, qty], queryFn: () => tradeApi.quote(product!.product_id, amt, qty),
                           enabled: Boolean(product && amt > 0), retry: false, staleTime: 90_000 });
  async function pay() {
    if (!product || !amt) return setError("Choose a card and a value.");
    setBusy(true); setError(null);
    try { onDone(await tradeApi.buy({ product_id: product.product_id, amount: amt, quantity: qty, title: `${product.product_name} ${product.currency_code} ${amt}${qty > 1 ? ` x${qty}` : ""}` })); }
    catch (err) { setError(apiErrorMessage(err, "Purchase failed. Try again.")); } finally { setBusy(false); }
  }
  return (
    <View>
      {error ? <Text variant="caption" color="danger" style={{ marginBottom: 10 }}>{error}</Text> : null}
      <Text variant="label" style={{ marginBottom: 8 }}>Country</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {["US", "GB", "CA", "AU", "EU", "NG"].map((c) => <Chip key={c} label={c} active={country === c} onPress={() => { setCountry(c); setProduct(null); }} />)}
      </View>
      {!product ? (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Search Amazon, Apple, Steam…" placeholderTextColor={colors.muted} style={box} />
          {products.isLoading ? <ActivityIndicator color={colors.brand.green} /> : (
            <View style={{ gap: 8 }}>
              {list.map((p) => (
                <Pressable key={p.product_id} onPress={() => { setProduct(p); setAmount(""); }} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>{p.product_name}</Text><Text variant="caption" color="muted">{p.currency_code}</Text>
                </Pressable>
              ))}
              {!list.length ? <Text variant="caption" color="muted">No gift cards found.</Text> : null}
            </View>
          )}
        </>
      ) : (
        <>
          <Pressable onPress={() => setProduct(null)} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.brand.green, marginBottom: 14 }}>
            <Text variant="label">{product.product_name}</Text><Text variant="caption" color="green">Change</Text>
          </Pressable>
          <Text variant="label" style={{ marginBottom: 8 }}>Card value ({product.currency_code})</Text>
          {product.denomination_type === "FIXED" && product.fixed_recipient_denominations?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {product.fixed_recipient_denominations.map((d) => <Chip key={d} label={String(d)} active={amount === String(d)} onPress={() => setAmount(String(d))} />)}
            </View>
          ) : (
            <TextInput keyboardType="decimal-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
                       placeholder={`${product.min_recipient_denomination ?? ""} – ${product.max_recipient_denomination ?? ""}`} placeholderTextColor={colors.muted} style={box} />
          )}
          <Text variant="label" style={{ marginBottom: 8 }}>How many?</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {[1, 2, 3, 5, 10].map((n) => <Chip key={n} label={String(n)} active={qty === n} onPress={() => setQty(n)} />)}
          </View>
          <Text variant="body" style={{ marginBottom: 14 }}>
            {quote.isFetching ? "Getting price…" : quote.data ? `You pay ${naira(quote.data.price)} from your wallet` : quote.error ? apiErrorMessage(quote.error, "Couldn't price this card.") : "Enter a value to see the price."}
          </Text>
          <Button title={quote.data ? `Pay ${naira(quote.data.price)}` : "Buy gift card"} onPress={pay} loading={busy} disabled={!quote.data} />
        </>
      )}
    </View>
  );
}

function SellTab({ onDone }: { onDone: (o: TradeOrder) => void }) {
  const catalog = useQuery({ queryKey: ["gc-sell-catalog"], queryFn: tradeApi.sellCatalog });
  const [q, setQ] = useState("");
  const [card, setCard] = useState<SellCard | null>(null);
  const [country, setCountry] = useState("");
  const [type, setType] = useState<"ecode" | "physical">("ecode");
  const [subType, setSubType] = useState("");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [images, setImages] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currency = CURRENCY_BY_COUNTRY[country] ?? "USD";
  const cards = (catalog.data ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
    if (!res.canceled) setImages(res.assets.slice(0, 5).map((a, i) => ({ uri: a.uri, name: a.fileName ?? `card-${i + 1}.jpg`, type: a.mimeType ?? "image/jpeg" })));
  }
  async function submit() {
    if (!card || !country || !amount) return setError("Choose the card, country and value.");
    if (type === "ecode" && !code.trim()) return setError("Enter the card code.");
    if (type === "physical" && !images.length) return setError("Add at least one clear photo of the card.");
    const f = new FormData();
    Object.entries({ slug: card.slug, card_country: country, card_type: type, sub_type: subType, card_currency: currency, card_amount: amount,
                     additional_info: type === "ecode" ? code.trim() : "", title: `${card.name} ${currency} ${amount}` })
      .forEach(([k, v]) => { if (v) f.append(k, v); });
    images.forEach((img) => f.append("images", img as unknown as Blob));
    setBusy(true); setError(null);
    try { onDone(await tradeApi.sell(f)); } catch (err) { setError(apiErrorMessage(err, "Couldn't submit your card.")); } finally { setBusy(false); }
  }
  return (
    <View>
      {error ? <Text variant="caption" color="danger" style={{ marginBottom: 10 }}>{error}</Text> : null}
      {!card ? (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Which gift card are you selling?" placeholderTextColor={colors.muted} style={box} />
          {catalog.isLoading ? <ActivityIndicator color={colors.brand.green} /> : (
            <View style={{ gap: 8 }}>
              {cards.map((c) => (
                <Pressable key={c.slug} onPress={() => { setCard(c); setCountry(c.countries?.[0] ?? ""); setSubType(""); }} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline }}>
                  <Text variant="label">{c.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <Pressable onPress={() => setCard(null)} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.brand.green, marginBottom: 14 }}>
            <Text variant="label">{card.name}</Text><Text variant="caption" color="green">Change</Text>
          </Pressable>
          <Text variant="label" style={{ marginBottom: 8 }}>Country of the card</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {card.countries.map((c) => <Chip key={c} label={c} active={country === c} onPress={() => setCountry(c)} />)}
          </View>
          <Text variant="label" style={{ marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {(card.card_types?.length ? card.card_types : ["ecode", "physical"]).map((t) => <Chip key={t} flex label={t === "ecode" ? "E-code" : "Physical card"} active={type === t} onPress={() => setType(t as "ecode" | "physical")} />)}
          </View>
          {type === "physical" && card.sub_types?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {card.sub_types.map((s) => <Chip key={s} label={s.replace(/_/g, " ")} active={subType === s} onPress={() => setSubType(s)} />)}
            </View>
          ) : null}
          <Input label={`Card value (${currency})`} keyboardType="decimal-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} placeholder={`${card.min_amount} – ${card.max_amount}`} />
          <View style={{ height: 12 }} />
          {type === "ecode" ? (
            <Input label="Card code" value={code} onChangeText={setCode} placeholder="Paste the redemption code" />
          ) : (
            <Pressable onPress={pick} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline }}>
              <ImagePlus size={18} color={colors.muted} /><Text variant="caption" color="muted">{images.length ? `${images.length} photo(s) selected` : "Add 1–5 clear photos of the card"}</Text>
            </Pressable>
          )}
          <Text variant="caption" color="muted" style={{ marginVertical: 12 }}>Our partner reviews every card. Once approved, the naira value is added to your O.A.M wallet. Never share a card code with anyone else.</Text>
          <Button title="Submit card" onPress={submit} loading={busy} />
        </>
      )}
    </View>
  );
}
