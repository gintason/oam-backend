import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Smartphone, Wifi, Zap, Tv, Wallet, Send, Store, Wrench, Plane, BedDouble, Car, ShoppingBag, Ticket, Bus, ShieldCheck, type LucideIcon,
} from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { PageShell, Block, Rich } from "@/features/company/ui";

const SVC: { id: string; Icon: LucideIcon }[] = [
  { id: "airtimeData", Icon: Smartphone }, { id: "data", Icon: Wifi }, { id: "electricity", Icon: Zap }, { id: "cable", Icon: Tv },
  { id: "wallet", Icon: Wallet }, { id: "transfers", Icon: Send }, { id: "marketplace", Icon: Store }, { id: "artisans", Icon: Wrench },
  { id: "flights", Icon: Plane }, { id: "hotels", Icon: BedDouble }, { id: "carhire", Icon: Car }, { id: "ecommerce", Icon: ShoppingBag },
  { id: "betting", Icon: Ticket }, { id: "busTickets", Icon: Bus },
];

export default function CompanyAbout() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <PageShell title={t("company.about.title")} intro={t("company.about.intro")}>
      <Block heading={t("company.about.whatTitle")}>
        <Rich k="company.about.whatP1" /><Rich k="company.about.whatP2" />
      </Block>

      <Block heading={t("company.about.doTitle")}>
        {SVC.map(({ id, Icon }) => (
          <View key={id} style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ height: 34, width: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
              <Icon size={16} strokeWidth={1.75} color={colors.brand.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="ink">{t(`company.about.svc.${id}.title`)}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 1, lineHeight: 18 }}>{t(`company.about.svc.${id}.body`)}</Text>
            </View>
          </View>
        ))}
      </Block>

      <Block heading={t("company.about.moneyTitle")}>
        <Rich k="company.about.moneyP1" /><Rich k="company.about.moneyP2" /><Rich k="company.about.moneyP3" /><Rich k="company.about.moneyP4" />
      </Block>

      <Block heading={t("company.about.safetyTitle")}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ height: 34, width: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <ShieldCheck size={16} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1, gap: 8 }}><Rich k="company.about.safetyP1" /><Rich k="company.about.safetyP2" /></View>
        </View>
      </Block>

      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.25)", backgroundColor: "rgba(11,115,39,0.05)", padding: 14, marginBottom: 12 }}>
        <Rich k="company.about.noteBody" color="ink" />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => router.push("/sign-up")} style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: colors.brand.red, alignItems: "center", justifyContent: "center" }}>
          <Text variant="label" color="paper">{t("company.about.createAccount")}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/company-contact")} style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
          <Text variant="label" color="ink">{t("company.about.talkToUs")}</Text>
        </Pressable>
      </View>
    </PageShell>
  );
}
