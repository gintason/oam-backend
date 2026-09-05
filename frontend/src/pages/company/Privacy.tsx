import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" />;

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.privacy.title")}
      intro={t("company.privacy.intro")}
      updated={t("company.privacy.updated")}
    >
      <Block heading={t("company.privacy.controlTitle")}>
        <p><Trans i18nKey="company.privacy.controlBody" components={{ 1: emailLink }} /></p>
      </Block>

      <Block heading={t("company.privacy.collectTitle")}>
        <p><strong>{t("company.privacy.collectGive")}</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.giveLi1")}</li>
          <li>{t("company.privacy.giveLi2")}</li>
          <li>{t("company.privacy.giveLi3")}</li>
          <li>{t("company.privacy.giveLi4")}</li>
        </ul>
        <p><strong>{t("company.privacy.collectCreated")}</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.createdLi1")}</li>
          <li>{t("company.privacy.createdLi2")}</li>
        </ul>
        <p><Trans i18nKey="company.privacy.collectCard" /></p>
      </Block>

      <Block heading={t("company.privacy.whyTitle")}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.whyLi1")}</li>
          <li>{t("company.privacy.whyLi2")}</li>
        </ul>
        <p><Trans i18nKey="company.privacy.whyNoSell" /></p>
      </Block>

      <Block heading={t("company.privacy.whoTitle")}>
        <p>{t("company.privacy.whoIntro")}</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.whoLi1")}</li>
          <li>{t("company.privacy.whoLi2")}</li>
          <li>{t("company.privacy.whoLi3")}</li>
        </ul>
      </Block>

      <Block heading={t("company.privacy.contactTitle")}>
        <p>{t("company.privacy.contactP1")}</p>
        <p><Trans i18nKey="company.privacy.rightsEmail" components={{ 1: emailLink }} /></p>
      </Block>

      <Block heading={t("company.privacy.securityTitle")}>
        <p>{t("company.privacy.securityP1")}</p>
      </Block>

      <Block heading={t("company.privacy.changesTitle")}>
        <p>{t("company.privacy.changesBody")}</p>
      </Block>
    </PageShell>
  );
}