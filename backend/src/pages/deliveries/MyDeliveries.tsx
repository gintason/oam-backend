import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Bike, ChevronRight, Loader2, PackageSearch, ShieldCheck } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { money } from "../../lib/format";
import { deliveriesApi, type DeliveryListItem } from "../../services/deliveries";
import { Card, DeliveriesShell, DeliveryStatusPill } from "../../components/deliveries/ui";

/** /deliveries — active deliveries first, then history. */
export default function MyDeliveries() {
  const { user } = useAuth();
  const isStaff = Boolean((user as { is_staff?: boolean; is_superuser?: boolean } | null)?.is_staff
    || (user as { is_superuser?: boolean } | null)?.is_superuser);
  const [page, setPage] = useState(1);
  const active = useQuery({ queryKey: ["deliveries", "list", "active"], queryFn: () => deliveriesApi.list({ state: "active" }), refetchInterval: 15000 });
  const past = useQuery({ queryKey: ["deliveries", "list", "past", page], queryFn: () => deliveriesApi.list({ state: "past", page }) });

  return (
    <DeliveriesShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">My deliveries</h1>
          <p className="text-[13px] text-muted">Track packages in progress and see past sends.</p>
        </div>
        <div className="flex gap-2">
          {isStaff && (
            <Link to="/admin/dispatch" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3.5 text-[13px] font-semibold text-ink hover:bg-mist">
              <ShieldCheck size={15} /> Dispatch admin
            </Link>
          )}
          <Link to="/deliveries/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-red px-4 text-[13.5px] font-semibold text-white hover:bg-brand-red/90">
            <Bike size={16} /> Send a package
          </Link>
        </div>
      </div>

      {active.data && active.data.results.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-muted">In progress</h2>
          <div className="space-y-2">{active.data.results.map((d) => <Row key={d.id} d={d} highlight />)}</div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-muted">History</h2>
        {past.isLoading || active.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted" /></div>
        ) : past.data && past.data.results.length > 0 ? (
          <>
            <div className="space-y-2">{past.data.results.map((d) => <Row key={d.id} d={d} />)}</div>
            {(past.data.next || page > 1) && (
              <div className="mt-4 flex justify-center gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-9 rounded-lg border border-hairline bg-paper px-3 text-[13px] disabled:opacity-40">Previous</button>
                <button disabled={!past.data.next} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-hairline bg-paper px-3 text-[13px] disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        ) : !active.data?.results.length ? (
          <Card className="py-10 text-center">
            <PackageSearch size={28} className="mx-auto text-muted" />
            <p className="mt-3 font-display text-[16px] font-semibold text-ink">No deliveries yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-muted">Send documents, food or parcels across town — a nearby rider picks it up in minutes.</p>
            <Link to="/deliveries/new" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-green hover:underline">Send your first package <ArrowRight size={15} /></Link>
          </Card>
        ) : (
          <p className="text-[13px] text-muted">Finished deliveries will show here.</p>
        )}
      </section>
    </DeliveriesShell>
  );
}

function Row({ d, highlight = false }: { d: DeliveryListItem; highlight?: boolean }) {
  return (
    <Link to={`/deliveries/${d.id}`}
      className={`flex items-center gap-3 rounded-2xl border bg-paper p-3.5 transition hover:shadow-sm ${highlight ? "border-brand-green/30" : "border-hairline"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${highlight ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}><Bike size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-ink">To {d.recipient_name}</p>
          <DeliveryStatusPill status={d.status} />
        </div>
        <p className="truncate text-[12.5px] text-muted">{d.dropoff_address}</p>
        <p className="text-[11.5px] text-muted">
          {d.reference} · {new Date(d.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}{d.rider_name ? ` · ${d.rider_name}` : ""}
        </p>
      </div>
      <span className="text-right">
        <span className="block text-[14px] font-semibold text-ink tabular-nums">{money(d.fee, d.currency)}</span>
      </span>
      <ChevronRight size={16} className="text-muted" />
    </Link>
  );
}
