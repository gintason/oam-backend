import { useState, useMemo } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bus, Search, ChevronDown, CheckCircle2, XCircle, Loader2, Ticket } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { apiErrorMessage } from "@/shared/api";
import { useTranslation } from "react-i18next";
import { env } from "@/shared/config/env";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { PaystackModal } from "@/features/bills";
import { busApi, type Trip, type BusBooking, type PassengerInput } from "@/features/bus";
import { DateField } from "@/features/travel";

type Step = "search" | "results" | "seats" | "pay" | "ticket";

export default function BusScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [step, setStep] = useState<Step>("search");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [stateSearch, setStateSearch] = useState("");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [seats, setSeats] = useState<number[]>([]);
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [payRef, setPayRef] = useState<string | null>(null);
  const [booking, setBooking] = useState<BusBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const states = useQuery({ queryKey: ["bus", "states"], queryFn: busApi.states, enabled: isVerified });
  const wallets = useWallets();
  const balance = Number(pickHeadline(wallets.data?.wallets)?.balance ?? 0);

  const search = useMutation({
    mutationFn: () => busApi.trips({ departure_state: from, destination_state: to, trip_date: date }),
    onSuccess: () => { setError(null); setStep("results"); },
    onError: (err) => setError(apiErrorMessage(err, t("bus.errLoadTrips"))),
  });

  const feePerSeat = trip?.service_fee_per_seat ?? 500;
  const total = trip ? (Number(trip.fare) + feePerSeat) * seats.length : 0;

  const book = useMutation({
    mutationFn: () =>
      busApi.book({
        departure_state: from, destination_state: to,
        trip_id: trip!.trip_id, order_id: trip!.order_id,
        origin_id: trip!.origin_id, destination_id: trip!.destination_id,
        boarding_at: trip!.boarding_at, provider: trip!.provider_short_name,
        trip_date: trip!.trip_date, amount_per_seat: trip!.fare,
        seat_numbers: seats.join(","), passengers,
        narration: trip!.narration, departure_terminal: trip!.departure_terminal,
        destination_terminal: trip!.destination_terminal, vehicle_no: trip!.vehicle,
        pay_with: payWith,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      if (payWith === "card" && data.authorization_url && data.reference) {
        setPayRef(data.reference);
        setCardUrl(data.authorization_url);
        return;
      }
      finishBooking(data.booking);
    },
    onError: (err) => {
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? t("bus.errBalance") : apiErrorMessage(err, t("bus.errBooking")));
    },
  });

  const [verifying, setVerifying] = useState(false);
  async function onCardReturn() {
    setCardUrl(null);
    if (!payRef) return;
    setVerifying(true);
    try {
      let b = await busApi.cardVerify(payRef);
      for (let i = 0; i < 5 && b.status !== "confirmed" && b.status !== "failed"; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        b = await busApi.booking(b.reference);
      }
      finishBooking(b);
    } catch (err) {
      setError(apiErrorMessage(err, t("bus.errConfirm")));
    } finally {
      setVerifying(false);
    }
  }

  function finishBooking(b: BusBooking) {
    qc.invalidateQueries({ queryKey: ["wallets"] });
    setBooking(b);
    setStep("ticket");
  }

  function pickTrip(t: Trip) {
    setTrip(t); setSeats([]);
    setPassengers([]);
    setStep("seats");
  }

  function toggleSeat(n: number) {
    setSeats((prev) => {
      if (prev.includes(n)) {
        const next = prev.filter((x) => x !== n);
        setPassengers((p) => p.slice(0, next.length));
        return next;
      }
      const next = [...prev, n];
      setPassengers((p) => [...p, { name: "", phone: "", sex: "Male", is_primary: p.length === 0 }]);
      return next;
    });
  }

  function setP(i: number, patch: Partial<PassengerInput>) {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function goPay() {
    setError(null);
    if (seats.length === 0) return setError(t("bus.errSeat"));
    if (passengers.some((p) => !p.name.trim() || !p.phone.trim())) return setError(t("bus.errPassengers"));
    setStep("pay");
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("bus.verifyTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("bus.verifyBody")}</Text>
          <Button title={t("bus.goBack")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  const filteredStates = useMemo(() => {
    const all = states.data ?? [];
    const q = stateSearch.trim().toLowerCase();
    return q ? all.filter((s) => s.toLowerCase().includes(q)) : all;
  }, [states.data, stateSearch]);

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => (step === "search" ? router.back() : setStep(step === "results" ? "search" : step === "seats" ? "results" : step === "pay" ? "seats" : "search"))} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("bus.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Bus size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("bus.title")}</Text><Text variant="caption" color="muted">{t("bus.subtitle")}</Text></View>
        </View>

        {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

        {/* STEP: SEARCH */}
        {step === "search" && (
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
            <StateField label={t("bus.from")} value={from} onPress={() => { setPicker("from"); setStateSearch(""); }} />
            <StateField label={t("bus.to")} value={to} onPress={() => { setPicker("to"); setStateSearch(""); }} />
            <View style={{ marginBottom: 14 }}><DateField label={t("bus.travelDate")} value={date} onChange={setDate} minimumDate={new Date()} /></View>
            <Button title={t("bus.searchTrips")} onPress={() => { setError(null); if (!from || !to || !date) return setError(t("bus.errDate")); search.mutate(); }} loading={search.isPending} />
          </View>
        )}

        {/* STEP: RESULTS */}
        {step === "results" && (
          <View style={{ gap: 12 }}>
            {(search.data?.trips.length ?? 0) === 0 ? (
              <Text variant="body" color="muted">{t("bus.noTrips")}</Text>
            ) : (
              search.data!.trips.map((trip, i) => (
                <Pressable key={`${trip.trip_id}-${i}`} onPress={() => pickTrip(trip)} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="label" color="ink">{trip.provider_name || trip.provider_short_name}</Text>
                    <Text variant="label" color="green">{t("bus.perSeat", { price: naira(trip.total_fare_per_seat) })}</Text>
                  </View>
                  <Text variant="caption" color="muted" style={{ marginTop: 4 }}>{trip.narration}</Text>
                  <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{trip.departure_time} · {trip.vehicle}</Text>
                  <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("bus.seatsAvailable", { count: trip.available_seats.length })}</Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* STEP: SEATS + PASSENGERS */}
        {step === "seats" && trip && (
          <View style={{ gap: 14 }}>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              <Text variant="label" style={{ marginBottom: 10 }}>{t("bus.chooseSeats")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {trip.available_seats.map((n) => {
                  const sel = seats.includes(n);
                  return (
                    <Pressable key={n} onPress={() => toggleSeat(n)} style={{ height: 44, width: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? colors.brand.green : colors.paper }}>
                      <Text variant="label" color={sel ? "paper" : "ink"}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {passengers.map((p, i) => (
              <View key={i} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
                <Text variant="label" style={{ marginBottom: 10 }}>{t("bus.passengerSeat", { n: i + 1, seat: seats[i] })}</Text>
                <Input label={t("bus.fullName")} value={p.name} onChangeText={(v) => setP(i, { name: v })} placeholder="John Doe" />
                <Input label={t("bus.phone")} value={p.phone} onChangeText={(v) => setP(i, { phone: v.replace(/[^\d]/g, "") })} keyboardType="phone-pad" placeholder="0803..." />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}><Input label={t("bus.age")} value={p.age ?? ""} onChangeText={(v) => setP(i, { age: v.replace(/[^\d]/g, "") })} keyboardType="number-pad" placeholder="30" /></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ marginBottom: 8 }}>{t("bus.sexLabel", "Sex")}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[{v:"Male",l:t("bus.male")},{v:"Female",l:t("bus.female")}].map((opt) => { const sx = opt.v;
                        const sel = (p.sex ?? "Male") === sx;
                        return (
                          <Pressable key={sx} onPress={() => setP(i, { sex: sx })} style={{ flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.08)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
                            <Text variant="caption" color={sel ? "green" : "muted"}>{opt.l}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {seats.length > 0 ? <Button title={t("bus.continueToPayment")} onPress={goPay} /> : null}
          </View>
        )}

        {/* STEP: PAY */}
        {step === "pay" && trip && (
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
            <Text variant="title" style={{ marginBottom: 12 }}>{trip.narration}</Text>
            <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 14, marginBottom: 14 }}>
              <Row label={t("bus.fareSeats", { count: seats.length })} value={naira(Number(trip.fare) * seats.length)} />
              <Row label={t("bus.serviceFee", { fee: naira(feePerSeat) })} value={naira(feePerSeat * seats.length)} top />
              <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 8 }} />
              <Row label={t("bus.total")} value={naira(total)} bold />
              <Text variant="caption" color="muted" style={{ marginTop: 8 }}>{t("bus.seatsList", { seats: seats.join(", ") })}</Text>
            </View>

            <Text variant="label" style={{ marginBottom: 8 }}>{t("bus.payWith")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["wallet", "card"] as const).map((m) => {
                const sel = payWith === m;
                return (
                  <Pressable key={m} onPress={() => setPayWith(m)} style={{ flex: 1, height: 48, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="label" color={sel ? "green" : "muted"}>{m === "wallet" ? t("bus.wallet") : t("bus.card")}</Text>
                  </Pressable>
                );
              })}
            </View>
            {payWith === "wallet" ? <Text variant="caption" color="muted" style={{ marginBottom: 12 }}>Wallet balance: {naira(balance)}</Text> : null}

            <Button title={t("bus.pay", { amount: naira(total) })} onPress={() => book.mutate()} loading={book.isPending || verifying} />
          </View>
        )}

        {/* STEP: TICKET */}
        {step === "ticket" && booking && (
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 20 }}>
            <View style={{ alignItems: "center", marginBottom: 14 }}>
              {booking.status === "confirmed" ? <CheckCircle2 size={46} color={colors.brand.green} /> : <XCircle size={46} color={colors.danger} />}
              <Text variant="heading" style={{ marginTop: 10 }}>{booking.status === "confirmed" ? t("bus.ticketConfirmed") : t("bus.bookingFailed")}</Text>
            </View>
            {booking.status === "confirmed" ? (
              <>
                <TicketRow k={t("bus.route")} v={booking.narration} />
                <TicketRow k={t("bus.provider")} v={booking.provider} />
                <TicketRow k={t("bus.date")} v={booking.trip_date} />
                <TicketRow k={t("bus.terminal")} v={booking.departure_terminal} />
                <TicketRow k={t("bus.seatsLabel")} v={booking.seat_numbers} />
                <TicketRow k={t("bus.vehicle")} v={booking.vehicle_no} />
                <TicketRow k={t("bus.orderNo")} v={booking.travu_order_number || booking.travu_order_id} />
                <TicketRow k={t("bus.passengerLabel")} v={booking.passengers?.[0]?.name ?? ""} />
                <TicketRow k={t("bus.amountPaid")} v={naira(Number(booking.total_amount))} />
              </>
            ) : (
              <Text variant="body" color="muted" style={{ textAlign: "center" }}>{booking.failure_reason || t("bus.bookingFailedBody")}</Text>
            )}
            <Button title={t("bus.done")} onPress={() => router.back()} style={{ marginTop: 16 }} />
            <Button title={t("bus.bookAnother")} variant="secondary" onPress={() => { setStep("search"); setTrip(null); setSeats([]); setPassengers([]); setBooking(null); }} style={{ marginTop: 10 }} />
          </View>
        )}
      </ScrollView>

      {/* State picker */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable onPress={() => setPicker(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "75%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>{t("bus.chooseState")}</Text>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={stateSearch} onChangeText={setStateSearch} autoFocus placeholder={t("bus.searchStates")} placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredStates.map((st) => (
                <Pressable key={st} onPress={() => { if (picker === "from") setFrom(st); else setTo(st); setPicker(null); }} style={{ paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                  <Text variant="body" color="ink">{st}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PaystackModal visible={!!cardUrl} url={cardUrl ?? ""} onComplete={onCardReturn} onCancel={() => setCardUrl(null)} />
    </Screen>
  );
}

function StateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text>
      <Pressable onPress={onPress} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }}>
        <Text variant="body" color={value ? "ink" : "muted"}>{value || "Select state"}</Text>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function Row({ label, value, top, bold }: { label: string; value: string; top?: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: top ? 6 : 0 }}>
      <Text variant={bold ? "label" : "caption"} color={bold ? "ink" : "muted"}>{label}</Text>
      <Text variant={bold ? "label" : "caption"} color="ink">{value}</Text>
    </View>
  );
}

function TicketRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Text variant="caption" color="muted">{k}</Text>
      <Text variant="caption" color="ink" style={{ flex: 1, textAlign: "right" }} numberOfLines={2}>{v}</Text>
    </View>
  );
}
