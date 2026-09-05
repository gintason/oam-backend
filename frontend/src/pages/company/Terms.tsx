import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" />;

export default function Terms() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.terms.title")}
      intro={t("company.terms.intro")}
      updated={t("company.terms.updated")}
    >
      <Block heading={t("company.terms.s1Title")}>
        <p>{t("company.terms.s1Body")}</p>
      </Block>

      <Block heading={t("company.terms.s2Title")}>
        <p><Trans i18nKey="company.terms.s2P1" /></p>
        <p>{t("company.terms.s2P2")}</p>
      </Block>

      <Block heading={t("company.terms.s3Title")}>
        <p>{t("company.terms.s3P1")}</p>
        <p>{t("company.terms.s3P2")}</p>
        <p>{t("company.terms.s3P3")}</p>
      </Block>

      <Block heading={t("company.terms.s4Title")}>
        <p>{t("company.terms.s4P1")}</p>
        <p>{t("company.terms.s4P2")}</p>
      </Block>

      <Block heading={t("company.terms.s5Title")}>
        <p>{t("company.terms.s5P1")}</p>
        <p>{t("company.terms.s5P2")}</p>
      </Block>

      <Block heading={t("company.terms.s6Title")}>
        <p>{t("company.terms.s6P1")}</p>
      </Block>

      <Block heading={t("company.terms.s7Title")}>
        <p>{t("company.terms.s7P1")}</p>
      </Block>

      <Block heading={t("company.terms.s8Title")}>
        <p>{t("company.terms.s8P1")}</p>
      </Block>

      <Block heading={t("company.terms.s9Title")}>
        <p>{t("company.terms.s9P1")}</p>
      </Block>

      <Block heading={t("company.terms.s10Title")}>
        <p>{t("company.terms.s10P1")}</p>
      </Block>

      <Block heading={t("company.terms.s11Title")}>
        <p>{t("company.terms.s11P1")}</p>
      </Block>

      <Block heading={t("company.terms.s12Title")}>
        <p><Trans i18nKey="company.terms.s12P1" components={{ 1: emailLink }} /></p>
      </Block>
    </PageShell>
  );
}