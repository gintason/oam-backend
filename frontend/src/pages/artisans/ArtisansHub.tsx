import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Wrench, BadgeCheck, Star } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { DarkPanel, ChoiceCard, Card } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { homeServicesApi } from "../../services/homeservices";
import { useTranslation } from "react-i18next";

/**
 * The decision hub: are you here to hire, or to be hired?
 * Both paths lead back here, and this leads back to the dashboard, so nobody
 * gets stranded in a section they opened by accident.
 */
export default function ArtisansHub() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const { t } = useTranslation();

  const mine = useQuery({
    queryKey: ["artisan", scope, "me"],
    queryFn: homeServicesApi.me,
    retry: false,
    staleTime: 60_000,
  });
  const isArtisan = mine.isSuccess && Boolean(mine.data?.id);

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> {t("artisans.hub.back")}
        </button>

        <DarkPanel className="mb-5">
          <div className="p-5 sm:p-7">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
              {t("artisans.hub.title")}
            </h1>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              {t("artisans.hub.subtitle")}
            </p>
          </div>
        </DarkPanel>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <ChoiceCard
            to="/artisans/find"
            icon={<Search size={20} strokeWidth={1.75} />}
            title={t("artisans.hub.findTitle")}
            description={t("artisans.hub.findDesc")}
            action={t("artisans.hub.findAction")}
          />
          <ChoiceCard
            to="/artisans/me"
            icon={<Wrench size={20} strokeWidth={1.75} />}
            title={isArtisan ? t("artisans.hub.profileTitleMine") : t("artisans.hub.profileTitleNew")}
            description={
              isArtisan
                ? t("artisans.hub.profileDescMine")
                : t("artisans.hub.profileDescNew")
            }
            action={isArtisan ? t("artisans.hub.profileActionMine") : t("artisans.hub.profileActionNew")}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="flex items-start gap-2.5 p-4">
            <BadgeCheck size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t("artisans.hub.privacyTitle")}</span> {t("artisans.hub.privacyBody")}
            </p>
          </Card>
          <Card className="flex items-start gap-2.5 p-4">
            <Star size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t("artisans.hub.boostTitle")}</span>{" "}
              {t("artisans.hub.boostBody")}
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
