import { View, Pressable, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, Send } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { PageShell, Block } from "@/features/company/ui";

const EMAIL = "oamapp26@gmail.com";
const PHONE = "+234 816 182 9560";
const ADDRESS = "Block Shop 11, No 2, Akinwunmi Street, Ojo, Lagos, Nigeria";

function InfoRow({ Icon, value, body, onPress }: { Icon: typeof Mail; value: string; body: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ height: 36, width: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
        <Icon size={17} strokeWidth={1.75} color={colors.brand.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" color={onPress ? "green" : "ink"} onPress={onPress}>{value}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, lineHeight: 18 }}>{body}</Text>
      </View>
    </View>
  );
}

export default function CompanyContact() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("company.contact.title")} intro={t("company.contact.intro")}>
      <Block heading={t("company.contact.emailTitle")}>
        <InfoRow Icon={Mail} value={EMAIL} body={t("company.contact.emailBody")} onPress={() => Linking.openURL(`mailto:${EMAIL}`)} />
      </Block>
      <Block heading={t("company.contact.phoneTitle")}>
        <InfoRow Icon={Phone} value={PHONE} body={t("company.contact.phoneBody")} onPress={() => Linking.openURL("tel:+2348161829560")} />
      </Block>
      <Block heading={t("company.contact.addressTitle")}>
        <InfoRow Icon={MapPin} value={ADDRESS} body={t("company.contact.addressBody")} />
      </Block>

      <Pressable
        onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("Inquiry from OAM app")}`)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, backgroundColor: colors.brand.red, marginTop: 2 }}
      >
        <Send size={17} strokeWidth={1.75} color="#fff" />
        <Text variant="label" color="paper">{t("company.contact.submit")}</Text>
      </Pressable>
    </PageShell>
  );
}
