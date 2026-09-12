import { useTranslation } from "react-i18next";
import { PageShell, Sections } from "@/features/company/ui";

const SPEC = [
  { title: "s1Title", paras: ["s1P1"] },
  { title: "s2Title", paras: ["s2P1", "s2P2"] },
  { title: "s3Title", paras: ["s3P1", "s3P2"] },
  { title: "s4Title", paras: ["s4P1", "s4P2"] },
  { title: "s5Title", paras: ["s5P1", "s5P2"] },
  { title: "s6Title", paras: ["s6P1"] },
  { title: "s7Title", paras: ["s7P1"] },
  { title: "s8Title", paras: ["s8P1"] },
];

export default function CompanyRefund() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("company.refund.title")} intro={t("company.refund.intro")} updated={t("company.refund.updated")}>
      <Sections base="company.refund" spec={SPEC} />
    </PageShell>
  );
}
