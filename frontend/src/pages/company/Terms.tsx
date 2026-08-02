import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline" />;
const mono = <span className="font-mono text-[12px]" />;

/**
 * DRAFT terms.
 *
 * These describe how the platform genuinely behaves — wallet mechanics, tiers,
 * the contact gate, what is and isn't refundable. That accuracy is the part
 * that's hard to outsource, and it's what a lawyer will want as a starting
 * point.
 *
 * What they are NOT is a reviewed legal document. A payment platform holding
 * customer balances in Nigeria touches CBN rules on payment services and the
 * Nigeria Data Protection Act, and clauses drafted without advice are often
 * unenforceable exactly when they'd matter. The banner below is deliberately
 * visible in the product until a lawyer has been through it — quiet TODOs in
 * code are how placeholder legal text reaches production.
 */
export default function Terms() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t("company.terms.title")}
      intro={t("company.terms.intro")}
      updated={t("company.terms.updated")}
    >
      <Block heading={t("company.terms.s1Title")}>
        <p><Trans i18nKey="company.terms.s1Body" components={{ 1: <strong />, 2: mono, 3: mono }} /></p>
      </Block>

      <Block heading={t("company.terms.s2Title")}>
        <p><Trans i18nKey="company.terms.s2P1" components={{ 1: <strong /> }} /></p>
        <p><Trans i18nKey="company.terms.s2P2" components={{ 1: emailLink }} /></p>
      </Block>

      <Block heading={t("company.terms.s3Title")}>
        <p>{t("company.terms.s3P1")}</p>
        <p>{t("company.terms.s3P2")}</p>
        <p><Trans i18nKey="company.terms.s3P3" components={{ 1: <strong /> }} /></p>
      </Block>

      <Block heading={t("company.terms.s4Title")}>
        <p>{t("company.terms.s4P1")}</p>
        <p><Trans i18nKey="company.terms.s4P2" components={{ 1: <strong /> }} /></p>
        <p>{t("company.terms.s4P3")}</p>
      </Block>

      <Block heading={t("company.terms.s5Title")}>
        <p><Trans i18nKey="company.terms.s5P1" components={{ 1: <strong /> }} /></p>
        <p>{t("company.terms.s5P2")}</p>
        <p>{t("company.terms.s5ListIntro")}</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{t("company.terms.s5Li1")}</li>
          <li>{t("company.terms.s5Li2")}</li>
          <li>{t("company.terms.s5Li3")}</li>
          <li>{t("company.terms.s5Li4")}</li>
        </ul>
        <p>{t("company.terms.s5P3")}</p>
      </Block>

      <Block heading={t("company.terms.s6Title")}>
        <p><Trans i18nKey="company.terms.s6P1" components={{ 1: <strong /> }} /></p>
        <p>{t("company.terms.s6P2")}</p>
        <p>{t("company.terms.s6P3")}</p>
      </Block>

      <Block heading={t("company.terms.s7Title")}>
        <p><Trans i18nKey="company.terms.s7Body" components={{ 1: <strong /> }} /></p>
      </Block>

      <Block heading={t("company.terms.s8Title")}>
        <p>{t("company.terms.s8P1")}</p>
        <p><Trans i18nKey="company.terms.s8P2" components={{ 1: mono }} /></p>
      </Block>

      <Block heading={t("company.terms.s9Title")}>
        <p>{t("company.terms.s9P1")}</p>
        <p>{t("company.terms.s9P2")}</p>
      </Block>

      <Block heading={t("company.terms.s10Title")}>
        <p>{t("company.terms.s10P1")}</p>
        <p><Trans i18nKey="company.terms.s10P2" components={{ 1: <strong />, 2: mono }} /></p>
        <p>
          <Trans
            i18nKey="company.terms.s10P3"
            components={{ 1: <Link to="/privacy" className="font-medium text-brand-green underline" /> }}
          />
        </p>
      </Block>
    </PageShell>
  );
}
