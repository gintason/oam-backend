import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image, TextInput, Dimensions, Share } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Tag, MapPin, Eye, Lock, Send, CheckCircle2, Star, Heart, MessageCircle, Share2 } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { naira, shortDate, money } from "@/shared/lib/format";
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
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const likeMut = useMutation({
    mutationFn: () => marketplaceApi.toggleLike(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace", "listing", id] }),
  });
  const commentsQ = useQuery({ queryKey: ["marketplace", "comments", id], queryFn: () => marketplaceApi.comments(id), enabled: !!id });
  const addComment = useMutation({
    mutationFn: (body: string) => marketplaceApi.addComment(id, body),
    onSuccess: () => { setComment(""); commentsQ.refetch(); qc.invalidateQueries({ queryKey: ["marketplace", "listing", id] }); },
  });
  async function shareListing(title: string) {
    try { await Share.share({ message: `${title} on OAM — https://oam-app.com/marketplace/${id}`, url: `https://oam-app.com/marketplace/${id}` }); } catch { /* cancelled */ }
  }

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
                {money(l.price, l.currency)}{l.negotiable ? <Text variant="caption" color="muted">{"  "}{t("marketplace.negotiable")}</Text> : null}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <Chip icon={<Tag size={11} strokeWidth={2} color={colors.muted} />}>{catLabel(t, l.category, l.category_name)}</Chip>
                {conditionLabel ? <Chip>{t(`marketplace.conditions.${l.condition}`, conditionLabel)}</Chip> : null}
                {l.location ? <Chip icon={<MapPin size={11} strokeWidth={2} color={colors.muted} />}>{l.location}</Chip> : null}
                <Chip icon={<Eye size={11} strokeWidth={2} color={colors.muted} />}>{t("marketplace.detail.views", { count: l.views_count })}</Chip>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 14 }}>
                <Pressable onPress={() => likeMut.mutate()} disabled={likeMut.isPending}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: l.liked ? colors.brand.red : colors.hairline, backgroundColor: l.liked ? "rgba(227,16,18,0.06)" : colors.paper, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Heart size={15} color={l.liked ? colors.brand.red : colors.ink} fill={l.liked ? colors.brand.red : "none"} />
                  <Text variant="caption" color={l.liked ? "red" : "ink"}>{l.likes_count ?? 0}</Text>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <MessageCircle size={15} color={colors.ink} /><Text variant="caption" color="ink">{l.comments_count ?? 0}</Text>
                </View>
                <Pressable onPress={() => shareListing(l.title)}
                  style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.hairline, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Share2 size={15} color={colors.ink} /><Text variant="caption" color="ink">{t("marketplace.detail.share", "Share")}</Text>
                </Pressable>
              </View>

              {l.description ? (
                <Text variant="body" color="ink" style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.hairline, lineHeight: 21 }}>{l.description}</Text>
              ) : null}

              <Text variant="caption" color="muted" style={{ marginTop: 16 }}>
                {t("marketplace.detail.listedBy")} <Text variant="caption" color="ink">{l.seller_name}</Text> · {shortDate(l.created_at)}
              </Text>

              <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 16 }}>
                <Text variant="title">{t("marketplace.detail.comments", "Comments")} ({l.comments_count ?? 0})</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={t("marketplace.detail.commentPlaceholder", "Write a comment…")}
                    placeholderTextColor={colors.muted}
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.ink }}
                  />
                  <Pressable onPress={() => comment.trim() && addComment.mutate(comment.trim())} disabled={addComment.isPending || !comment.trim()}
                    style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center", opacity: (addComment.isPending || !comment.trim()) ? 0.5 : 1 }}>
                    <Send size={17} color="#fff" />
                  </Pressable>
                </View>
                <View style={{ gap: 8, marginTop: 12 }}>
                  {(commentsQ.data ?? []).map((c) => (
                    <View key={c.id} style={{ borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, backgroundColor: colors.paper, padding: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text variant="label" color="ink">{c.user_name}</Text>
                        <Text variant="caption" color="muted">{shortDate(c.created_at)}</Text>
                      </View>
                      <Text variant="body" color="ink" style={{ marginTop: 4 }}>{c.body}</Text>
                    </View>
                  ))}
                  {commentsQ.data && commentsQ.data.length === 0 ? (
                    <Text variant="caption" color="muted">{t("marketplace.detail.noComments", "No comments yet. Be the first!")}</Text>
                  ) : null}
                </View>
              </View>
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
