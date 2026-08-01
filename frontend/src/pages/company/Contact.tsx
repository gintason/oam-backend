import { Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell, { Block, Notice } from "./PageShell";
import { useTranslation, Trans } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.contact.title")}
      intro={t("company.contact.intro")}
    >
      <Block heading={t("company.contact.emailTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Mail size={17} strokeWidth={1.75} />
          </span>
          <div>
            <a
              href="mailto:info@oam-app.com"
              className="text-[16px] font-semibold text-ink underline decoration-brand-green/40 underline-offset-4"
            >
              info@oam-app.com
            </a>
            <p className="mt-1">{t("company.contact.emailBody")}</p>
          </div>
        </div>
      </Block>

      <Block heading={t("company.contact.paymentTitle")}>
        <p><Trans i18nKey="company.contact.paymentP1" components={{ 1: <strong /> }} /></p>
        <p>{t("company.contact.paymentList")}</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><Trans i18nKey="company.contact.paymentLi1" components={{ 1: <strong /> }} /></li>
          <li>{t("company.contact.paymentLi2")}</li>
          <li>{t("company.contact.paymentLi3")}</li>
        </ul>
        <p><Trans i18nKey="company.contact.paymentP2" components={{ 1: <Link to="/orders" className="font-medium text-brand-green underline" /> }} /></p>
      </Block>

      <Block heading={t("company.contact.mktTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <MessageSquare size={17} strokeWidth={1.75} />
          </span>
          <div className="space-y-3">
            <p><Trans i18nKey="company.contact.mktP1" components={{ 1: <strong /> }} /></p>
            <p>{t("company.contact.mktP2")}</p>
          </div>
        </div>
      </Block>

      <Block heading={t("company.contact.responseTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Clock size={17} strokeWidth={1.75} />
          </span>
          <p><Trans i18nKey="company.contact.responseBody" components={{ 1: <strong /> }} /></p>
        </div>
      </Block>

      <Notice>
        <div className="flex gap-2.5">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <Trans i18nKey="company.contact.scamBody" components={{ 1: <strong /> }} />
          </div>
        </div>
      </Notice>
    </PageShell>
  );
}
