import { useTranslation } from "react-i18next";
import { PageShell, Sections } from "@/features/company/ui";

const SPEC = [
  { title: "s1Title", paras: ["s1Body"] },
  { title: "s2Title", paras: ["s2P1", "s2P2"] },
  { title: "s3Title", paras: ["s3P1", "s3P2", "s3P3"] },
  { title: "s4Title", paras: ["s4P1", "s4P2"] },
  { title: "s5Title", paras: ["s5P1", "s5P2"] },
  { title: "s6Title", paras: ["s6P1"] },
  { title: "s7Title", paras: ["s7P1"] },
  { title: "s8Title", paras: ["s8P1"] },
  { title: "s9Title", paras: ["s9P1"] },
  { title: "s10Title", paras: ["s10P1"] },
  { title: "s11Title", paras: ["s11P1"] },
  { title: "s12Title", paras: ["s12P1"] },
];

export default function CompanyTerms() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("company.terms.title")} intro={t("company.terms.intro")} updated={t("company.terms.updated")}>
      <Sections base="company.terms" spec={SPEC} />
    </PageShell>
  );
}
