
import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" />;

export default function RefundPolicy() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.refund.title")}
      intro={t("company.refund.intro")}
      updated={t("company.refund.updated")}
    >
      <Block heading={t("company.refund.s1Title")}>
        <p>{t("company.refund.s1P1")}</p>
      </Block>

      <Block heading={t("company.refund.s2Title")}>
        <p>{t("company.refund.s2P1")}</p>
        <p>{t("company.refund.s2P2")}</p>
      </Block>

      <Block heading={t("company.refund.s3Title")}>
        <p>{t("company.refund.s3P1")}</p>
        <p>{t("company.refund.s3P2")}</p>
      </Block>

      <Block heading={t("company.refund.s4Title")}>
        <p>{t("company.refund.s4P1")}</p>
        <p>{t("company.refund.s4P2")}</p>
      </Block>

      <Block heading={t("company.refund.s5Title")}>
        <p>{t("company.refund.s5P1")}</p>
        <p>{t("company.refund.s5P2")}</p>
      </Block>

      <Block heading={t("company.refund.s6Title")}>
        <p>{t("company.refund.s6P1")}</p>
      </Block>

      <Block heading={t("company.refund.s7Title")}>
        <p><Trans i18nKey="company.refund.s7P1" components={{ 1: emailLink }} /></p>
      </Block>

      <Block heading={t("company.refund.s8Title")}>
        <p>{t("company.refund.s8P1")}</p>
      </Block>
    </PageShell>
  );
}