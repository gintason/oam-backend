import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, ChevronRight, Search, Store, Lock, Tag } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { DarkPanel, ChoiceCard, Card } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { marketplaceApi } from "../../services/marketplace";
import { useTranslation } from "react-i18next";

/** Buy or sell — the same decision-hub pattern as Home services. */
export default function MarketplaceHub() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStaff = Boolean(
    (user as { is_staff?: boolean; is_superuser?: boolean } | null)?.is_staff ||
    (user as { is_superuser?: boolean } | null)?.is_superuser,
  );

  const mine = useQuery({
    queryKey: ["marketplace", scope, "mine"],
    queryFn: marketplaceApi.mine,
    retry: false,
    staleTime: 60_000,
  });
  const listingCount = mine.data?.count ?? 0;

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> {t("marketplace.navDashboard")}
        </button>

        <DarkPanel className="mb-5">
          <div className="p-5 sm:p-7">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
              {t("marketplace.hub.title")}
            </h1>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              {t("marketplace.hub.subtitle")}
            </p>
          </div>
        </DarkPanel>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <ChoiceCard
            to="/marketplace/browse"
            icon={<Search size={20} strokeWidth={1.75} />}
            title={t("marketplace.hub.browseTitle")}
            description={t("marketplace.hub.browseDesc")}
            action={t("marketplace.hub.browseAction")}
          />
          <ChoiceCard
            to="/marketplace/sell"
            icon={<Store size={20} strokeWidth={1.75} />}
            title={listingCount > 0 ? t("marketplace.hub.sellTitleMine") : t("marketplace.hub.sellTitleNew")}
            description={
              listingCount > 0
                ? t(listingCount === 1 ? "marketplace.hub.sellDescMineOne" : "marketplace.hub.sellDescMineOther", { count: listingCount })
                : t("marketplace.hub.sellDescNew")
            }
            action={listingCount > 0 ? t("marketplace.hub.sellActionMine") : t("marketplace.hub.sellActionNew")}
          />
        </div>

        {isStaff && (
          <Link
            to="/admin/motors"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition hover:-translate-y-0.5 hover:border-brand-red/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
              <Car size={18} strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">{t("marketplace.hub.motorsTitle")}</p>
              <p className="text-[12.5px] text-muted">{t("marketplace.hub.motorsDesc")}</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-muted" />
          </Link>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="flex items-start gap-2.5 p-4">
            <Lock size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t("marketplace.hub.privacyTitle")}</span> {t("marketplace.hub.privacyBody")}
            </p>
          </Card>
          <Card className="flex items-start gap-2.5 p-4">
            <Tag size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-red" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t("marketplace.hub.freeTitle")}</span> {t("marketplace.hub.freeBody")}
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
