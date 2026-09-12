import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { PageShell, Block, Rich } from "@/features/company/ui";

function Li({ k }: { k: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
      <Text variant="body" color="green">•</Text>
      <View style={{ flex: 1 }}><Rich k={k} /></View>
    </View>
  );
}

export default function CompanyPrivacy() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("company.privacy.title")} intro={t("company.privacy.intro")} updated={t("company.privacy.updated")}>
      <Block heading={t("company.privacy.controlTitle")}><Rich k="company.privacy.controlBody" /></Block>

      <Block heading={t("company.privacy.collectTitle")}>
        <Rich k="company.privacy.collectGive" color="ink" />
        {["giveLi1", "giveLi2", "giveLi3", "giveLi4", "giveLi5"].map((k) => <Li key={k} k={`company.privacy.${k}`} />)}
        <View style={{ height: 6 }} />
        <Rich k="company.privacy.collectCreated" color="ink" />
        {["createdLi1", "createdLi2", "createdLi3"].map((k) => <Li key={k} k={`company.privacy.${k}`} />)}
        <View style={{ height: 6 }} />
        <Rich k="company.privacy.collectCard" />
      </Block>

      <Block heading={t("company.privacy.whyTitle")}>
        {["whyLi1", "whyLi2", "whyLi3", "whyLi4", "whyLi5"].map((k) => <Li key={k} k={`company.privacy.${k}`} />)}
        <View style={{ height: 6 }} />
        <Rich k="company.privacy.whyNoSell" />
      </Block>

      <Block heading={t("company.privacy.whoTitle")}>
        <Rich k="company.privacy.whoIntro" />
        {["whoLi1", "whoLi2", "whoLi3", "whoLi4", "whoLi5"].map((k) => <Li key={k} k={`company.privacy.${k}`} />)}
      </Block>

      <Block heading={t("company.privacy.contactTitle")}><Rich k="company.privacy.contactP1" /><Rich k="company.privacy.contactP2" /></Block>
      <Block heading={t("company.privacy.keepTitle")}><Rich k="company.privacy.keepP1" /><Rich k="company.privacy.keepP2" /></Block>

      <Block heading={t("company.privacy.rightsTitle")}>
        <Rich k="company.privacy.rightsIntro" />
        {["rightsLi1", "rightsLi2", "rightsLi3", "rightsLi4", "rightsLi5"].map((k) => <Li key={k} k={`company.privacy.${k}`} />)}
        <View style={{ height: 6 }} />
        <Rich k="company.privacy.rightsEmail" /><Rich k="company.privacy.rightsKeep" />
      </Block>

      <Block heading={t("company.privacy.securityTitle")}><Rich k="company.privacy.securityP1" /><Rich k="company.privacy.securityP2" /></Block>
      <Block heading={t("company.privacy.changesTitle")}><Rich k="company.privacy.changesBody" /></Block>
    </PageShell>
  );
}
