import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Banknote, Bike, Box, CreditCard, FileText, Loader2, Package, PackageOpen, ShieldAlert,
  Utensils, Wallet as WalletIcon, Wine,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useUserScope } from "../../auth/useUserScope";
import { apiErrorMessage } from "../../lib/api";
import { money } from "../../lib/format";
import { walletApi } from "../../services/wallet";
import {
  deliveriesApi, deliveryErrorCode, type PackageCategory, type PaymentMethod, type Place, type Quote,
} from "../../services/deliveries";
import {
  Card, DeliveriesShell, FeeBreakdown, Field, inputCls, LocationPicker, MapView, type MapMarker,
} from "../../components/deliveries/ui";

const CATEGORIES: { value: PackageCategory; label: string; hint: string; icon: typeof Box }[] = [
  { value: "documents", label: "Documents", hint: "Envelopes, files", icon: FileText },
  { value: "small", label: "Small", hint: "Fits in a bag", icon: Package },
  { value: "medium", label: "Medium", hint: "Shoebox to carton", icon: Box },
  { value: "large", label: "Large", hint: "Needs a car/van", icon: PackageOpen },
  { value: "food", label: "Food", hint: "Keep upright", icon: Utensils },
  { value: "fragile", label: "Fragile", hint: "Handle with care", icon: Wine },
];

type Step = "route" | "details" | "review";
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** /deliveries/new — pick route → recipient & package → fee breakdown + pay. */
export default function SendPackage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scope = useUserScope();
  const { user, isVerified } = useAuth();

  const [step, setStep] = useState<Step>("route");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [activePin, setActivePin] = useState<"pickup" | "dropoff">("pickup");
  const [category, setCategory] = useState<PackageCategory>("small");
  const [weight, setWeight] = useState("1");
  const [form, setForm] = useState(() => ({
    package_description: "", recipient_name: "", recipient_phone: "", dropoff_note: "",
    pickup_contact_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    pickup_contact_phone: (user as { phone?: string } | null)?.phone || "", pickup_note: "",
  }));
  const [method, setMethod] = useState<PaymentMethod>("wallet");
  const [error, setError] = useState("");

  const meta = useQuery({ queryKey: ["deliveries", "meta"], queryFn: deliveriesApi.meta, staleTime: 300_000 });
  const wallets = useQuery({ queryKey: ["wallet", scope, "list"], queryFn: walletApi.getWallets, enabled: isVerified });
  const ngn = Number(wallets.data?.wallets.find((w) => w.currency === "NGN")?.balance ?? 0);

  const quoteInput = useMemo(() => pickup && dropoff ? {
    pickup_lat: pickup.lat, pickup_lng: pickup.lng, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
    weight_kg: Number(weight) || 0, package_category: category,
  } : null, [pickup, dropoff, weight, category]);

  const quote = useQuery<Quote>({
    queryKey: ["deliveries", "quote", quoteInput],
    queryFn: () => deliveriesApi.quote(quoteInput!),
    enabled: Boolean(quoteInput),
    retry: false,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: () => deliveriesApi.create({
      ...quoteInput!, pickup_address: pickup!.address, dropoff_address: dropoff!.address, ...form,
      payment_method: method, expected_fee: quote.data?.fee,
      return_url: method === "card" ? `${window.location.origin}/deliveries/payment-return` : undefined,
    }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["deliveries", "list"] });
      if (d.payment_method === "card" && d.payment_status === "unpaid" && d.payment_url) {
        try { sessionStorage.setItem("oam.delivery.pending", d.id); } catch { /* private mode */ }
        window.location.href = d.payment_url;
        return;
      }
      navigate(`/deliveries/${d.id}`, { replace: true });
    },
    onError: (e) => {
      const code = deliveryErrorCode(e);
      if (code === "price_changed") qc.invalidateQueries({ queryKey: ["deliveries", "quote"] });
      setError(apiErrorMessage(e, "Couldn't place the delivery."));
    },
  });

  function pickOnMap(lat: number, lng: number) {
    const place = { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    const set = activePin === "pickup" ? setPickup : setDropoff;
    set(place);
    import("../../lib/maps").then(({ reverseGeocode }) => reverseGeocode(lat, lng).then((address) =>
      set((cur) => (cur && cur.lat === lat && cur.lng === lng ? { ...cur, address } : cur))));
    if (activePin === "pickup" && !dropoff) setActivePin("dropoff");
  }

  const markers: MapMarker[] = [
    ...(pickup ? [{ id: "p", lat: pickup.lat, lng: pickup.lng, kind: "pickup" as const, label: "Pickup" }] : []),
    ...(dropoff ? [{ id: "d", lat: dropoff.lat, lng: dropoff.lng, kind: "dropoff" as const, label: "Drop-off" }] : []),
  ];

  const detailsOk = form.package_description.trim().length >= 3 && form.recipient_name.trim().length >= 2
    && PHONE.test(form.recipient_phone.trim()) && Number(weight) >= 0 && Number(weight) <= 200;
  const fee = Number(quote.data?.fee ?? 0);
  const short = method === "wallet" && fee > ngn;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <DeliveriesShell wide>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Bike size={22} strokeWidth={1.75} /></span>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">Send a package</h1>
          <p className="text-[13px] text-muted">A nearby rider picks it up in minutes. Track it live to the door.</p>
        </div>
      </div>

      <StepBar step={step} onJump={(s) => (s === "route" || (s === "details" && quoteInput)) && setStep(s)} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {step === "route" && (
            <Card className="space-y-3">
              <LocationPicker label="Pickup" kind="pickup" value={pickup} onChange={setPickup}
                active={activePin === "pickup"} onFocus={() => setActivePin("pickup")} />
              <LocationPicker label="Drop-off" kind="dropoff" value={dropoff} onChange={setDropoff}
                near={pickup ?? undefined} active={activePin === "dropoff"} onFocus={() => setActivePin("dropoff")} />
              {quote.isError && <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger">{apiErrorMessage(quote.error, "We can't deliver on this route.")}</p>}
              {quote.data && (
                <div className="flex items-center justify-between rounded-xl bg-mist px-3.5 py-3 text-[13px]">
                  <span className="text-muted">{Number(quote.data.distance_km).toFixed(1)} km · ≈ {quote.data.duration_min} min</span>
                  <span className="font-semibold text-ink">from {money(quote.data.fee, quote.data.currency)}</span>
                </div>
              )}
              <button disabled={!quote.data} onClick={() => setStep("details")}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-[14px] font-semibold text-white transition hover:bg-brand-green/90 disabled:opacity-40">
                Continue <ArrowRight size={16} />
              </button>
            </Card>
          )}

          {step === "details" && (
            <Card className="space-y-4">
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-ink">What are you sending?</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)} aria-pressed={category === c.value}
                      className={`rounded-xl border px-2 py-2.5 text-center transition ${category === c.value ? "border-brand-green bg-brand-green/5" : "border-hairline hover:bg-mist"}`}>
                      <c.icon size={20} strokeWidth={1.75} className={`mx-auto ${category === c.value ? "text-brand-green" : "text-muted"}`} />
                      <span className="mt-1 block text-[12.5px] font-semibold text-ink">{c.label}</span>
                      <span className="block text-[10.5px] text-muted">{c.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Description"><input className={inputCls} value={form.package_description} onChange={set("package_description")} placeholder="e.g. Blue envelope with documents" maxLength={255} /></Field>
                <Field label="Weight (kg)"><input className={inputCls} type="number" min={0} max={200} step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
              </div>
              <div className="border-t border-hairline pt-4">
                <p className="mb-2 text-[12.5px] font-semibold text-ink">Recipient</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name"><input className={inputCls} value={form.recipient_name} onChange={set("recipient_name")} placeholder="Who receives it?" /></Field>
                  <Field label="Phone"><input className={inputCls} value={form.recipient_phone} onChange={set("recipient_phone")} placeholder="0803 123 4567" inputMode="tel" /></Field>
                </div>
                <div className="mt-3"><Field label="Note for the rider (optional)"><input className={inputCls} value={form.dropoff_note} onChange={set("dropoff_note")} placeholder="Gate code, landmark, floor…" /></Field></div>
              </div>
              <details className="rounded-xl border border-hairline px-3.5 py-2.5">
                <summary className="cursor-pointer text-[13px] font-semibold text-ink">Pickup contact</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Name"><input className={inputCls} value={form.pickup_contact_name} onChange={set("pickup_contact_name")} /></Field>
                  <Field label="Phone"><input className={inputCls} value={form.pickup_contact_phone} onChange={set("pickup_contact_phone")} inputMode="tel" /></Field>
                </div>
                <div className="mt-3"><Field label="Pickup note (optional)"><input className={inputCls} value={form.pickup_note} onChange={set("pickup_note")} /></Field></div>
              </details>
              <div className="flex gap-2">
                <button onClick={() => setStep("route")} className="h-11 rounded-xl border border-hairline px-4 text-[14px] font-semibold text-ink hover:bg-mist">Back</button>
                <button disabled={!detailsOk || !quote.data} onClick={() => setStep("review")}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green text-[14px] font-semibold text-white transition hover:bg-brand-green/90 disabled:opacity-40">
                  Review price <ArrowRight size={16} />
                </button>
              </div>
            </Card>
          )}

          {step === "review" && quote.data && (
            <>
              <Card>
                <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-wide text-muted">Fee breakdown</p>
                <FeeBreakdown q={quote.data} />
              </Card>
              <Card className="space-y-2">
                <p className="mb-1 text-[12.5px] font-semibold uppercase tracking-wide text-muted">Pay with</p>
                <PayOption active={method === "wallet"} onClick={() => setMethod("wallet")} icon={<WalletIcon size={18} />}
                  title="OAM wallet" sub={wallets.isLoading ? "Checking balance…" : `Balance ${money(ngn)}`} warn={short ? "Not enough balance" : undefined} />
                <PayOption active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard size={18} />}
                  title="Card, bank or USSD" sub="Secure checkout by Flutterwave" />
                {meta.data?.cash_enabled !== false && (
                  <PayOption active={method === "cash"} onClick={() => setMethod("cash")} icon={<Banknote size={18} />}
                    title="Cash to rider" sub="Pay the rider in cash when they pick up" />
                )}
                {short && (
                  <p className="text-[12.5px] text-muted">
                    <Link to="/wallet/fund" className="font-semibold text-brand-green hover:underline">Top up your wallet</Link> or pay by card.
                  </p>
                )}
              </Card>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setError(""); setStep("details"); }} className="h-12 rounded-xl border border-hairline px-4 text-[14px] font-semibold text-ink hover:bg-mist">Back</button>
                <button disabled={create.isPending || short || quote.isFetching} onClick={() => { setError(""); create.mutate(); }}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-red text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(227,16,18,0.25)] transition hover:bg-brand-red/90 disabled:opacity-40">
                  {create.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
                  {method === "card" ? `Pay ${money(quote.data.fee)} & request rider`
                    : method === "cash" ? `Request rider · pay ${money(quote.data.fee)} cash` : `Confirm & pay ${money(quote.data.fee)}`}
                </button>
              </div>
              <p className="text-center text-[11.5px] text-muted">Cancel before pickup for a full refund to your wallet.</p>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-[130px] lg:self-start">
          <MapView markers={markers} height={step === "route" ? 460 : 340} onPick={step === "route" ? pickOnMap : undefined} />
          {step !== "route" && pickup && dropoff && (
            <Card className="mt-3 space-y-2 text-[13px]">
              <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-green" />{pickup.address}</p>
              <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-red" />{dropoff.address}</p>
            </Card>
          )}
        </div>
      </div>
    </DeliveriesShell>
  );
}

function StepBar({ step, onJump }: { step: Step; onJump: (s: Step) => void }) {
  const steps: { key: Step; label: string }[] = [{ key: "route", label: "Route" }, { key: "details", label: "Package & recipient" }, { key: "review", label: "Price & pay" }];
  const at = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex gap-2">
      {steps.map((s, i) => (
        <li key={s.key} className="flex-1">
          <button type="button" onClick={() => i < at && onJump(s.key)} disabled={i >= at}
            className={`w-full rounded-full py-1.5 text-[12px] font-semibold transition ${i === at ? "bg-ink text-white" : i < at ? "bg-brand-green/10 text-brand-green hover:bg-brand-green/15" : "bg-paper text-muted"}`}>
            {i + 1}. {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function PayOption({ active, onClick, icon, title, sub, warn }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; warn?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${active ? "border-brand-green bg-brand-green/5" : "border-hairline hover:bg-mist"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-brand-green text-white" : "bg-mist text-muted"}`}>{icon}</span>
      <span className="flex-1">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12px] text-muted">{sub}</span>
      </span>
      {warn && <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn">{warn}</span>}
      <span className={`h-4 w-4 rounded-full border-2 ${active ? "border-brand-green bg-brand-green shadow-[inset_0_0_0_2px_#fff]" : "border-hairline"}`} />
    </button>
  );
}
