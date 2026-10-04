import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Copy, Loader2, MessageCircle, Phone, RefreshCw, Search, Share2, Star, XCircle } from "lucide-react";
import { apiErrorMessage } from "../../lib/api";
import { money } from "../../lib/format";
import { useJobsSocket } from "../../lib/jobsSocket";
import { deliveriesApi, type Delivery } from "../../services/deliveries";
import {
  Card, DeliveriesShell, DeliveryStatusPill, FeeBreakdown, MapView, StatusStepper, Timeline, type MapMarker,
} from "../../components/deliveries/ui";

/** /deliveries/:id — live status, map, rider, code, cancel/rate. */
export default function TrackDelivery() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const key = ["deliveries", "detail", id];
  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);

  const q = useQuery({
    queryKey: key,
    queryFn: () => deliveriesApi.get(id),
    refetchInterval: (query) => {
      const s = (query.state.data as Delivery | undefined)?.status;
      return s === "delivered" || s === "cancelled" ? false : s === "pending" ? 5000 : 10000;
    },
  });

  useJobsSocket((e) => {
    const data = e.data as { id?: string; delivery_id?: string; lat?: number; lng?: number };
    if (e.type === "delivery.updated" && data.id === id) qc.invalidateQueries({ queryKey: key });
    if (e.type === "delivery.rider_location" && data.delivery_id === id && data.lat != null)
      setLive({ lat: Number(data.lat), lng: Number(data.lng) });
  });

  const d = q.data;
  if (q.isLoading) return <DeliveriesShell><div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted" /></div></DeliveriesShell>;
  if (!d) return <DeliveriesShell><Card>Delivery not found. <Link to="/deliveries" className="font-semibold text-brand-green">Back to my deliveries</Link></Card></DeliveriesShell>;

  const riderPos = live ?? (d.rider?.lat ? { lat: Number(d.rider.lat), lng: Number(d.rider.lng) } : null);
  const showRider = riderPos && ["accepted", "picked_up", "in_transit"].includes(d.status);
  const markers: MapMarker[] = [
    { id: "p", lat: Number(d.pickup_lat), lng: Number(d.pickup_lng), kind: "pickup", label: "Pickup" },
    { id: "d", lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), kind: "dropoff", label: "Drop-off" },
    ...(showRider ? [{ id: "r", lat: riderPos!.lat, lng: riderPos!.lng, kind: "rider" as const, label: d.rider!.full_name }] : []),
  ];

  return (
    <DeliveriesShell wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] text-muted">{d.reference}</p>
          <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">{headline(d)}</h1>
        </div>
        <DeliveryStatusPill status={d.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <MapView markers={markers} height={380} fitKey={`${d.id}-${showRider ? "r" : ""}`} />
          {d.status !== "cancelled" && <Card><StatusStepper status={d.status} /></Card>}
          <Card>
            <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-wide text-muted">Timeline</p>
            <Timeline events={d.events} />
          </Card>
        </div>

        <div className="space-y-4">
          {d.payment_status === "unpaid" && d.status === "pending" && <PayNow d={d} />}
          {d.status === "pending" && d.payment_status === "paid" && <Searching d={d} />}
          {d.rider && d.status !== "cancelled" && <RiderCard d={d} />}
          {["pending", "accepted", "picked_up", "in_transit"].includes(d.status) && d.payment_status !== "unpaid" && <CodeCard d={d} />}
          {d.can_rate && <RateCard d={d} />}
          {d.rating ? (
            <Card className="flex items-center gap-2 text-[13.5px] text-ink">
              You rated {d.rider?.full_name ?? "the rider"}
              <span className="flex">{Array.from({ length: d.rating }).map((_, i) => <Star key={i} size={15} className="fill-warn text-warn" />)}</span>
            </Card>
          ) : null}

          <Card className="space-y-3 text-[13.5px]">
            <Row dot="bg-brand-green" title="Pickup" body={d.pickup_address} extra={[d.pickup_contact_name, d.pickup_contact_phone].filter(Boolean).join(" · ")} />
            <Row dot="bg-brand-red" title="Drop-off" body={d.dropoff_address} extra={`${d.recipient_name} · ${d.recipient_phone}`} />
            <div className="flex justify-between border-t border-hairline pt-3 text-muted">
              <span>{d.category_label} · {Number(d.weight_kg)} kg</span><span className="truncate pl-3">{d.package_description}</span>
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Payment</p>
              <span className="text-[12px] font-semibold capitalize text-ink">{d.payment_method} · {d.payment_status}</span>
            </div>
            <FeeBreakdown q={d} />
          </Card>

          {d.status === "cancelled" && (
            <Card className="text-[13.5px] text-muted">
              Cancelled{d.cancel_reason ? ` — ${d.cancel_reason}` : ""}. {d.payment_status === "refunded" && `${money(d.fee, d.currency)} was returned to your wallet.`}
            </Card>
          )}
          {d.can_cancel && <CancelButton d={d} />}
        </div>
      </div>
    </DeliveriesShell>
  );
}

function headline(d: Delivery) {
  switch (d.status) {
    case "pending": return d.payment_status === "unpaid" ? "Complete payment" : "Finding you a rider…";
    case "accepted": return `${d.rider?.full_name ?? "Your rider"} is heading to pickup`;
    case "picked_up": return "Package collected";
    case "in_transit": return `On the way to ${d.recipient_name}`;
    case "delivered": return "Delivered";
    default: return "Delivery cancelled";
  }
}

function Row({ dot, title, body, extra }: { dot: string; title: string; body: string; extra?: string }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{title}</p>
        <p className="text-ink">{body}</p>
        {extra && <p className="text-[12.5px] text-muted">{extra}</p>}
      </div>
    </div>
  );
}

function Searching({ d }: { d: Delivery }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-green/20" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Search size={20} /></span>
      </span>
      <div>
        <p className="text-[14px] font-semibold text-ink">{d.dispatch_exhausted ? "Riders are busy right now" : "Matching nearby riders"}</p>
        <p className="text-[12.5px] text-muted">
          {d.dispatch_exhausted
            ? "We'll keep trying and notify you. You can cancel any time for a full refund."
            : `Offering your delivery to the closest riders (round ${Math.max(1, d.dispatch_round)}).`}
        </p>
      </div>
    </Card>
  );
}

function RiderCard({ d }: { d: Delivery }) {
  const r = d.rider!;
  const tel = r.phone.replace(/[^\d+]/g, "");
  return (
    <Card>
      <div className="flex items-center gap-3">
        {r.photo_url
          ? <img src={r.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-white">{r.full_name[0]}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{r.full_name}</p>
          <p className="truncate text-[12.5px] text-muted">
            {r.vehicle_description || r.vehicle_label}{r.vehicle_plate ? ` · ${r.vehicle_plate}` : ""}
          </p>
          <p className="flex items-center gap-1 text-[12px] text-muted">
            <Star size={12} className="fill-warn text-warn" /> {Number(r.rating_avg) ? Number(r.rating_avg).toFixed(1) : "New"} · {r.completed_deliveries} deliveries
          </p>
        </div>
      </div>
      {d.status !== "delivered" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:${tel}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-green text-[13.5px] font-semibold text-white hover:bg-brand-green/90"><Phone size={15} /> Call</a>
          <a href={`sms:${tel}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-hairline text-[13.5px] font-semibold text-ink hover:bg-mist"><MessageCircle size={15} /> Message</a>
        </div>
      )}
    </Card>
  );
}

function CodeCard({ d }: { d: Delivery }) {
  const [copied, setCopied] = useState(false);
  const text = `Your OAM delivery code is ${d.delivery_code}. Give it to the rider when your package (${d.reference}) arrives.`;
  async function share() {
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
    } catch { /* cancelled */ }
  }
  return (
    <Card className="flex items-center gap-4">
      <div className="flex-1">
        <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Delivery code</p>
        <p className="font-mono text-[30px] font-semibold tracking-[0.35em] text-ink">{d.delivery_code}</p>
        <p className="text-[12px] text-muted">Share with {d.recipient_name}. The rider needs it to complete the drop-off.</p>
      </div>
      <button onClick={share} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-hairline px-3 text-[13px] font-semibold text-ink hover:bg-mist">
        {copied ? <><Copy size={14} /> Copied</> : <><Share2 size={14} /> Share</>}
      </button>
    </Card>
  );
}

function PayNow({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const verify = useMutation({
    mutationFn: () => deliveriesApi.verifyPayment(d.id),
    onSuccess: (x) => qc.setQueryData(["deliveries", "detail", d.id], x),
  });
  const retry = useMutation({
    mutationFn: () => deliveriesApi.retryPayment(d.id, `${window.location.origin}/deliveries/payment-return`),
    onSuccess: (x) => { if (x.payment_url) window.location.href = x.payment_url; },
  });
  return (
    <Card className="space-y-3">
      <p className="text-[14px] font-semibold text-ink">Payment not completed yet</p>
      <p className="text-[12.5px] text-muted">We'll start matching a rider as soon as the {money(d.fee, d.currency)} payment goes through.</p>
      {(verify.error || retry.error) && <p className="text-[12.5px] text-danger">{apiErrorMessage(verify.error || retry.error)}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => retry.mutate()} disabled={retry.isPending} className="h-10 rounded-xl bg-brand-red text-[13.5px] font-semibold text-white disabled:opacity-50">Pay now</button>
        <button onClick={() => verify.mutate()} disabled={verify.isPending} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-hairline text-[13.5px] font-semibold text-ink hover:bg-mist">
          <RefreshCw size={14} className={verify.isPending ? "animate-spin" : ""} /> I've paid
        </button>
      </div>
    </Card>
  );
}

function RateCard({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const rate = useMutation({
    mutationFn: () => deliveriesApi.rate(d.id, stars, review),
    onSuccess: (x) => qc.setQueryData(["deliveries", "detail", d.id], x),
  });
  return (
    <Card className="space-y-3">
      <p className="text-[14px] font-semibold text-ink">How was {d.rider?.full_name ?? "your rider"}?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-0.5">
            <Star size={28} className={n <= stars ? "fill-warn text-warn" : "text-hairline"} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={300} rows={2} placeholder="Anything to add? (optional)"
            className="w-full rounded-xl border border-hairline px-3 py-2 text-[13.5px] outline-none focus:border-brand-green" />
          <button onClick={() => rate.mutate()} disabled={rate.isPending} className="h-10 w-full rounded-xl bg-brand-green text-[13.5px] font-semibold text-white disabled:opacity-50">Submit rating</button>
        </>
      )}
    </Card>
  );
}

function CancelButton({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const cancel = useMutation({
    mutationFn: () => deliveriesApi.cancel(d.id, "Cancelled by customer"),
    onSuccess: (x) => { qc.setQueryData(["deliveries", "detail", d.id], x); qc.invalidateQueries({ queryKey: ["wallet"] }); setConfirm(false); },
  });
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-danger/25 text-[13.5px] font-semibold text-danger hover:bg-danger/5">
        <XCircle size={15} /> Cancel delivery
      </button>
    );
  }
  return (
    <Card className="space-y-3 border-danger/25">
      <p className="text-[13.5px] text-ink">Cancel {d.reference}? {d.payment_status === "paid" ? `${money(d.fee, d.currency)} goes back to your wallet.` : ""}</p>
      {cancel.error && <p className="text-[12.5px] text-danger">{apiErrorMessage(cancel.error)}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setConfirm(false)} className="h-10 rounded-xl border border-hairline text-[13.5px] font-semibold">Keep it</button>
        <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="h-10 rounded-xl bg-danger text-[13.5px] font-semibold text-white disabled:opacity-50">Yes, cancel</button>
      </div>
    </Card>
  );
}
