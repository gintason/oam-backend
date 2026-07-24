import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Loader2, Star, Check, MessagesSquare, Package,
  RefreshCw, AlertCircle,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { DarkPanel, Card, Stat, SectionTitle } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { marketplaceApi, SELLER_TIERS } from "../../services/marketplace";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";
import { naira, friendlyTime } from "../../lib/format";

export default function SellDashboard() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState<string>();
  const [pendingTier, setPendingTier] = useState<"premium" | "pro" | null>(null);

  const sub = useQuery({
    queryKey: ["marketplace", scope, "subscription"],
    queryFn: marketplaceApi.subscription,
  });

  const mine = useQuery({
    queryKey: ["marketplace", scope, "mine"],
    queryFn: marketplaceApi.mine,
  });

  const enquiries = useQuery({
    queryKey: ["messaging", scope, "list", "provider"],
    queryFn: () => messagingApi.list("provider"),
    refetchInterval: 30000,
  });
  const listingEnquiries = (enquiries.data?.results ?? []).filter((c) => c.kind === "listing");
  const awaiting = listingEnquiries.filter((c) => c.status === "open").length;

  const subscribe = useMutation({
    mutationFn: (tier: "premium" | "pro") => marketplaceApi.subscribe(tier),
    onSuccess: (data) => { window.location.href = data.authorization_url; },
    onError: (err) => {
      setPendingTier(null);
      setError(apiErrorMessage(err, "Couldn't start that payment."));
    },
  });

  const renew = useMutation({
    mutationFn: (id: string) => marketplaceApi.renew(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace"] }),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't renew that listing.")),
  });

  // Returning from Paystack.
  const ref = params.get("reference") || params.get("trxref");
  const verify = useQuery({
    queryKey: ["market-sub-verify", ref],
    queryFn: () => marketplaceApi.verify(ref!),
    enabled: Boolean(ref),
    retry: 1,
  });
  useEffect(() => {
    if (verify.isSuccess) {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      setParams({}, { replace: true });
    }
  }, [verify.isSuccess]);

  const s = sub.data;
  const listings = mine.data?.results ?? [];
  const limit = s?.listing_limit ?? null;
  const used = s?.active_listings ?? listings.length;
  const atLimit = limit !== null && used >= limit;
  const currentTier = s?.active_tier ?? "free";

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/marketplace")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Marketplace
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
                  Selling
                </h1>
                <p className="mt-1 text-[13.5px] text-white/60">
                  Your listings, enquiries and plan.
                </p>
              </div>
              <Link
                to="/marketplace/post"
                onClick={(e) => atLimit && e.preventDefault()}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-semibold transition ${
                  atLimit
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-brand-red text-white hover:brightness-110"
                }`}
              >
                <Plus size={16} strokeWidth={2} /> Post an item
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
              <Stat
                label="Plan"
                value={currentTier === "free" ? "Free" : currentTier === "premium" ? "Premium" : "Pro"}
                hint={s?.expires_at && currentTier !== "free"
                  ? `until ${friendlyTime(s.expires_at)}` : undefined}
                tone={currentTier === "free" ? "default" : "good"}
              />
              <Stat
                label="Listings"
                value={`${used}${limit === null ? "" : ` / ${limit}`}`}
                hint={limit === null ? "unlimited" : atLimit ? "limit reached" : "active"}
                tone={atLimit ? "warn" : "default"}
              />
              <Stat
                label="Enquiries"
                value={listingEnquiries.length}
                hint={awaiting > 0 ? `${awaiting} awaiting reply` : "all answered"}
                tone={awaiting > 0 ? "warn" : "default"}
              />
            </div>
          </div>
        </DarkPanel>

        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

        {verify.isSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3.5">
            <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-[13px] text-ink">
              <span className="font-semibold">Plan updated.</span> Your new listing
              allowance is active.
            </p>
          </div>
        )}

        {atLimit && (
          <Card className="mb-4 flex items-start gap-2 border-danger/25 bg-danger/5 p-4">
            <AlertCircle size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[12.5px] leading-relaxed text-danger">
              You've used all {limit} listings on the {currentTier} plan. Upgrade below,
              or remove a listing to post something new.
            </p>
          </Card>
        )}

        {/* upgrade */}
        {currentTier !== "pro" && (
          <Card className="mt-4 p-5">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              {currentTier === "free" ? "List more, sell more" : "Go unlimited"}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              Paid plans also give your listings featured placement, which puts them
              above free listings in search.
            </p>

            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
              {SELLER_TIERS.map((t) => {
                const isCurrent = t.key === currentTier;
                const isDowngrade =
                  (currentTier === "premium" && t.key === "free") ||
                  (currentTier === "pro" && t.key !== "pro");
                return (
                  <div
                    key={t.key}
                    className={`rounded-xl border-2 p-3.5 ${
                      isCurrent ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper"
                    }`}
                  >
                    <p className="text-[13.5px] font-bold text-ink">{t.label}</p>
                    <p className="mt-0.5 tabular text-[17px] font-bold text-ink">
                      {t.price === 0 ? "Free" : naira(t.price)}
                      {t.price > 0 && <span className="text-[11px] font-medium text-muted">/mo</span>}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-1 text-[11.5px] leading-snug text-muted">
                          <Check size={10} strokeWidth={3} className="mt-1 shrink-0 text-brand-green" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <p className="mt-2.5 text-center text-[12px] font-semibold text-brand-green">
                        Current plan
                      </p>
                    ) : isDowngrade || t.key === "free" ? null : (
                      <button
                        onClick={() => {
                          const tier = t.key as "premium" | "pro";
                          setPendingTier(tier);
                          subscribe.mutate(tier);
                        }}
                        disabled={subscribe.isPending}
                        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-red text-[12.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                      >
                        {pendingTier === t.key ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          `Choose ${t.label}`
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* enquiries */}
        <Link
          to="/messages"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <MessagesSquare size={18} strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-ink">
              {listingEnquiries.length} buyer enquir{listingEnquiries.length === 1 ? "y" : "ies"}
            </p>
            <p className="text-[12.5px] text-muted">
              {awaiting > 0 ? `${awaiting} waiting for your reply` : "Nothing needs your attention"}
            </p>
          </div>
          {awaiting > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-red px-2 text-[12px] font-bold text-white">
              {awaiting}
            </span>
          )}
        </Link>

        {/* listings */}
        <section className="mt-4">
          <SectionTitle>My listings</SectionTitle>

          {mine.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : listings.length === 0 ? (
            <Card className="py-12 text-center">
              <Package size={26} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-2.5 text-[14px] font-medium text-ink">Nothing listed yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted">
                Your first three listings are free. Photos and an honest description
                sell far faster than a low price alone.
              </p>
              <Link to="/marketplace/post"
                    className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white transition hover:brightness-95">
                <Plus size={15} strokeWidth={2} /> Post an item
              </Link>
            </Card>
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
              {listings.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-3.5">
                  <Link to={`/marketplace/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-mist">
                      {l.primary_image
                        ? <img src={l.primary_image} alt="" className="h-full w-full object-cover" />
                        : <span className="flex h-full items-center justify-center">
                            <Package size={17} strokeWidth={1.5} className="text-muted" />
                          </span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-ink">{l.title}</p>
                      <p className="tabular text-[13px] font-semibold text-brand-red">
                        {naira(l.price)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {friendlyTime(l.created_at)}
                        {l.is_featured && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-warn">
                            <Star size={8} strokeWidth={3} /> featured
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => renew.mutate(l.id)}
                    disabled={renew.isPending}
                    title="Renew this listing"
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-hairline bg-paper px-2.5 text-[12px] font-medium text-muted transition hover:bg-mist hover:text-ink disabled:opacity-60"
                  >
                    <RefreshCw size={12} strokeWidth={2}
                               className={renew.isPending ? "animate-spin" : ""} />
                    Renew
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
