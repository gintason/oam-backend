import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" />;
const mono = <span className="font-mono text-[12px]" />;

/**
 * DRAFT privacy policy.
 *
 * The processing described here is real — it's drawn from what the platform
 * actually stores and which third parties actually receive data. That accuracy
 * matters more than polish, because a policy that misdescribes your processing
 * is worse than none: it's a written record of getting it wrong.
 *
 * The Nigeria Data Protection Act 2023 applies, and it carries obligations
 * (lawful basis, retention, data-subject rights, possible DPO registration)
 * that need proper advice. Hence the visible banner.
 */
export default function Privacy() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.privacy.title")}
      intro={t("company.privacy.intro")}
      updated={t("company.privacy.updated")}
    >
      <Block heading={t("company.privacy.controlTitle")}>
        <p>
          <Trans i18nKey="company.privacy.controlBody" components={{ 1: <strong />, 2: mono, 3: emailLink }} />
        </p>
      </Block>

      <Block heading={t("company.privacy.collectTitle")}>
        <p><strong>{t("company.privacy.collectGive")}</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.giveLi1")}</li>
          <li>{t("company.privacy.giveLi2")}</li>
          <li>{t("company.privacy.giveLi3")}</li>
          <li>{t("company.privacy.giveLi4")}</li>
          <li>{t("company.privacy.giveLi5")}</li>
        </ul>
        <p><strong>{t("company.privacy.collectCreated")}</strong></p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.createdLi1")}</li>
          <li>{t("company.privacy.createdLi2")}</li>
          <li>{t("company.privacy.createdLi3")}</li>
        </ul>
        <p>
          <Trans i18nKey="company.privacy.collectCard" components={{ 1: <strong /> }} />
        </p>
      </Block>

      <Block heading={t("company.privacy.whyTitle")}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><Trans i18nKey="company.privacy.whyLi1" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whyLi2" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whyLi3" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whyLi4" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whyLi5" components={{ 1: <strong /> }} /></li>
        </ul>
        <p>
          <Trans i18nKey="company.privacy.whyNoSell" components={{ 1: <strong /> }} />
        </p>
      </Block>

      <Block heading={t("company.privacy.whoTitle")}>
        <p>{t("company.privacy.whoIntro")}</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><Trans i18nKey="company.privacy.whoLi1" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whoLi2" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whoLi3" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whoLi4" components={{ 1: <strong /> }} /></li>
          <li><Trans i18nKey="company.privacy.whoLi5" components={{ 1: <strong /> }} /></li>
        </ul>
      </Block>

      <Block heading={t("company.privacy.contactTitle")}>
        <p>
          <Trans i18nKey="company.privacy.contactP1" components={{ 1: <strong /> }} />
        </p>
        <p>{t("company.privacy.contactP2")}</p>
      </Block>

      <Block heading={t("company.privacy.keepTitle")}>
        <p>
          <Trans i18nKey="company.privacy.keepP1" components={{ 1: mono }} />
        </p>
        <p>{t("company.privacy.keepP2")}</p>
      </Block>

      <Block heading={t("company.privacy.rightsTitle")}>
        <p>{t("company.privacy.rightsIntro")}</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.privacy.rightsLi1")}</li>
          <li>{t("company.privacy.rightsLi2")}</li>
          <li>{t("company.privacy.rightsLi3")}</li>
          <li>{t("company.privacy.rightsLi4")}</li>
          <li>{t("company.privacy.rightsLi5")}</li>
        </ul>
        <p>
          <Trans i18nKey="company.privacy.rightsEmail" components={{ 1: emailLink }} />
        </p>
        <p>{t("company.privacy.rightsKeep")}</p>
      </Block>

      <Block heading={t("company.privacy.securityTitle")}>
        <p>{t("company.privacy.securityP1")}</p>
        <p>{t("company.privacy.securityP2")}</p>
      </Block>

      <Block heading={t("company.privacy.changesTitle")}>
        <p>
          <Trans
            i18nKey="company.privacy.changesBody"
            components={{ 1: <Link to="/terms" className="font-medium text-brand-green underline" /> }}
          />
        </p>
      </Block>
    </PageShell>
  );
}
