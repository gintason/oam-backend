import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, Check, Crosshair, Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import AppHeader from "../AppHeader";
import { money } from "../../lib/format";
import { currentPosition, loadLeaflet, reverseGeocode, searchPlaces, LAGOS, type PlaceHit } from "../../lib/maps";
import { STATUS_LABEL, STATUS_STEPS, type DeliveryStatus, type Place, type Quote, type TimelineEvent } from "../../services/deliveries";

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { to: "/deliveries/new", label: "Send a package" },
  { to: "/deliveries", label: "My deliveries", end: true },
];

export function DeliveriesShell({ children, wide = false, tabs = true }: { children: ReactNode; wide?: boolean; tabs?: boolean }) {
  return (
    <div className="min-h-screen bg-mist pb-24 md:pb-10">
      <AppHeader />
      {tabs && (
        <div className="sticky top-[65px] z-30 border-b border-hairline bg-paper/95 backdrop-blur">
          <nav className={`mx-auto flex items-center gap-1 overflow-x-auto px-3 sm:px-5 ${wide ? "max-w-7xl" : "max-w-5xl"}`} aria-label="Deliveries">
            <Link to="/dashboard" className="mr-2 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-hairline py-3 pr-4 text-[13px] font-semibold text-brand-green transition hover:text-ink">
              <ArrowLeft size={15} strokeWidth={2} /> Back to Dashboard
            </Link>
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end ?? false}
                className={({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition ${
                  isActive ? "border-brand-green text-ink" : "border-transparent text-muted hover:text-ink"}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
      <main className={`mx-auto px-3 py-5 sm:px-5 sm:py-6 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-hairline bg-paper p-4 sm:p-5 ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const TONE: Record<DeliveryStatus, string> = {
  pending: "bg-warn/10 text-warn border-warn/20",
  accepted: "bg-brand-green/10 text-brand-green border-brand-green/20",
  picked_up: "bg-brand-green/10 text-brand-green border-brand-green/20",
  in_transit: "bg-brand-green/15 text-brand-green border-brand-green/30",
  delivered: "bg-brand-green text-white border-brand-green",
  cancelled: "bg-mist text-muted border-hairline",
};

export function DeliveryStatusPill({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Horizontal progress: Finding → Accepted → Picked up → On the way → Delivered. */
export function StatusStepper({ status }: { status: DeliveryStatus }) {
  if (status === "cancelled") return null;
  const at = STATUS_STEPS.indexOf(status);
  const short: Record<string, string> = { pending: "Matching", accepted: "Accepted", picked_up: "Picked up", in_transit: "On the way", delivered: "Delivered" };
  return (
    <ol className="flex items-center" aria-label="Delivery progress">
      {STATUS_STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition ${
              i < at || status === "delivered" ? "border-brand-green bg-brand-green text-white"
                : i === at ? "border-brand-green bg-paper text-brand-green" : "border-hairline bg-paper text-muted"}`}>
              {i < at || status === "delivered" ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className={`whitespace-nowrap text-[10.5px] font-semibold ${i <= at ? "text-ink" : "text-muted"}`}>{short[s]}</span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <span className={`mx-1 mb-4 h-0.5 flex-1 rounded ${i < at ? "bg-brand-green" : "bg-hairline"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative ml-2 border-l border-hairline">
      {[...events].reverse().map((e, i) => (
        <li key={i} className="mb-4 ml-4 last:mb-0">
          <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-brand-green" : "bg-hairline"}`} />
          <p className="text-[13px] font-semibold text-ink">{e.note || e.status_label}</p>
          <p className="text-[11.5px] text-muted">
            {new Date(e.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Fee breakdown                                                       */
/* ------------------------------------------------------------------ */

type Fees = Pick<Quote, "base_fare" | "distance_fare" | "weight_fare" | "zone_multiplier" | "category_multiplier" | "surge_multiplier" | "fee" | "currency"> & {
  distance_km: string; duration_min?: number; surge_reason?: string; min_fare_applied?: boolean;
};

export function FeeBreakdown({ q }: { q: Fees }) {
  const ccy = q.currency || "NGN";
  const row = (label: ReactNode, value: ReactNode, muted = false) => (
    <div className={`flex items-center justify-between py-1.5 text-[13.5px] ${muted ? "text-muted" : "text-ink"}`}>
      <span>{label}</span><span className="font-medium tabular-nums">{value}</span>
    </div>
  );
  const mult = (v: string) => Number(v) !== 1;
  return (
    <div>
      {row("Base fare", money(q.base_fare, ccy))}
      {row(`Distance · ${Number(q.distance_km).toFixed(1)} km`, money(q.distance_fare, ccy))}
      {Number(q.weight_fare) > 0 && row("Extra weight", money(q.weight_fare, ccy))}
      {mult(q.zone_multiplier) && row("Area adjustment", `×${Number(q.zone_multiplier).toFixed(2)}`, true)}
      {mult(q.category_multiplier) && row("Package handling", `×${Number(q.category_multiplier).toFixed(2)}`, true)}
      {mult(q.surge_multiplier) && row(
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded bg-warn/10 px-1.5 py-0.5 text-[11px] font-bold text-warn">SURGE</span>
          {q.surge_reason || "Busy period"}
        </span>, `×${Number(q.surge_multiplier).toFixed(2)}`, true)}
      {q.min_fare_applied && row("Minimum fare applied", "", true)}
      <div className="mt-2 flex items-center justify-between border-t border-hairline pt-3">
        <span className="text-[14px] font-semibold text-ink">Total{q.duration_min ? <span className="ml-2 text-[12px] font-normal text-muted">≈ {q.duration_min} min</span> : null}</span>
        <span className="font-display text-[22px] font-semibold text-ink tabular-nums">{money(q.fee, ccy)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

export type MapMarker = { id: string; lat: number; lng: number; kind: "pickup" | "dropoff" | "rider" | "rider-busy" | "point"; label?: string };
export type MapCircle = { id: string; lat: number; lng: number; radiusKm: number; label?: string };

const PIN_COLOR = { pickup: "#0B7327", dropoff: "#E31012", rider: "#111111", "rider-busy": "#B45309", point: "#6B7280" };

function pinIcon(L: any, kind: MapMarker["kind"]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const c = PIN_COLOR[kind];
  const isRider = kind.startsWith("rider");
  const html = isRider
    ? `<div style="width:30px;height:30px;border-radius:50%;background:${c};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:700 13px system-ui">🛵</div>`
    : `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${c};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`;
  return L.divIcon({ html, className: "", iconSize: isRider ? [30, 30] : [26, 26], iconAnchor: isRider ? [15, 15] : [13, 26] });
}

/**
 * Leaflet map. Markers/circles are diffed by id, so a moving rider glides
 * instead of the whole map re-rendering. `onPick` makes the map clickable.
 */
export function MapView({
  markers = [], circles = [], route = true, height = 320, onPick, fitKey, className = "",
}: {
  markers?: MapMarker[]; circles?: MapCircle[]; route?: boolean; height?: number | string;
  onPick?: (lat: number, lng: number) => void; fitKey?: string; className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const layers = useRef<{ L: any; markers: Map<string, any>; circles: any[]; line: any }>({ L: null, markers: new Map(), circles: [], line: null }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pickRef = useRef(onPick);
  useEffect(() => { pickRef.current = onPick; });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastFit = useRef<string | undefined>(undefined);
  const fitPts = useRef<number[][]>([]);

  const fit = () => {
    const m = map.current; const pts = fitPts.current;
    if (!m) return;
    if (pts.length === 1) m.setView(pts[0], 15);
    else if (pts.length > 1) m.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  };
  const fitRef = useRef(fit);
  useEffect(() => { fitRef.current = fit; });

  useEffect(() => {
    let alive = true;
    const store = layers.current.markers;
    loadLeaflet().then((L) => {
      if (!alive || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([LAGOS.lat, LAGOS.lng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap",
      }).addTo(m);
      m.on("click", (e: any) => pickRef.current?.(e.latlng.lat, e.latlng.lng)); // eslint-disable-line @typescript-eslint/no-explicit-any
      map.current = m;
      layers.current.L = L;
      // The container can change size (step changes, sidebars): keep tiles + framing right.
      const ro = new ResizeObserver(() => { m.invalidateSize(); fitRef.current(); });
      ro.observe(el.current);
      m.once("unload", () => ro.disconnect());
      setReady(true);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; map.current?.remove(); map.current = null; store.clear(); };
  }, []);

  useEffect(() => {
    const m = map.current; const { L } = layers.current;
    if (!ready || !m || !L) return;
    const store = layers.current.markers;
    const seen = new Set<string>();
    for (const mk of markers) {
      if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
      seen.add(mk.id);
      const existing = store.get(mk.id);
      if (existing) {
        existing.setLatLng([mk.lat, mk.lng]);
        existing.setIcon(pinIcon(L, mk.kind));
      } else {
        const marker = L.marker([mk.lat, mk.lng], { icon: pinIcon(L, mk.kind) }).addTo(m);
        if (mk.label) marker.bindTooltip(mk.label, { direction: "top", offset: [0, -24] });
        store.set(mk.id, marker);
      }
    }
    for (const [id, marker] of store) if (!seen.has(id)) { marker.remove(); store.delete(id); }

    layers.current.circles.forEach((c) => c.remove());
    layers.current.circles = circles.map((c) => {
      const circle = L.circle([c.lat, c.lng], { radius: c.radiusKm * 1000, color: "#0B7327", weight: 1.5, fillOpacity: 0.06 }).addTo(m);
      if (c.label) circle.bindTooltip(c.label);
      return circle;
    });

    layers.current.line?.remove();
    const p = markers.find((x) => x.kind === "pickup"); const d = markers.find((x) => x.kind === "dropoff");
    layers.current.line = route && p && d
      ? L.polyline([[p.lat, p.lng], [d.lat, d.lng]], { color: "#111", weight: 3, dashArray: "6 8", opacity: 0.6 }).addTo(m)
      : null;

    const key = fitKey ?? markers.map((x) => x.id).join("|") + circles.length;
    fitPts.current = [...markers.map((x) => [x.lat, x.lng]), ...circles.map((c) => [c.lat, c.lng])].filter((x) => Number.isFinite(x[0]));
    if (key !== lastFit.current) {
      lastFit.current = key;
      fitRef.current();
    }
  }, [ready, markers, circles, route, fitKey]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-hairline bg-mist ${className}`} style={{ height }}>
      <div ref={el} className="absolute inset-0 z-0" />
      {!ready && !failed && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-muted" size={20} /></div>}
      {failed && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-muted">The map couldn't load. You can still search addresses.</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Location picker                                                     */
/* ------------------------------------------------------------------ */

export function LocationPicker({
  label, kind, value, onChange, near, active, onFocus,
}: {
  label: string; kind: "pickup" | "dropoff"; value: Place | null; onChange: (p: Place | null) => void;
  near?: { lat: number; lng: number }; active?: boolean; onFocus?: () => void;
}) {
  const [text, setText] = useState(value?.address ?? "");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  // Follow outside changes (map pin, GPS) — React's "adjust state on prop change" pattern.
  const [shownAddress, setShownAddress] = useState(value?.address);
  if (value?.address !== shownAddress) {
    setShownAddress(value?.address);
    if (value?.address) setText(value.address);
  }

  const searching = open && text.trim().length >= 3 && text !== value?.address;
  useEffect(() => {
    if (!searching) return;
    const id = window.setTimeout(async () => {
      setBusy("search");
      try { setHits(await searchPlaces(text, near)); } catch { setHits([]); } finally { setBusy(null); }
    }, 650);
    return () => window.clearTimeout(id);
  }, [text, searching, near]);

  async function useGps() {
    setErr(""); setBusy("gps");
    try {
      const pos = await currentPosition();
      onChange({ ...pos, address: await reverseGeocode(pos.lat, pos.lng) });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  const dot = kind === "pickup" ? "bg-brand-green" : "bg-brand-red";
  return (
    <div className={`relative rounded-xl border bg-paper transition ${active ? "border-brand-green ring-2 ring-brand-green/15" : "border-hairline"}`}>
      <label className="flex items-center gap-3 px-3.5 pt-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {label}
      </label>
      <div className="flex items-center gap-2 px-3.5 pb-2.5">
        <Search size={15} className="shrink-0 text-muted" />
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); if (value) onChange(null); }}
          onFocus={() => { setOpen(true); onFocus?.(); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder={kind === "pickup" ? "Where should the rider collect it?" : "Where is it going?"}
          className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          aria-label={label}
        />
        {busy === "search" && <Loader2 size={15} className="animate-spin text-muted" />}
        {value && <Check size={16} className="text-brand-green" aria-label="Location set" />}
        {text && (
          <button type="button" onClick={() => { setText(""); onChange(null); }} className="rounded p-1 text-muted hover:bg-mist" aria-label="Clear">
            <X size={14} />
          </button>
        )}
        {kind === "pickup" && (
          <button type="button" onClick={useGps} title="Use my location" aria-label="Use my location"
            className="rounded-lg border border-hairline p-1.5 text-brand-green transition hover:bg-brand-green/5">
            {busy === "gps" ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
          </button>
        )}
      </div>
      {err && <p className="px-3.5 pb-2 text-[12px] text-danger">{err}</p>}
      {searching && hits.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-hairline bg-paper py-1 shadow-lg">
          {hits.map((h, i) => (
            <li key={i}>
              <button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(h); setText(h.address); setHits([]); setOpen(false); }}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-ink hover:bg-mist">
                <MapPin size={15} className="mt-0.5 shrink-0 text-muted" /> {h.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {active && !value && (
        <p className="flex items-center gap-1.5 border-t border-hairline px-3.5 py-2 text-[12px] text-muted">
          <Navigation size={12} /> Or tap the map to drop the pin.
        </p>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "h-11 w-full rounded-xl border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-brand-green focus:ring-2 focus:ring-brand-green/15";
