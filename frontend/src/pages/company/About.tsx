import { Link } from "react-router-dom";
import { 
  Wallet, 
  Zap, 
  Store, 
  Wrench, 
  Plane, 
  ShieldCheck, 
  Globe, 
  Gamepad2, 
  Bus, 
  ShoppingBag 
} from "lucide-react";
import PageShell, { Block, Notice } from "./PageShell";
import { useTranslation, Trans } from "react-i18next";

const WHAT_WE_DO = [
  { icon: Zap, id: "bills" },
  { icon: Globe, id: "intAirtime" },
  { icon: Wallet, id: "wallet" },
  { icon: Gamepad2, id: "betting" },
  { icon: Store, id: "marketplace" },
  { icon: ShoppingBag, id: "ecommerce" },
  { icon: Wrench, id: "services" },
  { icon: Plane, id: "travel" },
  { icon: Bus, id: "busTickets" },
];

export default function About() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.about.title")}
      intro={t("company.about.intro")}
    >
      <Block heading={t("company.about.whatTitle")}>
        <p><Trans i18nKey="company.about.whatP1" components={{ 1: <strong /> }} /></p>
        <p>{t("company.about.whatP2")}</p>
      </Block>

      <Block heading={t("company.about.doTitle")}>
        <ul className="space-y-3">
          {WHAT_WE_DO.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>{t(`company.about.svc.${item.id}.title`)}</strong>
                  <br />
                  {t(`company.about.svc.${item.id}.body`)}
                </span>
              </li>
            );
          })}
        </ul>
      </Block>

      <Block heading={t("company.about.moneyTitle")}>
        <p>{t("company.about.moneyP1")}</p>
        <p><Trans i18nKey="company.about.moneyP2" components={{ 1: <strong /> }} /></p>
        <p><Trans i18nKey="company.about.moneyP3" components={{ 1: <strong /> }} /></p>
        <p><Trans i18nKey="company.about.moneyP4" components={{ 1: <strong /> }} /></p>
      </Block>

      <Block heading={t("company.about.safetyTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <ShieldCheck size={16} strokeWidth={1.75} />
          </span>
          <div className="space-y-3">
            <p><Trans i18nKey="company.about.safetyP1" components={{ 1: <strong /> }} /></p>
            <p><Trans i18nKey="company.about.safetyP2" components={{ 1: <strong /> }} /></p>
          </div>
        </div>
      </Block>

      <Notice tone="info">
        <Trans i18nKey="company.about.noteBody" components={{ 1: <strong /> }} />
      </Notice>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/sign-up"
          className="inline-flex h-11 items-center rounded-xl bg-brand-red px-5 text-[14px] font-semibold text-white transition hover:brightness-95"
        >
          {t("company.about.createAccount")}
        </Link>
        <Link
          to="/contact"
          className="inline-flex h-11 items-center rounded-xl border border-hairline bg-paper px-5 text-[14px] font-medium text-ink transition hover:bg-mist"
        >
          {t("company.about.talkToUs")}
        </Link>
      </div>
    </PageShell>
  );
}