import { useTranslation, Trans } from "react-i18next";
import PageShell, { Block, Notice } from "./PageShell";

const emailLink = <a href="mailto:info@oam-app.com?subject=Delete%20my%20OAM%20account" className="font-medium text-brand-green underline" />;

/**
 * /delete-account — public page explaining how to delete an OAM account.
 * Google Play asks for this link in the Data safety form; the App Store needs
 * the in-app option (Profile → Delete account), which this page describes.
 */
export default function DeleteAccount() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("deletePage.title", "Delete your OAM account")} intro={t("deletePage.intro", "You can delete your OAM account at any time, from the app or by email.")}>
      <Block heading={t("deletePage.inAppTitle", "In the OAM app")}>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>{t("deletePage.inApp1", "Open the OAM app and sign in.")}</li>
          <li>{t("deletePage.inApp2", "Go to Profile and tap “Delete account”.")}</li>
          <li>{t("deletePage.inApp3", "Confirm with your password (or type DELETE if you sign in with Google or Apple).")}</li>
        </ol>
      </Block>

      <Block heading={t("deletePage.emailTitle", "By email")}>
        <p>
          <Trans i18nKey="deletePage.emailBody" components={{ 1: emailLink }}
            defaults="If you can't use the app, email <1>info@oam-app.com</1> from the email address on your account with the subject “Delete my OAM account”. We'll confirm it's you, then delete the account." />
        </p>
      </Block>

      <Block heading={t("deletePage.deletedTitle", "What we delete")}>
        <p>{t("deletePage.deletedBody", "Your name, email address, phone number, transaction PIN, saved devices and linked Google or Apple sign-in. Your marketplace listings, artisan profile, CV and job posts are taken down, and you can no longer sign in.")}</p>
      </Block>

      <Block heading={t("deletePage.keptTitle", "What we keep, and why")}>
        <p>{t("deletePage.keptBody", "Records of payments, wallet transactions, withdrawals and deliveries are kept in anonymised form, because financial regulations and fraud prevention require us to retain them.")}</p>
      </Block>

      <Notice tone="info">
        {t("deletePage.before", "Before deleting, withdraw any money left in your wallet and finish any delivery in progress — the app will remind you if anything is still pending.")}
      </Notice>
    </PageShell>
  );
}
