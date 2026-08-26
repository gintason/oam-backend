import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, CarTaxiFront, Minus, Plus, ExternalLink } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { affiliatesApi, AIRPORTS, airportName, DateField, PickerField, today, type PickerOption } from "@/features/travel";

const AIRPORT_OPTIONS: PickerOption[] = AIRPORTS.map((a) => ({ value: a.code, label: `${airportName(a.code, a.city)} (${a.code})`, sub: a.country }));

export default function Pickup() {
  const router = useRouter();
  const { t } = useTranslation();
  const [airport, setAirport] = useState("LOS");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(today());
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: () => affiliatesApi.getLink("transfers", { airport, destination, date, passengers }),
    onSuccess: (link) => WebBrowser.openBrowserAsync(link.url),
    onError: (err) => setError(apiErrorMessage(err, t("travel.pickup.errOpen"))),
  });

  function submit() {
    setError(null);
    if (!airport) return setError(t("travel.pickup.errChooseAirport"));
    if (!destination.trim()) return setError(t("travel.pickup.errDestination"));
    if (!date) return setError(t("travel.pickup.errChooseDate"));
    search.mutate();
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("travel.pickup.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <CarTaxiFront size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("travel.pickup.title")}</Text><Text variant="caption" color="muted">{t("travel.pickup.subtitle")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          <PickerField label={t("travel.pickup.arrivingLabel")} value={airport} options={AIRPORT_OPTIONS} onSelect={setAirport} title={t("travel.pickup.arrivingLabel")} />

          <View style={{ marginTop: 14 }}>
            <Input label={t("travel.pickup.goingLabel")} value={destination} onChangeText={setDestination} placeholder={t("travel.pickup.goingPlaceholder")} />
          </View>

          <View style={{ marginTop: 2 }}>
            <DateField label={t("travel.pickup.arrivalDate")} value={date} onChange={setDate} minimumDate={new Date()} />
          </View>

          <Text variant="label" style={{ marginTop: 16, marginBottom: 8 }}>{t("travel.pickup.passengersLabel")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12 }}>
            <Pressable onPress={() => setPassengers((n) => Math.max(1, n - 1))} hitSlop={8} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
              <Minus size={16} color={passengers <= 1 ? colors.muted : colors.ink} />
            </Pressable>
            <Text variant="label" color="ink">{passengers > 1 ? t("travel.pickup.passengerOther", { count: passengers }) : t("travel.pickup.passengerOne", { count: passengers })}</Text>
            <Pressable onPress={() => setPassengers((n) => Math.min(6, n + 1))} hitSlop={8} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
              <Plus size={16} color={passengers >= 6 ? colors.muted : colors.ink} />
            </Pressable>
          </View>

          <View style={{ marginTop: 18 }}>
            <Button title={t("travel.pickup.search")} onPress={submit} loading={search.isPending} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <ExternalLink size={12} color={colors.muted} />
            <Text variant="caption" color="muted">{t("travel.pickup.partnerNote")}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
