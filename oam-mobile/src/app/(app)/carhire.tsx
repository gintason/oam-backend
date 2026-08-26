import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, Car, ExternalLink } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { affiliatesApi, CAR_CITIES, DateField, PickerField, today, type PickerOption } from "@/features/travel";

const CITY_OPTIONS: PickerOption[] = CAR_CITIES.map((c) => ({ value: c, label: c }));

export default function CarHire() {
  const router = useRouter();
  const { t } = useTranslation();
  const [location, setLocation] = useState("Lagos");
  const [pickup, setPickup] = useState(today());
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: () => affiliatesApi.getLink("carhire", { location, pickup_date: pickup, dropoff_date: dropoff }),
    onSuccess: (link) => WebBrowser.openBrowserAsync(link.url),
    onError: (err) => setError(apiErrorMessage(err, t("travel.carhire.errOpen"))),
  });

  function submit() {
    setError(null);
    if (!location) return setError(t("travel.carhire.errChooseLocation"));
    if (!pickup) return setError(t("travel.carhire.errChoosePickup"));
    search.mutate();
  }

  const pickupDate = pickup ? new Date(pickup + "T00:00:00") : new Date();

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("travel.carhire.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Car size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("travel.carhire.title")}</Text><Text variant="caption" color="muted">{t("travel.carhire.subtitle")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          <PickerField label={t("travel.carhire.locationLabel")} value={location} options={CITY_OPTIONS} onSelect={setLocation} title={t("travel.carhire.locationLabel")} />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1 }}><DateField label={t("travel.carhire.pickupDate")} value={pickup} onChange={setPickup} minimumDate={new Date()} /></View>
            <View style={{ flex: 1 }}><DateField label={t("travel.carhire.dropoffDate")} value={dropoff} onChange={setDropoff} minimumDate={pickupDate} placeholder={t("travel.carhire.returnDate")} /></View>
          </View>

          <View style={{ marginTop: 18 }}>
            <Button title={t("travel.carhire.search")} onPress={submit} loading={search.isPending} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <ExternalLink size={12} color={colors.muted} />
            <Text variant="caption" color="muted">{t("travel.carhire.partnerNote")}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
