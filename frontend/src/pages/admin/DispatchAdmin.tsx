import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Bike, CheckCircle2, FileText, Gauge, Loader2, MapPinned, Plus, RefreshCw, Save,
  Search, ShieldCheck, ShieldOff, Trash2, Users, X, XCircle, Zap,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { money } from "../../lib/format";
import {
  dispatchAdminApi, STATUS_LABEL, type AdminRider, type DeliveryStatus, type DispatchSettings, type Surge, type Zone,
} from "../../services/deliveries";
import {
  Card, DeliveriesShell, DeliveryStatusPill, FeeBreakdown, Field, inputCls, MapView, Timeline, type MapCircle, type MapMarker,
} from "../../components/deliveries/ui";

type Tab = "overview" | "deliveries" | "riders" | "pricing";
const TABS: { key: Tab; label: string; icon: typeof Gauge }[] = [
  { key: "overview", label: "Live map", icon: MapPinned },
  { key: "deliveries", label: "Deliveries", icon: Bike },
  { key: "riders", label: "Riders", icon: Users },
  { key: "pricing", label: "Pricing & zones", icon: Zap },
];

/** /admin/dispatch — staff only. */
export default function DispatchAdmin() {
  const { user } = useAuth();
  const staff = user as { is_staff?: boolean; is_superuser?: boolean } | null;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";

  if (!staff?.is_staff && !staff?.is_superuser) {
    return <DeliveriesShell tabs={false}><Card className="text-center text-[14px] text-muted">This page is for OAM staff.</Card></DeliveriesShell>;
  }

  return (
    <DeliveriesShell wide tabs={false}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white"><ShieldCheck size={21} /></span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">Dispatch</h1>
            <p className="text-[13px] text-muted">Deliveries, riders and pricing in one place.</p>
          </div>
        </div>
        <Link to="/dashboard" className="text-[13px] font-semibold text-brand-green">Back to Dashboard</Link>
      </div>
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-paper p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setParams({ tab: t.key })}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${tab === t.key ? "bg-ink text-white" : "text-muted hover:bg-mist hover:text-ink"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </nav>
      {tab === "overview" && <OverviewTab />}
      {tab === "deliveries" && <DeliveriesTab />}
      {tab === "riders" && <RidersTab />}
      {tab === "pricing" && <PricingTab />}
    </DeliveriesShell>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Stat({ label, value, tone = "ink", icon }: { label: string; value: ReactNode; tone?: "ink" | "green" | "warn"; icon?: ReactNode }) {
  const c = tone === "green" ? "text-brand-green" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <Card className="!p-4">
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{icon}{label}</p>
      <p className={`mt-1 font-display text-[22px] font-semibold tabular-nums ${c}`}>{value}</p>
    </Card>
  );
}

function OverviewTab() {
  const q = useQuery({ queryKey: ["dispatch", "overview"], queryFn: dispatchAdminApi.overview, refetchInterval: 10000 });
  const o = q.data;
  const markers = useMemo<MapMarker[]>(() => {
    if (!o) return [];
    const m: MapMarker[] = o.online_riders.map((r) => ({ id: `r-${r.id}`, lat: Number(r.lat), lng: Number(r.lng), kind: r.busy ? "rider-busy" : "rider", label: `${r.name}${r.busy ? " (on a job)" : ""}` }));
    o.active_deliveries.forEach((d) => {
      m.push({ id: `p-${d.id}`, lat: Number(d.pickup_lat), lng: Number(d.pickup_lng), kind: d.status === "pending" ? "point" : "pickup", label: `${d.reference} pickup · ${STATUS_LABEL[d.status]}` });
      if (d.status !== "pending") m.push({ id: `d-${d.id}`, lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), kind: "dropoff", label: `${d.reference} drop-off` });
    });
    return m;
  }, [o]);
  if (!o) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted" /></div>;
  const s = o.deliveries_by_status;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Requests today" value={o.today.requests} />
        <Stat label="Delivered today" value={o.today.delivered} tone="green" />
        <Stat label="GMV today" value={money(o.today.gmv)} />
        <Stat label="Platform revenue" value={money(o.today.platform_revenue)} tone="green" />
        <Stat label="Riders online" value={o.online_riders.length} icon={<Bike size={12} />} />
        <Stat label="Waiting > 5 min" value={o.unassigned_over_5_min} tone={o.unassigned_over_5_min ? "warn" : "ink"} icon={o.unassigned_over_5_min ? <AlertTriangle size={12} /> : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <MapView markers={markers} route={false} height={520} fitKey={String(markers.length > 0)} />
        <div className="space-y-3">
          <Card>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Pipeline</p>
            {(["pending", "accepted", "picked_up", "in_transit", "delivered", "cancelled"] as DeliveryStatus[]).map((k) => (
              <div key={k} className="flex items-center justify-between py-1 text-[13.5px]">
                <DeliveryStatusPill status={k} /><span className="font-semibold tabular-nums">{s[k] ?? 0}</span>
              </div>
            ))}
          </Card>
          <Card>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Riders</p>
            {(["pending", "approved", "suspended", "rejected"] as const).map((k) => (
              <div key={k} className="flex justify-between py-1 text-[13.5px] capitalize"><span>{k}</span><span className="font-semibold">{o.riders_by_status[k] ?? 0}</span></div>
            ))}
            {(o.riders_by_status.pending ?? 0) > 0 && <Link to="/admin/dispatch?tab=riders" className="mt-2 block text-[12.5px] font-semibold text-brand-green">Review applications →</Link>}
          </Card>
          <Card className="text-[12px] text-muted">
            <p className="mb-1 font-semibold text-ink">Legend</p>
            <p>⚫ idle rider · 🟠 rider on a job · 🟢 pickup · 🔴 drop-off · ⚪ unassigned</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

function DeliveriesTab() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["dispatch", "deliveries", status, query, page],
    queryFn: () => dispatchAdminApi.deliveries({ status: status === "unassigned" ? undefined : status || undefined, unassigned: status === "unassigned" ? "1" : undefined, q: query || undefined, page }),
    refetchInterval: 15000,
  });
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-3">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }} className="flex flex-1 items-center gap-2 rounded-lg border border-hairline px-2.5">
            <Search size={14} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, customer email, phone, rider…" className="h-9 flex-1 bg-transparent text-[13px] outline-none" />
          </form>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-hairline bg-paper px-2 text-[13px]">
            <option value="">All statuses</option>
            <option value="unassigned">Paid, unassigned</option>
            <option value="accepted,picked_up,in_transit">In progress</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-mist text-[11.5px] uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Route</th><th className="px-3 py-2">Rider</th><th className="px-3 py-2 text-right">Fee</th><th className="px-3 py-2">Created</th></tr>
            </thead>
            <tbody>
              {list.data?.results.map((d) => (
                <tr key={d.id} onClick={() => setOpen(d.id)} className={`cursor-pointer border-t border-hairline hover:bg-mist ${open === d.id ? "bg-brand-green/5" : ""}`}>
                  <td className="px-3 py-2.5 font-mono text-[12px]">{d.reference}</td>
                  <td className="px-3 py-2.5"><DeliveryStatusPill status={d.status} />{d.dispatch_exhausted && d.status === "pending" && <span className="ml-1 text-[11px] font-semibold text-warn">no rider</span>}</td>
                  <td className="max-w-[160px] truncate px-3 py-2.5">{d.customer_email}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-muted">{d.pickup_address} → {d.dropoff_address}</td>
                  <td className="px-3 py-2.5">{d.rider_name || <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(d.fee, d.currency)}<span className="block text-[11px] font-normal text-muted">{d.payment_status}</span></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{new Date(d.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted" /></div>}
          {list.data && !list.data.results.length && <p className="py-10 text-center text-[13px] text-muted">No deliveries match.</p>}
        </div>
        {list.data && list.data.count > 20 && (
          <div className="flex items-center justify-between border-t border-hairline p-3 text-[12.5px] text-muted">
            <span>{list.data.count} deliveries</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border border-hairline px-2 py-1 disabled:opacity-40">Prev</button>
              <button disabled={!list.data.next} onClick={() => setPage(page + 1)} className="rounded border border-hairline px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </Card>
      {open ? <DeliveryPanel id={open} onClose={() => setOpen(null)} /> : (
        <Card className="hidden items-center justify-center text-[13px] text-muted xl:flex">Select a delivery to see its details.</Card>
      )}
    </div>
  );
}

function DeliveryPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dispatch", "delivery", id], queryFn: () => dispatchAdminApi.delivery(id), refetchInterval: 10000 });
  const done = () => { qc.invalidateQueries({ queryKey: ["dispatch"] }); };
  const cancel = useMutation({ mutationFn: (reason: string) => dispatchAdminApi.cancelDelivery(id, reason), onSuccess: done });
  const redispatch = useMutation({ mutationFn: () => dispatchAdminApi.redispatch(id), onSuccess: done });
  const d = q.data;
  if (!d) return <Card className="flex justify-center py-10"><Loader2 className="animate-spin text-muted" /></Card>;
  const markers: MapMarker[] = [
    { id: "p", lat: Number(d.pickup_lat), lng: Number(d.pickup_lng), kind: "pickup" },
    { id: "d", lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), kind: "dropoff" },
    ...(d.rider?.lat ? [{ id: "r", lat: Number(d.rider.lat), lng: Number(d.rider.lng), kind: "rider" as const, label: d.rider.full_name }] : []),
  ];
  const err = cancel.error || redispatch.error;
  return (
    <Card className="space-y-4 xl:sticky xl:top-[90px] xl:max-h-[calc(100vh-110px)] xl:overflow-auto">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[12px] text-muted">{d.reference}</p>
          <p className="text-[15px] font-semibold text-ink">{d.customer_name || d.customer_email}</p>
          <DeliveryStatusPill status={d.status} />
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Close"><X size={16} /></button>
      </div>
      <MapView markers={markers} height={200} fitKey={d.id} />
      <div className="space-y-1 text-[13px]">
        <p><b>From:</b> {d.pickup_address} <span className="text-muted">({d.pickup_contact_name} {d.pickup_contact_phone})</span></p>
        <p><b>To:</b> {d.dropoff_address} <span className="text-muted">({d.recipient_name} {d.recipient_phone})</span></p>
        <p><b>Package:</b> {d.category_label}, {Number(d.weight_kg)} kg — {d.package_description}</p>
        {d.rider && <p><b>Rider:</b> {d.rider.full_name} · {d.rider.phone}</p>}
        {d.proof_photo_url && <p><b>Proof:</b> <a href={d.proof_photo_url} target="_blank" rel="noreferrer" className="text-brand-green underline">photo</a></p>}
      </div>
      <div className="rounded-xl bg-mist p-3">
        <FeeBreakdown q={d} />
        <div className="mt-2 flex justify-between text-[12.5px] text-muted"><span>Rider payout</span><span>{money(d.rider_payout)}</span></div>
        <div className="flex justify-between text-[12.5px] text-muted"><span>Platform fee</span><span>{money(d.platform_fee)}</span></div>
        <div className="flex justify-between text-[12.5px] text-muted"><span>Payment</span><span>{d.payment_method} · {d.payment_status}</span></div>
      </div>
      {d.offers.length > 0 && (
        <div>
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Dispatch offers</p>
          {d.offers.map((o, i) => (
            <div key={i} className="flex justify-between py-0.5 text-[12.5px]"><span>R{o.round} · {o.rider} · {Number(o.distance_km).toFixed(1)} km</span><span className="capitalize text-muted">{o.status}</span></div>
          ))}
        </div>
      )}
      <div><p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Timeline</p><Timeline events={d.events} /></div>
      {err && <p className="text-[12.5px] text-danger">{apiErrorMessage(err)}</p>}
      <div className="flex gap-2">
        {d.status === "pending" && d.payment_status === "paid" && (
          <button onClick={() => redispatch.mutate()} disabled={redispatch.isPending} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-hairline text-[13px] font-semibold hover:bg-mist">
            <RefreshCw size={14} className={redispatch.isPending ? "animate-spin" : ""} /> Re-dispatch
          </button>
        )}
        {!["delivered", "cancelled"].includes(d.status) && (
          <button onClick={() => { const r = window.prompt("Reason for cancelling (shown to the customer):", "Cancelled by support"); if (r !== null) cancel.mutate(r); }}
            disabled={cancel.isPending} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 text-[13px] font-semibold text-danger hover:bg-danger/5">
            <XCircle size={14} /> Cancel & refund
          </button>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Riders                                                              */
/* ------------------------------------------------------------------ */

const VER_TONE: Record<string, string> = {
  pending: "bg-warn/10 text-warn", approved: "bg-brand-green/10 text-brand-green",
  rejected: "bg-mist text-muted", suspended: "bg-danger/10 text-danger",
};

function RidersTab() {
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AdminRider | null>(null);
  const list = useQuery({ queryKey: ["dispatch", "riders", status, query], queryFn: () => dispatchAdminApi.riders({ status: status || undefined, q: query || undefined }) });
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card className="!p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-3">
          {["pending", "approved", "suspended", "rejected", ""].map((s) => (
            <button key={s || "all"} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold capitalize ${status === s ? "bg-ink text-white" : "bg-mist text-muted hover:text-ink"}`}>{s || "All"}</button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="ml-auto flex items-center gap-2 rounded-lg border border-hairline px-2.5">
            <Search size={14} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, plate" className="h-8 w-48 bg-transparent text-[13px] outline-none" />
          </form>
        </div>
        <div className="divide-y divide-hairline">
          {list.data?.results.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className={`flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-mist ${open?.id === r.id ? "bg-brand-green/5" : ""}`}>
              {r.photo_url ? <img src={r.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-white">{r.full_name[0]}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{r.full_name} <span className="ml-1 text-[12px] font-normal text-muted">{r.vehicle_label}{r.vehicle_plate ? ` · ${r.vehicle_plate}` : ""}</span></p>
                <p className="truncate text-[12px] text-muted">{r.email} · {r.phone}{r.city ? ` · ${r.city}` : ""}</p>
              </div>
              <span className="text-right text-[12px] text-muted">{r.completed_deliveries} jobs<br />★ {Number(r.rating_avg).toFixed(1)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${VER_TONE[r.verification_status]}`}>{r.verification_status}</span>
              {r.availability === "online" && <span className="h-2 w-2 rounded-full bg-brand-green" title="Online" />}
            </button>
          ))}
          {list.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted" /></div>}
          {list.data && !list.data.results.length && <p className="py-10 text-center text-[13px] text-muted">No riders here.</p>}
        </div>
      </Card>
      {open ? <RiderPanel rider={open} onChange={setOpen} onClose={() => setOpen(null)} /> : (
        <Card className="hidden items-center justify-center text-[13px] text-muted xl:flex">Select a rider to review documents.</Card>
      )}
    </div>
  );
}

function RiderPanel({ rider, onChange, onClose }: { rider: AdminRider; onChange: (r: AdminRider) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const review = useMutation({
    mutationFn: (action: "approve" | "reject" | "suspend" | "reinstate") => dispatchAdminApi.reviewRider(rider.id, action, note),
    onSuccess: (r) => { onChange(r); setNote(""); qc.invalidateQueries({ queryKey: ["dispatch"] }); },
  });
  const v = rider.verification_status;
  const btn = "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold disabled:opacity-50";
  return (
    <Card className="space-y-4 xl:sticky xl:top-[90px]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {rider.photo_url ? <img src={rider.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-[18px] font-semibold text-white">{rider.full_name[0]}</span>}
          <div>
            <p className="text-[16px] font-semibold text-ink">{rider.full_name}</p>
            <p className="text-[12.5px] text-muted">{rider.email}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${VER_TONE[v]}`}>{rider.verification_label}</span>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Close"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <Info k="Phone" v={rider.phone} /><Info k="City" v={rider.city || "—"} />
        <Info k="Vehicle" v={`${rider.vehicle_label}${rider.vehicle_description ? ` · ${rider.vehicle_description}` : ""}`} /><Info k="Plate" v={rider.vehicle_plate || "—"} />
        <Info k="Deliveries" v={String(rider.completed_deliveries)} /><Info k="Earnings" v={money(rider.total_earnings)} />
        <Info k="Rating" v={`★ ${Number(rider.rating_avg).toFixed(2)} (${rider.rating_count})`} /><Info k="Status" v={rider.availability} />
      </div>
      {rider.active_delivery && <p className="rounded-lg bg-brand-green/5 px-3 py-2 text-[12.5px] text-brand-green">On delivery {rider.active_delivery.reference}</p>}
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Documents</p>
        {rider.documents.length ? (
          <div className="grid grid-cols-2 gap-2">
            {rider.documents.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-hairline">
                {/\.pdf($|\?)/i.test(d.url)
                  ? <span className="flex h-24 items-center justify-center bg-mist text-muted"><FileText size={26} /></span>
                  : <img src={d.url} alt={d.kind_label} className="h-24 w-full object-cover transition group-hover:opacity-90" />}
                <span className="block px-2 py-1.5 text-[12px] font-semibold text-ink">{d.kind_label}</span>
              </a>
            ))}
          </div>
        ) : <p className="text-[12.5px] text-muted">No documents uploaded.</p>}
      </div>
      {rider.review_note && <p className="text-[12.5px] text-muted">Last note: “{rider.review_note}”</p>}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Note to the rider (required to reject/suspend)"
        className="w-full rounded-xl border border-hairline px-3 py-2 text-[13px] outline-none focus:border-brand-green" />
      {review.error && <p className="text-[12.5px] text-danger">{apiErrorMessage(review.error)}</p>}
      <div className="flex flex-wrap gap-2">
        {(v === "pending" || v === "rejected") && <button disabled={review.isPending} onClick={() => review.mutate("approve")} className={`${btn} bg-brand-green text-white`}><CheckCircle2 size={14} /> Approve</button>}
        {v === "pending" && <button disabled={review.isPending || !note.trim()} onClick={() => review.mutate("reject")} className={`${btn} border border-hairline text-ink`}><XCircle size={14} /> Reject</button>}
        {v === "approved" && <button disabled={review.isPending || !note.trim()} onClick={() => review.mutate("suspend")} className={`${btn} border border-danger/30 text-danger`}><ShieldOff size={14} /> Suspend</button>}
        {v === "suspended" && <button disabled={review.isPending} onClick={() => review.mutate("reinstate")} className={`${btn} bg-brand-green text-white`}><ShieldCheck size={14} /> Reinstate</button>}
      </div>
    </Card>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return <div className="rounded-lg bg-mist px-2.5 py-1.5"><p className="text-[10.5px] font-semibold uppercase text-muted">{k}</p><p className="truncate capitalize text-ink">{v}</p></div>;
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

function PricingTab() {
  const zones = useQuery({ queryKey: ["dispatch", "zones"], queryFn: dispatchAdminApi.zones });
  const circles: MapCircle[] = (zones.data ?? []).filter((z) => z.is_active).map((z) => ({ id: String(z.id), lat: Number(z.center_lat), lng: Number(z.center_lng), radiusKm: Number(z.radius_km), label: z.name }));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <SettingsCard />
        <SurgesCard zones={zones.data ?? []} />
      </div>
      <div className="space-y-4">
        <ZonesCard zones={zones.data ?? []} />
        <MapView circles={circles} route={false} height={300} fitKey={String(circles.length)} />
        <QuotePreview />
      </div>
    </div>
  );
}

const SETTING_FIELDS: { key: keyof DispatchSettings; label: string; hint?: string; type?: "bool" }[] = [
  { key: "commission_rate", label: "Commission (0–0.9)", hint: "0.2 = OAM keeps 20%" },
  { key: "default_base_fare", label: "Default base fare ₦" },
  { key: "default_per_km", label: "Default per km ₦" },
  { key: "default_per_kg", label: "Per kg over free weight ₦" },
  { key: "default_min_fare", label: "Minimum fare ₦" },
  { key: "free_weight_kg", label: "Free weight (kg)" },
  { key: "road_factor", label: "Road factor", hint: "Straight line × this" },
  { key: "round_to", label: "Round fees up to ₦" },
  { key: "max_surge", label: "Max surge ×" },
  { key: "auto_surge_enabled", label: "Auto demand surge", type: "bool" },
  { key: "search_radius_km", label: "First search radius (km)" },
  { key: "radius_step_km", label: "Radius step per round (km)" },
  { key: "max_rounds", label: "Dispatch rounds" },
  { key: "offer_batch", label: "Riders per round" },
  { key: "offer_timeout_s", label: "Offer timeout (s)" },
  { key: "location_fresh_min", label: "Location freshness (min)" },
];

function SettingsCard() {
  const q = useQuery({ queryKey: ["dispatch", "settings"], queryFn: dispatchAdminApi.settings });
  if (!q.data) return <Card className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" /></Card>;
  return <SettingsForm initial={q.data} />;
}

function SettingsForm({ initial }: { initial: DispatchSettings }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<DispatchSettings>>(initial);
  const save = useMutation({
    mutationFn: () => dispatchAdminApi.saveSettings(Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, draft[f.key]]))),
    onSuccess: (s) => { qc.setQueryData(["dispatch", "settings"], s); },
  });
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-ink">Fares & dispatch rules</p>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-semibold text-white disabled:opacity-50">
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </div>
      {save.isSuccess && <p className="mb-2 text-[12.5px] text-brand-green">Saved. New quotes use these values.</p>}
      {save.error && <p className="mb-2 text-[12.5px] text-danger">{fieldErrors(save.error)}</p>}
      <div className="grid grid-cols-2 gap-3">
        {SETTING_FIELDS.map((f) => f.type === "bool" ? (
          <label key={f.key} className="flex items-center gap-2 rounded-xl border border-hairline px-3 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={Boolean(draft[f.key])} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} className="accent-brand-green" /> {f.label}
          </label>
        ) : (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <input className={inputCls} inputMode="decimal" value={String(draft[f.key] ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
    </Card>
  );
}

function fieldErrors(err: unknown) {
  const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
  if (data && typeof data === "object") return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" · ");
  return apiErrorMessage(err);
}

const EMPTY_ZONE: Partial<Zone> = { name: "", city: "Lagos", center_lat: "", center_lng: "", radius_km: "8", base_fare: "800", per_km: "150", per_kg: "100", min_fare: "1200", zone_multiplier: "1.00", is_active: true };

function ZonesCard({ zones }: { zones: Zone[] }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Zone> | null>(null);
  const save = useMutation({ mutationFn: (z: Partial<Zone>) => dispatchAdminApi.saveZone(z), onSuccess: () => { setEdit(null); qc.invalidateQueries({ queryKey: ["dispatch", "zones"] }); } });
  const del = useMutation({ mutationFn: (id: number) => dispatchAdminApi.deleteZone(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatch", "zones"] }) });
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-ink">Delivery zones</p>
        <button onClick={() => setEdit({ ...EMPTY_ZONE })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[13px] font-semibold hover:bg-mist"><Plus size={14} /> Add zone</button>
      </div>
      <p className="mb-3 text-[12px] text-muted">The smallest active zone containing the pickup sets the fares. Outside every zone, the defaults apply.</p>
      <div className="divide-y divide-hairline">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-3 py-2 text-[13px]">
            <span className={`h-2 w-2 rounded-full ${z.is_active ? "bg-brand-green" : "bg-hairline"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{z.name} <span className="font-normal text-muted">· {Number(z.radius_km)} km</span></p>
              <p className="text-[12px] text-muted">{money(z.base_fare)} + {money(z.per_km)}/km · min {money(z.min_fare)} · ×{Number(z.zone_multiplier).toFixed(2)}</p>
            </div>
            <button onClick={() => setEdit(z)} className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-green hover:bg-mist">Edit</button>
            <button onClick={() => window.confirm(`Delete zone ${z.name}?`) && del.mutate(z.id)} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        ))}
        {!zones.length && <p className="py-4 text-center text-[12.5px] text-muted">No zones yet — defaults apply everywhere.</p>}
      </div>
      {edit && (
        <div className="mt-3 space-y-3 rounded-xl border border-hairline bg-mist p-3">
          <div className="grid grid-cols-2 gap-2">
            {([["name", "Name"], ["city", "City"], ["center_lat", "Centre latitude"], ["center_lng", "Centre longitude"], ["radius_km", "Radius (km)"], ["base_fare", "Base fare ₦"], ["per_km", "Per km ₦"], ["per_kg", "Per kg ₦"], ["min_fare", "Min fare ₦"], ["zone_multiplier", "Multiplier ×"]] as [keyof Zone, string][]).map(([k, l]) => (
              <Field key={k} label={l}><input className={inputCls} value={String(edit[k] ?? "")} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={Boolean(edit.is_active)} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} className="accent-brand-green" /> Active</label>
          {save.error && <p className="text-[12.5px] text-danger">{fieldErrors(save.error)}</p>}
          <div className="flex gap-2">
            <button onClick={() => setEdit(null)} className="h-9 flex-1 rounded-lg border border-hairline bg-paper text-[13px] font-semibold">Cancel</button>
            <button onClick={() => save.mutate(edit)} disabled={save.isPending} className="h-9 flex-1 rounded-lg bg-ink text-[13px] font-semibold text-white disabled:opacity-50">Save zone</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SurgesCard({ zones }: { zones: Zone[] }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dispatch", "surges"], queryFn: dispatchAdminApi.surges });
  const [draft, setDraft] = useState<{ zone: string; multiplier: string; reason: string; hours: string }>({ zone: "", multiplier: "1.5", reason: "", hours: "2" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dispatch", "surges"] });
  const create = useMutation({
    mutationFn: () => dispatchAdminApi.saveSurge({
      zone: draft.zone ? Number(draft.zone) : null, multiplier: draft.multiplier, reason: draft.reason,
      ends_at: draft.hours ? new Date(Date.now() + Number(draft.hours) * 3600_000).toISOString() : null,
    } as Partial<Surge>),
    onSuccess: () => { setDraft({ ...draft, reason: "" }); refresh(); },
  });
  const toggle = useMutation({ mutationFn: (s: Surge) => dispatchAdminApi.saveSurge({ id: s.id, is_active: !s.is_active }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (id: number) => dispatchAdminApi.deleteSurge(id), onSuccess: refresh });
  return (
    <Card>
      <p className="mb-1 text-[14px] font-semibold text-ink">Surge pricing</p>
      <p className="mb-3 text-[12px] text-muted">Manual surges stack with auto demand surge — the higher one wins, capped at max surge.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={draft.zone} onChange={(e) => setDraft({ ...draft, zone: e.target.value })} className={inputCls}>
          <option value="">All areas</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input className={inputCls} value={draft.multiplier} onChange={(e) => setDraft({ ...draft, multiplier: e.target.value })} placeholder="× 1.5" aria-label="Multiplier" />
        <input className={inputCls} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Reason (Rain…)" aria-label="Reason" />
        <select value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} className={inputCls} aria-label="Duration">
          {["1", "2", "4", "8", "24"].map((h) => <option key={h} value={h}>{h} h</option>)}
          <option value="">Until turned off</option>
        </select>
      </div>
      {create.error && <p className="mt-2 text-[12.5px] text-danger">{fieldErrors(create.error)}</p>}
      <button onClick={() => create.mutate()} disabled={create.isPending} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-warn px-3 text-[13px] font-semibold text-white disabled:opacity-50"><Zap size={14} /> Start surge</button>
      <div className="mt-3 divide-y divide-hairline">
        {q.data?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 py-2 text-[13px]">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${s.is_live ? "bg-warn/15 text-warn" : "bg-mist text-muted"}`}>×{Number(s.multiplier).toFixed(2)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{s.zone_name}{s.reason ? ` · ${s.reason}` : ""}</p>
              <p className="text-[11.5px] text-muted">{s.is_live ? "Live" : s.is_active ? "Scheduled/ended" : "Off"}{s.ends_at ? ` · until ${new Date(s.ends_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            </div>
            <button onClick={() => toggle.mutate(s)} className="rounded-lg px-2 py-1 text-[12.5px] font-semibold text-brand-green hover:bg-mist">{s.is_active ? "Turn off" : "Turn on"}</button>
            <button onClick={() => del.mutate(s.id)} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Delete"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuotePreview() {
  const [v, setV] = useState({ pickup_lat: "6.4281", pickup_lng: "3.4219", dropoff_lat: "6.4550", dropoff_lng: "3.3941", weight_kg: "1", package_category: "small" });
  const run = useMutation({ mutationFn: () => dispatchAdminApi.quotePreview({ ...v, pickup_lat: Number(v.pickup_lat), pickup_lng: Number(v.pickup_lng), dropoff_lat: Number(v.dropoff_lat), dropoff_lng: Number(v.dropoff_lng), package_category: v.package_category as never }) });
  return (
    <Card>
      <p className="mb-3 text-[14px] font-semibold text-ink">Try a route</p>
      <div className="grid grid-cols-2 gap-2">
        {(["pickup_lat", "pickup_lng", "dropoff_lat", "dropoff_lng", "weight_kg"] as const).map((k) => (
          <Field key={k} label={k.replace("_", " ")}><input className={inputCls} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
        ))}
        <Field label="category">
          <select className={inputCls} value={v.package_category} onChange={(e) => setV({ ...v, package_category: e.target.value })}>
            {["documents", "small", "medium", "large", "food", "fragile"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <button onClick={() => run.mutate()} disabled={run.isPending} className="mt-3 h-9 rounded-lg border border-hairline px-3 text-[13px] font-semibold hover:bg-mist">Calculate</button>
      {run.error && <p className="mt-2 text-[12.5px] text-danger">{apiErrorMessage(run.error)}</p>}
      {run.data && (
        <div className="mt-3 rounded-xl bg-mist p-3">
          <FeeBreakdown q={run.data} />
          <p className="mt-2 text-[12px] text-muted">Zone: {run.data.zone_name || "defaults"} · rider gets {money(run.data.rider_payout)} · OAM {money(run.data.platform_fee)}</p>
        </div>
      )}
    </Card>
  );
}
