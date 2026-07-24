import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, KeyRound, Loader2, Receipt, RefreshCw, Smartphone, Tv, Wifi, Zap } from "lucide-react";
import AppHeader from "../components/AppHeader";
import TokenCard from "../components/TokenCard";
import { useUserScope } from "../auth/useUserScope";
import { useAuth } from "../auth/AuthContext";
import { billingApi, type BillOrder } from "../services/billing";

const ICONS: Record<string, React.ReactNode> = {
  airtime: <Smartphone size={17} strokeWidth={1.75} />,
  data: <Wifi size={17} strokeWidth={1.75} />,
  electricity: <Zap size={17} strokeWidth={1.75} />,
  cable: <Tv size={17} strokeWidth={1.75} />,
};

/**
 * Order history — the permanent home for every purchase, and crucially the
 * place a customer can always come back to for an electricity TOKEN.
 */
export default function Orders() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["bill-orders", scope],
    queryFn: billingApi.getOrders,
    enabled: isVerified,
    refetchInterval: (q) => {
      // Keep polling briefly if anything is still processing (tokens arrive late)
      const rows = (q.state.data?.results ?? []) as BillOrder[];
      return rows.some((o) => ["pending", "processing"].includes(o.status)) ? 5000 : false;
    },
  });

  const orders = ordersQuery.data?.results ?? [];

  /** Still waiting on the provider for a status or a token. */
  const unsettled = (o: BillOrder) =>
    ["pending", "processing"].includes(String(o.status).toLowerCase()) ||
    (String(o.status).toLowerCase() === "success" &&
      o.category === "electricity" &&
      o.meter_type !== "postpaid" &&
      !o.token);

  const outstanding = orders.filter(unsettled).length;

  // Ask the PROVIDER for updates — a plain refetch only re-reads our own
  // database, which is why tokens appeared to never arrive.
  const refresh = useMutation({
    mutationFn: billingApi.refreshOrders,
    onSuccess: () => ordersQuery.refetch(),
    onError: () => ordersQuery.refetch(),
  });

  // While anything is outstanding, chase it automatically every 12s.
  useEffect(() => {
    if (outstanding === 0) return;
    const t = setInterval(() => {
      if (!refresh.isPending) refresh.mutate();
    }, 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstanding]);

  // Open the newest order that either holds a token or is still being
  // delivered, so nobody has to guess that details are hidden behind a tap.
  useEffect(() => {
    if (autoOpened || orders.length === 0) return;
    const notable = orders.find(
      (o) => o.token || ["pending", "processing"].includes(String(o.status).toLowerCase())
    );
    if (notable) setOpenRef(notable.reference);
    setAutoOpened(true);
  }, [orders, autoOpened]);

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Order history</h1>
            <p className="mt-1 text-[14px] text-muted">Every purchase, including your electricity tokens.</p>
          </div>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[13px] font-medium text-ink transition hover:bg-mist disabled:opacity-60"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={refresh.isPending || ordersQuery.isFetching ? "animate-spin" : ""} />
            {refresh.isPending ? "Checking…" : "Refresh"}
          </button>
        </div>

        {outstanding > 0 && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3">
            <Loader2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 animate-spin text-warn" />
            <p className="text-[12.5px] leading-relaxed text-ink">
              <span className="font-semibold">
                {outstanding} order{outstanding > 1 ? "s" : ""} still completing.
              </span>{" "}
              We're checking with your provider every few seconds — your token appears
              here the moment it's issued. You can also tap Refresh. No need to buy again.
            </p>
          </div>
        )}

        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-hairline/50" />)}
          </div>
        ) : ordersQuery.isError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-8 text-center">
            <p className="text-[14px] text-ink">Couldn't load your orders.</p>
            <button onClick={() => ordersQuery.refetch()} className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-[13px] font-medium text-white">Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-paper p-12 text-center">
            <Receipt size={26} strokeWidth={1.5} className="mx-auto text-muted" />
            <h2 className="mt-3 text-[15px] font-semibold text-ink">No orders yet</h2>
            <p className="mt-1 text-[13px] text-muted">Your purchases will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => {
              const open = openRef === o.reference;
              const ok = o.status === "success";
              return (
                <li key={o.id} className="overflow-hidden rounded-xl border border-hairline bg-paper">
                  <button
                    onClick={() => setOpenRef(open ? null : o.reference)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-mist"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ok ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}>
                      {ICONS[o.category] ?? <Receipt size={17} strokeWidth={1.75} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-ink">
                        {o.biller_name} · {o.recipient}
                      </p>
                      <p className="text-[11.5px] text-muted">
                        {new Date(o.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        <span className={ok ? "text-brand-green" : o.status === "failed" ? "text-danger" : "text-warn"}>{o.status}</span>
                      </p>

                      {o.token && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-green/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-green">
                          <KeyRound size={10} strokeWidth={2.5} />
                          TOKEN READY — {open ? "shown below" : "tap to view"}
                        </span>
                      )}
                      {!o.token && o.category === "electricity" && o.meter_type !== "postpaid" &&
                        ["pending", "processing"].includes(String(o.status).toLowerCase()) && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-warn/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-warn">
                          <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
                          TOKEN ON THE WAY
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 tabular text-[13.5px] font-semibold text-ink">
                      ₦{Number(o.amount).toLocaleString()}
                    </span>
                    <ChevronRight size={16} className={`shrink-0 text-muted transition ${open ? "rotate-90" : ""}`} />
                  </button>

                  {open && (
                    <div className="border-t border-hairline bg-mist/40 px-4 py-4">
                      {o.token ? (
                        <div className="mb-4">
                          <TokenCard token={o.token} units={o.units} />
                        </div>
                      ) : o.category === "electricity" && o.meter_type !== "postpaid" ? (
                        <div className="mb-4 rounded-xl border border-warn/30 bg-warn/5 p-3.5 text-center">
                          <Loader2 size={18} strokeWidth={2} className="mx-auto animate-spin text-warn" />
                          <p className="mt-2 text-[12.5px] font-medium text-ink">
                            {["pending", "processing"].includes(String(o.status).toLowerCase())
                              ? "Your token is being issued"
                              : "Waiting for your token"}
                          </p>
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                            It appears here automatically — this page refreshes itself.
                            Your provider usually issues it within a few minutes.
                          </p>
                        </div>
                      ) : null}
                      <dl className="space-y-1.5 text-[12.5px]">
                        {o.customer_name && <Row label="Customer" value={o.customer_name} />}
                        <Row label="Service" value={o.category} />
                        {o.meter_type && <Row label="Meter type" value={o.meter_type} />}
                        <Row label="Paid with" value={o.pay_with} />
                        <Row label="Reference" value={o.reference} mono />
                        {o.provider_reference && <Row label="Provider ref" value={o.provider_reference} mono />}
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? "font-mono text-[11px]" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
