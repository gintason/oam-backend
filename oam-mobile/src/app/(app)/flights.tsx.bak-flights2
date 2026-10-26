import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, Plane, ArrowRightLeft, Clock, Minus, Plus, ExternalLink } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { affiliatesApi, AIRPORTS, ROUTE_INFO, POPULAR_ROUTES, airportName, airportLabel, DateField, PickerField, today, type PickerOption } from "@/features/travel";

const AIRPORT_OPTIONS: PickerOption[] = AIRPORTS.map((a) => ({ value: a.code, label: `${airportName(a.code, a.city)} (${a.code})`, sub: a.country }));

export default function Flights() {
  const router = useRouter();
  const { t } = useTranslation();
  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("LHR");
  const [depart, setDepart] = useState(today());
  const [ret, setRet] = useState("");
  const [adults, setAdults] = useState(1);
  const [roundTrip, setRoundTrip] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: () => affiliatesApi.getLink("flights", { origin, destination, depart_date: depart, return_date: roundTrip ? ret : "", adults }),
    onSuccess: (link) => WebBrowser.openBrowserAsync(link.url),
    onError: (err) => setError(apiErrorMessage(err, t("travel.flights.errOpen"))),
  });

  function swap() { setOrigin(destination); setDestination(origin); }
  function submit() {
    setError(null);
    if (!origin || !destination) return setError(t("travel.flights.errChooseAirports"));
    if (origin === destination) return setError(t("travel.flights.errSameAirport"));
    if (!depart) return setError(t("travel.flights.errChooseDepart"));
    search.mutate();
  }

  const info = ROUTE_INFO[`${origin}-${destination}`];
  const departDate = depart ? new Date(depart + "T00:00:00") : new Date();

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("travel.flights.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Plane size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("travel.flights.title")}</Text><Text variant="caption" color="muted">{t("travel.flights.subtitle")}</Text></View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          {/* Trip type */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 5 }}>
            {([{ k: true, key: "roundTrip" }, { k: false, key: "oneWay" }] as const).map((opt) => {
              const sel = roundTrip === opt.k;
              return (
                <Pressable key={opt.key} onPress={() => setRoundTrip(opt.k)} style={{ flex: 1, height: 38, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.paper : "transparent", borderWidth: sel ? 1 : 0, borderColor: colors.hairline }}>
                  <Text variant="label" color={sel ? "green" : "muted"}>{t(`travel.flights.${opt.key}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* From / swap / To */}
          <PickerField label={t("travel.flights.from")} value={origin} options={AIRPORT_OPTIONS} onSelect={setOrigin} title={t("travel.flights.from")} />
          <View style={{ alignItems: "center", marginVertical: 8 }}>
            <Pressable onPress={swap} hitSlop={8} style={{ height: 36, width: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
              <ArrowRightLeft size={16} color={colors.brand.green} />
            </Pressable>
          </View>
          <PickerField label={t("travel.flights.to")} value={destination} options={AIRPORT_OPTIONS} onSelect={setDestination} title={t("travel.flights.to")} />

          {/* Dates */}
          <View style={{ marginTop: 14 }}>
            <DateField label={t("travel.flights.departing")} value={depart} onChange={setDepart} minimumDate={new Date()} />
          </View>
          {roundTrip ? (
            <View style={{ marginTop: 14 }}>
              <DateField label={t("travel.flights.returning")} value={ret} onChange={setRet} minimumDate={departDate} placeholder={t("travel.flights.selectReturn")} />
            </View>
          ) : null}

          {/* Passengers */}
          <Text variant="label" style={{ marginTop: 16, marginBottom: 8 }}>{t("travel.flights.passengers")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12 }}>
            <Pressable onPress={() => setAdults((n) => Math.max(1, n - 1))} hitSlop={8} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
              <Minus size={16} color={adults <= 1 ? colors.muted : colors.ink} />
            </Pressable>
            <Text variant="label" color="ink">{adults > 1 ? t("travel.flights.adultOther", { count: adults }) : t("travel.flights.adultOne", { count: adults })}</Text>
            <Pressable onPress={() => setAdults((n) => Math.min(6, n + 1))} hitSlop={8} style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
              <Plus size={16} color={adults >= 6 ? colors.muted : colors.ink} />
            </Pressable>
          </View>

          {info ? (
            <View style={{ marginTop: 14, flexDirection: "row", gap: 8, borderRadius: 12, backgroundColor: colors.mist, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Clock size={15} strokeWidth={1.75} color={colors.brand.green} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text variant="label" color="ink">{t("travel.flights.nonStop", { origin, destination, hours: info.hours })}</Text>
                <Text variant="caption" color="muted">{info.note}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 18 }}>
            <Button title={t("travel.flights.search")} onPress={submit} loading={search.isPending} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <ExternalLink size={12} color={colors.muted} />
            <Text variant="caption" color="muted">{t("travel.flights.partnerNote")}</Text>
          </View>
        </View>

        {/* Popular routes */}
        <Text variant="title" style={{ marginTop: 24, marginBottom: 12 }}>{t("travel.flights.popularRoutes")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {POPULAR_ROUTES.map((r) => {
            const active = origin === r.from && destination === r.to;
            return (
              <Pressable key={r.label} onPress={() => { setOrigin(r.from); setDestination(r.to); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: active ? colors.brand.green : colors.hairline, backgroundColor: active ? "rgba(11,115,39,0.10)" : colors.paper }}>
                <Text variant="label" color={active ? "green" : "ink"}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
