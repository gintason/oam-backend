import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Tag, MapPin, Eye, Lock, Send, CheckCircle2, Star } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { naira, shortDate } from "@/shared/lib/format";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import { messagingApi } from "@/features/messaging/api/messaging-api";
import { CONDITIONS } from "@/entities/marketplace";
import { catLabel } from "@/shared/i18n/labels";

const W = Dimensions.get("window").width;

export default function Listing() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [active, setActive] = useState(0);

  const listing = useQuery({ queryKey: ["marketplace", "listing", id], queryFn: () => marketplaceApi.detail(id), enabled: !!id });

  const enquire = useMutation({
    mutationFn: () => messagingApi.start({ kind: "listing", id, body: message.trim() }),
    onSuccess: (convo) => { setMessage(""); setError(null); router.push({ pathname: "/thread", params: { id: convo.id } }); },
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.detail.errMessage"))),
  });

  const l = listing.data;
  const images = l?.images ?? [];
  const conditionLabel = CONDITIONS.find((c) => c.value === l?.condition)?.label;
  const imgW = W - 40;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        {listing.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 40 }} />
        ) : !l ? (
          <View style={{ marginTop: 40, alignItems: "center", gap: 6 }}>
            <Text variant="title">{t("marketplace.detail.unavailableTitle")}</Text>
            <Text variant="caption" color="muted">{t("marketplace.detail.unavailableBody")}</Text>
          </View>
        ) : (
          <>
            {/* Images */}
            <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.mist }}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / imgW))}>
                {images.length > 0 ? images.map((img) => (
                  <Image key={img.id} source={{ uri: img.url }} style={{ width: imgW, height: imgW * 0.75 }} resizeMode="cover" />
                )) : <View style={{ width: imgW, height: imgW * 0.75 }} />}
              </ScrollView>
              {l.is_featured ? (
                <View style={{ position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(227,16,18,0.92)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 }}>
                  <Star size={11} color="#FFF" fill="#FFF" /><Text variant="caption" color="paper">{t("marketplace.featured")}</Text>
                </View>
              ) : null}
              {images.length > 1 ? (
                <View style={{ position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", gap: 5 }}>
                  {images.map((_, i) => <View key={i} style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: i === active ? "#FFF" : "rgba(255,255,255,0.5)" }} />)}
                </View>
              ) : null}
            </View>

            {/* Info */}
            <View style={{ marginTop: 16 }}>
              <Text variant="heading" style={{ fontSize: 20 }}>{l.title}</Text>
              <Text style={{ marginTop: 4, fontFamily: fonts.bold, fontSize: 24, color: colors.brand.red }}>
                {naira(l.price)}{l.negotiable ? <Text variant="caption" color="muted">{"  "}{t("marketplace.negotiable")}</Text> : null}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <Chip icon={<Tag size={11} strokeWidth={2} color={colors.muted} />}>{catLabel(t, l.category, l.category_name)}</Chip>
                {conditionLabel ? <Chip>{t(`marketplace.conditions.${l.condition}`, conditionLabel)}</Chip> : null}
                {l.location ? <Chip icon={<MapPin size={11} strokeWidth={2} color={colors.muted} />}>{l.location}</Chip> : null}
                <Chip icon={<Eye size={11} strokeWidth={2} color={colors.muted} />}>{t("marketplace.detail.views", { count: l.views_count })}</Chip>
              </View>

              {l.description ? (
                <Text variant="body" color="ink" style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.hairline, lineHeight: 21 }}>{l.description}</Text>
              ) : null}

              <Text variant="caption" color="muted" style={{ marginTop: 16 }}>
                {t("marketplace.detail.listedBy")} <Text variant="caption" color="ink">{l.seller_name}</Text> · {shortDate(l.created_at)}
              </Text>
            </View>

            {/* Message the seller */}
            <View style={{ marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              {sent ? (
                <View style={{ alignItems: "center", paddingVertical: 8, gap: 8 }}>
                  <CheckCircle2 size={40} strokeWidth={1.5} color={colors.brand.green} />
                  <Text variant="title">{t("marketplace.detail.messageSentTitle")}</Text>
                  <Text variant="caption" color="muted" style={{ textAlign: "center", lineHeight: 18 }}>
                    {t("marketplace.detail.messageSentBody")}
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="title">{t("marketplace.detail.messageSeller")}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    <Lock size={13} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 2 }} />
                    <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
                      {t("marketplace.detail.messageLock")}
                    </Text>
                  </View>
                  {error ? <Text variant="caption" color="danger" style={{ marginTop: 8 }}>{error}</Text> : null}
                  <TextInput
                    value={message}
                    onChangeText={(v) => { setMessage(v); setError(null); }}
                    multiline
                    placeholder={t("marketplace.detail.messagePlaceholder")}
                    placeholderTextColor={colors.muted}
                    style={{ marginTop: 12, minHeight: 84, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
                  />
                  <Pressable
                    onPress={() => { setError(null); if (message.trim()) enquire.mutate(); }}
                    disabled={!message.trim() || enquire.isPending}
                    style={{ marginTop: 12, height: 48, borderRadius: 12, backgroundColor: colors.brand.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: !message.trim() || enquire.isPending ? 0.5 : 1 }}
                  >
                    {enquire.isPending ? <ActivityIndicator color="#FFF" /> : <><Send size={16} strokeWidth={1.75} color="#FFF" /><Text variant="label" color="paper">{t("marketplace.detail.sendMessage")}</Text></>}
                  </Pressable>
                  <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: colors.mist, padding: 12 }}>
                    <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                      <Text variant="caption" color="ink">{t("marketplace.detail.safeLabel")}</Text> {t("marketplace.detail.safeBody")}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 7, backgroundColor: colors.mist, paddingHorizontal: 8, paddingVertical: 5 }}>
      {icon}<Text variant="caption" color="muted">{children}</Text>
    </View>
  );
}
