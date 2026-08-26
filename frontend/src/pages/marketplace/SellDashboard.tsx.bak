import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Loader2, Star, Check, MessagesSquare, Package,
  RefreshCw, AlertCircle, Pencil, Trash2,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import VerifiedBadge from "../../components/VerifiedBadge";
import { DarkPanel, Card, Stat, SectionTitle } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { marketplaceApi, SELLER_TIERS } from "../../services/marketplace";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";
import { naira, friendlyTime } from "../../lib/format";
import { useTranslation } from "react-i18next";

export default function SellDashboard() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const { t } = useTranslation();
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
      setError(apiErrorMessage(err, t("marketplace.sell.errPayment")));
    },
  });

  const renew = useMutation({
    mutationFn: (id: string) => marketplaceApi.renew(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace"] }),
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.sell.errRenew"))),
  });

  const remove = useMutation({
    mutationFn: (id: string) => marketplaceApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace"] }),
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.sell.errDelete"))),
  });

  function onDelete(id: string) {
    if (window.confirm(t("marketplace.sell.deleteConfirm"))) remove.mutate(id);
  }

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
          <ArrowLeft size={15} strokeWidth={1.75} /> {t("marketplace.navMarketplace")}
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
                  {t("marketplace.sell.heading")}
                </h1>
                <p className="mt-1 text-[13.5px] text-white/60">
                  {t("marketplace.sell.subtitle")}
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
                <Plus size={16} strokeWidth={2} /> {t("marketplace.postItem")}
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
              <Stat
                label={t("marketplace.sell.statPlan")}
                value={t("marketplace.tiers." + currentTier + ".label")}
                hint={s?.expires_at && currentTier !== "free"
                  ? t("marketplace.sell.until", { date: friendlyTime(s.expires_at) }) : undefined}
                tone={currentTier === "free" ? "default" : "good"}
              />
              <Stat
                label={t("marketplace.sell.statListings")}
                value={`${used}${limit === null ? "" : ` / ${limit}`}`}
                hint={limit === null ? t("marketplace.sell.unlimited") : atLimit ? t("marketplace.sell.limitReached") : t("marketplace.sell.active")}
                tone={atLimit ? "warn" : "default"}
              />
              <Stat
                label={t("marketplace.sell.statEnquiries")}
                value={listingEnquiries.length}
                hint={awaiting > 0 ? t("marketplace.sell.awaitingReply", { count: awaiting }) : t("marketplace.sell.allAnswered")}
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
              <span className="font-semibold">{t("marketplace.sell.planUpdatedTitle")}</span> {t("marketplace.sell.planUpdatedBody")}
            </p>
          </div>
        )}

        {atLimit && (
          <Card className="mb-4 flex items-start gap-2 border-danger/25 bg-danger/5 p-4">
            <AlertCircle size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[12.5px] leading-relaxed text-danger">
              {t("marketplace.sell.atLimit", { limit, tier: t("marketplace.tiers." + currentTier + ".label") })}
            </p>
          </Card>
        )}

        {/* upgrade */}
        {currentTier !== "pro" && (
          <Card className="mt-4 p-5">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              {currentTier === "free" ? t("marketplace.sell.upgradeTitleFree") : t("marketplace.sell.upgradeTitlePro")}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              {t("marketplace.sell.upgradeSubtitle")}
            </p>

            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
              {SELLER_TIERS.map((tier) => {
                const isCurrent = tier.key === currentTier;
                const isDowngrade =
                  (currentTier === "premium" && tier.key === "free") ||
                  (currentTier === "pro" && tier.key !== "pro");
                const label = t("marketplace.tiers." + tier.key + ".label");
                const perks = t("marketplace.tiers." + tier.key + ".perks", { returnObjects: true }) as string[];
                return (
                  <div
                    key={tier.key}
                    className={`rounded-xl border-2 p-3.5 ${
                      isCurrent ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper"
                    }`}
                  >
                    <p className="text-[13.5px] font-bold text-ink">{label}</p>
                    <p className="mt-0.5 tabular text-[17px] font-bold text-ink">
                      {tier.price === 0 ? t("marketplace.tiers.free.label") : naira(tier.price)}
                      {tier.price > 0 && <span className="text-[11px] font-medium text-muted">{t("marketplace.sell.perMonth")}</span>}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-1 text-[11.5px] leading-snug text-muted">
                          <Check size={10} strokeWidth={3} className="mt-1 shrink-0 text-brand-green" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <p className="mt-2.5 text-center text-[12px] font-semibold text-brand-green">
                        {t("marketplace.sell.currentPlan")}
                      </p>
                    ) : isDowngrade || tier.key === "free" ? null : (
                      <button
                        onClick={() => {
                          const tr = tier.key as "premium" | "pro";
                          setPendingTier(tr);
                          subscribe.mutate(tr);
                        }}
                        disabled={subscribe.isPending}
                        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-red text-[12.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                      >
                        {pendingTier === tier.key ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            {t("marketplace.sell.redirecting")}
                          </>
                        ) : (
                          t("marketplace.sell.choose", { tier: label })
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
              {t(listingEnquiries.length === 1 ? "marketplace.sell.enquiriesCountOne" : "marketplace.sell.enquiriesCountOther", { count: listingEnquiries.length })}
            </p>
            <p className="text-[12.5px] text-muted">
              {awaiting > 0 ? t("marketplace.sell.waitingReply", { count: awaiting }) : t("marketplace.sell.nothingNeeds")}
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
          <SectionTitle>{t("marketplace.sell.myListings")}</SectionTitle>

          {mine.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : listings.length === 0 ? (
            <Card className="py-12 text-center">
              <Package size={26} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-2.5 text-[14px] font-medium text-ink">{t("marketplace.sell.nothingListed")}</p>
              <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted">
                {t("marketplace.sell.nothingListedBody")}
              </p>
              <Link to="/marketplace/post"
                    className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white transition hover:brightness-95">
                <Plus size={15} strokeWidth={2} /> {t("marketplace.postItem")}
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
                      <p className="flex items-center gap-1.5 text-[11px] text-muted">
                        {friendlyTime(l.created_at)}
                        {l.is_featured && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-warn">
                            <Star size={8} strokeWidth={3} /> {t("marketplace.sell.featuredTag")}
                          </span>
                        )}
                        {l.is_verified && <VerifiedBadge size="sm" />}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      to={`/marketplace/${l.id}/edit`}
                      title={t("marketplace.sell.editTitle")}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-hairline bg-paper px-2.5 text-[12px] font-medium text-muted transition hover:bg-mist hover:text-ink"
                    >
                      <Pencil size={12} strokeWidth={2} /> {t("marketplace.sell.edit")}
                    </Link>
                    <button
                      onClick={() => renew.mutate(l.id)}
                      disabled={renew.isPending}
                      title={t("marketplace.sell.renewTitle")}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-hairline bg-paper px-2.5 text-[12px] font-medium text-muted transition hover:bg-mist hover:text-ink disabled:opacity-60"
                    >
                      <RefreshCw size={12} strokeWidth={2}
                                 className={renew.isPending ? "animate-spin" : ""} />
                      {t("marketplace.sell.renew")}
                    </button>
                    <button
                      onClick={() => onDelete(l.id)}
                      disabled={remove.isPending}
                      title={t("marketplace.sell.deleteTitle")}
                      aria-label={t("marketplace.sell.deleteTitle")}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 px-2.5 text-danger transition hover:bg-danger/10 disabled:opacity-60"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
