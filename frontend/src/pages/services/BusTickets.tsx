import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useAuth } from "../../auth/AuthContext";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import { apiErrorMessage } from "../../lib/api";
import { busApi, busPayStore, type Trip, type BusBooking, type PassengerInput } from "../../services/bus";

type Step = "search" | "results" | "seats" | "pay" | "ticket";

export default function BusTickets() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isVerified } = useAuth();

  const [step, setStep] = useState<Step>("search");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seats, setSeats] = useState<number[]>([]);
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [booking, setBooking] = useState<BusBooking | null>(null);
  const [error, setError] = useState<string>();
  const [resuming, setResuming] = useState(false);

  const states = useQuery({ queryKey: ["bus", "states"], queryFn: busApi.states, enabled: isVerified });
  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: walletApi.getWallets, enabled: isVerified });
  const balance = Number(walletsQ.data?.wallets.find((w) => w.currency === "NGN")?.balance ?? 0);

  useEffect(() => {
    const pending = busPayStore.take();
    if (!pending) return;
    setResuming(true);
    (async () => {
      try {
        let b = await busApi.cardVerify(pending.ref).catch(() => busApi.booking(pending.bookingRef));
        for (let i = 0; i < 6 && b.status !== "confirmed" && b.status !== "failed"; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          b = await busApi.booking(pending.bookingRef);
        }
        qc.invalidateQueries({ queryKey: ["wallets"] });
        setBooking(b); setStep("ticket");
      } catch {
        setError("Couldn't confirm your booking. Check My Bookings.");
      } finally {
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useMutation({
    mutationFn: () => busApi.trips({ departure_state: from, destination_state: to, trip_date: date }),
    onSuccess: () => { setError(undefined); setStep("results"); },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't load trips.")),
  });

  const feePerSeat = trip?.service_fee_per_seat ?? 500;
  const total = trip ? (Number(trip.fare) + feePerSeat) * seats.length : 0;

  const book = useMutation({
    mutationFn: () =>
      busApi.book({
        departure_state: from, destination_state: to,
        trip_id: trip!.trip_id, order_id: trip!.order_id, origin_id: trip!.origin_id,
        destination_id: trip!.destination_id, boarding_at: trip!.boarding_at,
        provider: trip!.provider_short_name, trip_date: trip!.trip_date,
        amount_per_seat: trip!.fare, seat_numbers: seats.join(","), passengers,
        narration: trip!.narration, departure_terminal: trip!.departure_terminal,
        destination_terminal: trip!.destination_terminal, vehicle_no: trip!.vehicle,
        pay_with: payWith,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      if (payWith === "card" && data.authorization_url && data.reference) {
        busPayStore.set({ ref: data.reference, bookingRef: data.booking.reference });
        window.location.href = data.authorization_url;
        return;
      }
      setBooking(data.booking); setStep("ticket");
    },
    onError: (err) => {
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? "Your wallet balance is too low. Add money or pay by card." : apiErrorMessage(err, "Booking failed."));
    },
  });

  function toggleSeat(n: number) {
    setSeats((prev) => {
      if (prev.includes(n)) { const next = prev.filter((x) => x !== n); setPassengers((p) => p.slice(0, next.length)); return next; }
      const next = [...prev, n]; setPassengers((p) => [...p, { name: "", phone: "", sex: "Male", is_primary: p.length === 0 }]); return next;
    });
  }
  const setP = (i: number, patch: Partial<PassengerInput>) =>
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  function goPay() {
    setError(undefined);
    if (!seats.length) return setError("Select at least one seat.");
    if (passengers.some((p) => !p.name.trim() || !p.phone?.trim())) return setError("Enter each passenger's name and phone.");
    setStep("pay");
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-mist"><AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">Verify your account</h1>
          <p className="mt-2 text-[14px] text-muted">You need a verified account to book bus tickets.</p>
        </main>
      </div>
    );
  }

  if (resuming) {
    return (
      <div className="min-h-screen bg-mist"><AppHeader />
        <main className="mx-auto max-w-md px-5 py-24 text-center">
          <Loader2 size={34} className="mx-auto animate-spin text-brand-green" />
          <p className="mt-4 text-[14px] text-muted">Confirming your booking…</p>
        </main>
      </div>
    );
  }

  const inputCls = "h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10";

  return (
    <div className="min-h-screen bg-mist"><AppHeader />
      <main className="mx-auto max-w-lg px-5 py-8">
        <button onClick={() => (step === "search" ? navigate("/dashboard") : setStep(step === "results" ? "search" : step === "seats" ? "results" : "seats"))} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Bus size={22} strokeWidth={1.75} /></span>
          <div><h1 className="font-display text-xl font-semibold text-ink">Bus Tickets</h1><p className="text-[13px] text-muted">Book intercity bus trips.</p></div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

        {step === "search" && (
          <div className="rounded-2xl border border-hairline bg-paper p-5">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">From (departure state)</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mb-4`}>
              <option value="">Select state…</option>{(states.data ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">To (destination state)</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mb-4`}>
              <option value="">Select state…</option>{(states.data ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Travel date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mb-5`} />
            <button onClick={() => { setError(undefined); if (!from || !to || !date) return setError("Choose from, to and a date."); search.mutate(); }} disabled={search.isPending} className="flex h-11 w-full items-center justify-center rounded-[11px] bg-brand-green text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60">
              {search.isPending ? <Loader2 size={18} className="animate-spin" /> : "Search trips"}
            </button>
          </div>
        )}

        {step === "results" && (
          <div className="space-y-3">
            {(search.data?.trips.length ?? 0) === 0 ? <p className="text-[14px] text-muted">No trips found for that route and date.</p> :
              search.data!.trips.map((t, i) => (
                <button key={`${t.trip_id}-${i}`} onClick={() => { setTrip(t); setSeats([]); setPassengers([]); setStep("seats"); }} className="w-full rounded-2xl border border-hairline bg-paper p-4 text-left transition hover:border-ink/15 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-ink">{t.provider_name || t.provider_short_name}</span>
                    <span className="text-[14px] font-semibold text-brand-green">{naira(t.total_fare_per_seat)}/seat</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">{t.narration}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{t.departure_time} · {t.vehicle}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{t.available_seats.length} seats available</p>
                </button>
              ))}
          </div>
        )}

        {step === "seats" && trip && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-hairline bg-paper p-5">
              <p className="mb-3 text-[12.5px] font-semibold text-ink">Choose your seats</p>
              <div className="flex flex-wrap gap-2.5">
                {trip.available_seats.map((n) => {
                  const sel = seats.includes(n);
                  return <button key={n} onClick={() => toggleSeat(n)} className={`h-11 w-11 rounded-[10px] border text-[14px] font-medium transition ${sel ? "border-brand-green bg-brand-green text-white" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{n}</button>;
                })}
              </div>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className="rounded-2xl border border-hairline bg-paper p-5">
                <p className="mb-3 text-[12.5px] font-semibold text-ink">Passenger {i + 1} · seat {seats[i]}</p>
                <input value={p.name} onChange={(e) => setP(i, { name: e.target.value })} placeholder="Full name" className={`${inputCls} mb-3`} />
                <div className="flex gap-3">
                  <input value={p.phone} onChange={(e) => setP(i, { phone: e.target.value.replace(/[^\d]/g, "") })} placeholder="Phone" className={inputCls} />
                  <input value={p.age ?? ""} onChange={(e) => setP(i, { age: e.target.value.replace(/[^\d]/g, "") })} placeholder="Age" className={`${inputCls} w-24`} />
                  <select value={p.sex ?? "Male"} onChange={(e) => setP(i, { sex: e.target.value })} className={`${inputCls} w-28`}><option>Male</option><option>Female</option></select>
                </div>
              </div>
            ))}
            {seats.length > 0 && <button onClick={goPay} className="h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white transition hover:brightness-95">Continue to payment</button>}
          </div>
        )}

        {step === "pay" && trip && (
          <div className="rounded-2xl border border-hairline bg-paper p-5">
            <p className="mb-3 text-[15px] font-semibold text-ink">{trip.narration}</p>
            <div className="mb-4 space-y-1.5 rounded-xl bg-mist p-4 text-[13px]">
              <div className="flex justify-between text-muted"><span>Fare · {seats.length} seat(s)</span><span className="text-ink">{naira(Number(trip.fare) * seats.length)}</span></div>
              <div className="flex justify-between text-muted"><span>Service fee · {naira(feePerSeat)}/seat</span><span className="text-ink">{naira(feePerSeat * seats.length)}</span></div>
              <div className="flex justify-between border-t border-hairline pt-1.5 font-semibold"><span className="text-ink">Total</span><span className="text-ink">{naira(total)}</span></div>
              <p className="pt-1 text-[12px] text-muted">Seats {seats.join(", ")}</p>
            </div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink">Pay with</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["wallet", "card"] as const).map((m) => (
                <button key={m} onClick={() => setPayWith(m)} className={`h-11 rounded-[11px] border text-[13.5px] font-medium transition ${payWith === m ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{m === "wallet" ? "Wallet" : "Card"}</button>
              ))}
            </div>
            {payWith === "wallet" && <p className="mb-3 text-[12px] text-muted">Wallet balance: {naira(balance)}</p>}
            <button onClick={() => book.mutate()} disabled={book.isPending} className="flex h-11 w-full items-center justify-center rounded-[11px] bg-brand-red text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 disabled:opacity-60">
              {book.isPending ? <Loader2 size={18} className="animate-spin" /> : `Pay ${naira(total)}`}
            </button>
          </div>
        )}

        {step === "ticket" && booking && (
          <div className="rounded-2xl border border-hairline bg-paper p-6">
            <div className="mb-4 text-center">
              {booking.status === "confirmed" ? <CheckCircle2 size={44} className="mx-auto text-brand-green" /> : <XCircle size={44} className="mx-auto text-danger" />}
              <h2 className="mt-2 font-display text-lg font-semibold text-ink">{booking.status === "confirmed" ? "Ticket confirmed" : "Booking failed"}</h2>
            </div>
            {booking.status === "confirmed" ? (
              <div className="divide-y divide-hairline text-[13px]">
                {[["Route", booking.narration], ["Provider", booking.provider], ["Date", booking.trip_date], ["Terminal", booking.departure_terminal], ["Seats", booking.seat_numbers], ["Vehicle", booking.vehicle_no], ["Order no.", booking.travu_order_number || booking.travu_order_id], ["Passenger", booking.passengers?.[0]?.name ?? ""], ["Amount paid", naira(Number(booking.total_amount))]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2"><span className="text-muted">{k}</span><span className="text-right text-ink">{v}</span></div>
                ))}
              </div>
            ) : <p className="text-center text-[14px] text-muted">{booking.failure_reason || "The booking couldn't be completed. If you were charged, it has been refunded."}</p>}
            <button onClick={() => navigate("/dashboard")} className="mt-5 h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white">Done</button>
            <button onClick={() => { setStep("search"); setTrip(null); setSeats([]); setPassengers([]); setBooking(null); }} className="mt-2.5 h-11 w-full rounded-[11px] border border-hairline bg-paper text-[14px] font-medium text-ink hover:bg-mist">Book another</button>
          </div>
        )}
      </main>
    </div>
  );
}
