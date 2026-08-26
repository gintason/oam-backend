import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Wrench, BadgeCheck, Star, MapPin, Clock, Lock, Send } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";
import { messagingApi } from "@/features/messaging/api/messaging-api";
import { tradeLabelByName } from "@/shared/i18n/labels";

export default function Artisan() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const artisan = useQuery({ queryKey: ["artisans", "detail", id], queryFn: () => homeServicesApi.detail(id), enabled: !!id });

  const enquire = useMutation({
    mutationFn: () => messagingApi.start({ kind: "artisan", id, body: message.trim() }),
    onSuccess: (convo) => { setMessage(""); setError(null); router.push({ pathname: "/thread", params: { id: convo.id } }); },
    onError: (err) => setError(apiErrorMessage(err, t("artisans.profile.errEnquiry"))),
  });

  const a = artisan.data;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.profile.back")}</Text>
        </Pressable>

        {artisan.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 40 }} />
        ) : !a ? (
          <View style={{ marginTop: 40, alignItems: "center" }}><Text variant="title">{t("artisans.profile.unavailable")}</Text></View>
        ) : (
          <>
            {/* Dark panel */}
            <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "#0a0a0a" }}>
              <View style={{ flexDirection: "row", gap: 14, padding: 18 }}>
                <View style={{ height: 64, width: 64, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
                  {a.profile_photo ? <Image source={{ uri: a.profile_photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Wrench size={26} strokeWidth={1.5} color="rgba(255,255,255,0.5)" />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text variant="heading" color="paper" numberOfLines={2} style={{ fontSize: 19, flexShrink: 1 }}>{a.business_name}</Text>
                    {a.is_verified ? <BadgeCheck size={17} strokeWidth={2} color={colors.brand.green} /> : null}
                  </View>
                  <Text variant="caption" color="paper" style={{ opacity: 0.6 }}>{tradeLabelByName(t, a.category_name)}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {a.is_featured ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(180,83,9,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Star size={9} color={colors.warn} fill={colors.warn} /><Text variant="caption" style={{ color: colors.warn, fontSize: 10, textTransform: "uppercase" }}>{t("artisans.featured")}</Text>
                      </View>
                    ) : null}
                    <View style={{ backgroundColor: a.is_available ? "rgba(11,115,39,0.25)" : "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text variant="caption" style={{ color: a.is_available ? "#FFF" : "rgba(255,255,255,0.6)", fontSize: 10, textTransform: "uppercase" }}>{a.is_available ? t("artisans.profile.available") : t("artisans.profile.busy")}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: colors.paper, paddingHorizontal: 18, paddingVertical: 16 }}>
                {a.description ? <Text variant="body" color="ink" style={{ lineHeight: 21 }}>{a.description}</Text> : null}
                <View style={{ flexDirection: "row", gap: 20, marginTop: a.description ? 16 : 0, paddingTop: a.description ? 16 : 0, borderTopWidth: a.description ? 1 : 0, borderTopColor: colors.hairline }}>
                  <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                    <MapPin size={14} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 2 }} />
                    <View><Text variant="caption" color="muted">{t("artisans.profile.basedIn")}</Text><Text variant="label" color="ink">{[a.city, a.state].filter(Boolean).join(", ") || "—"}{a.distance_km != null ? ` · ${a.distance_km.toFixed(1)} km` : ""}</Text></View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                    <Clock size={14} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 2 }} />
                    <View><Text variant="caption" color="muted">{t("artisans.profile.experience")}</Text><Text variant="label" color="ink">{a.years_experience ? t("artisans.profile.years", { years: a.years_experience }) : "—"}</Text></View>
                  </View>
                </View>
              </View>
            </View>

            {/* Enquiry */}
            <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              <Text variant="title">{t("artisans.profile.enquiryTitle")}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                <Lock size={13} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 2 }} />
                <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
                  {t("artisans.profile.enquiryLock", { name: a.business_name })}
                </Text>
              </View>
              {error ? <Text variant="caption" color="danger" style={{ marginTop: 8 }}>{error}</Text> : null}
              <TextInput
                value={message}
                onChangeText={(v) => { setMessage(v); setError(null); }}
                multiline
                placeholder={t("artisans.profile.enquiryPlaceholder")}
                placeholderTextColor={colors.muted}
                style={{ marginTop: 12, minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
              />
              <Pressable onPress={() => { setError(null); if (message.trim()) enquire.mutate(); }} disabled={!message.trim() || enquire.isPending} style={{ marginTop: 12, height: 48, borderRadius: 12, backgroundColor: colors.brand.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: !message.trim() || enquire.isPending ? 0.5 : 1 }}>
                {enquire.isPending ? <ActivityIndicator color="#FFF" /> : <><Send size={16} strokeWidth={1.75} color="#FFF" /><Text variant="label" color="paper">{t("artisans.profile.sendEnquiry")}</Text></>}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
