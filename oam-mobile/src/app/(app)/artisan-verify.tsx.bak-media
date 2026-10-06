import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Check, ImagePlus, X, Film, Video as VideoIcon, IdCard, Lock, ShieldCheck, BadgeCheck, Clock } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { uploadMediaDetailed } from "@/features/marketplace/api/uploads-api";
import { verificationApi } from "@/features/artisans/api/verification-api";
import type { VerificationStatus } from "@/entities/homeservices";

const TONE: Record<string, "muted" | "warn" | "green" | "danger"> = {
  draft: "muted", incomplete: "warn", pending: "warn", approved: "green", rejected: "danger",
};

export default function ArtisanVerify() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "images" | "video" | "id">(null);

  const verification = useQuery({ queryKey: ["artisans", "verification"], queryFn: verificationApi.get, retry: false });
  const v = verification.data;
  const status: VerificationStatus = v?.status ?? "draft";
  const tone = TONE[status] ?? "muted";
  const locked = status === "pending" || status === "approved";
  const req = v?.requirements;
  const readyToSubmit = Boolean(req?.service_images.done && req?.work_video.done && req?.id_document.done);

  const refresh = () => qc.invalidateQueries({ queryKey: ["artisans", "verification"] });

  const attach = useMutation({ mutationFn: verificationApi.attach, onSuccess: refresh, onError: (e) => setError(apiErrorMessage(e, t("artisans.verify.errAttach"))) });
  const removeImage = useMutation({ mutationFn: verificationApi.removeImage, onSuccess: refresh });
  const submit = useMutation({
    mutationFn: verificationApi.submit,
    onSuccess: () => refresh(),
    onError: (e) => setError(apiErrorMessage(e, t("artisans.verify.errSubmit"))),
  });

  async function addServiceImages() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("artisans.verify.permWorkPhotos")); return; }
    const remaining = (req?.service_images.max ?? 8) - (v?.service_images.length ?? 0);
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: remaining });
    if (res.canceled || !res.assets?.length) return;
    setBusy("images");
    try {
      for (const asset of res.assets.slice(0, remaining)) {
        const up = await uploadMediaDetailed("artisan_service_image", { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
        await attach.mutateAsync({ purpose: "artisan_service_image", public_id: up.public_id, url: up.url });
      }
    } catch (err) { setError(err instanceof Error ? err.message : t("artisans.verify.errUpload")); } finally { setBusy(null); }
  }

  async function addWorkVideo() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("marketplace.post.permVideo")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1, videoMaxDuration: 60 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy("video");
    try {
      const up = await uploadMediaDetailed("artisan_work_video", { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      await attach.mutateAsync({ purpose: "artisan_work_video", public_id: up.public_id, url: up.url });
    } catch (err) { setError(err instanceof Error ? err.message : t("artisans.verify.errUpload")); } finally { setBusy(null); }
  }

  async function addIdDocument() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("artisans.verify.permId")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusy("id");
    try {
      const up = await uploadMediaDetailed("artisan_id_document", { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      await attach.mutateAsync({ purpose: "artisan_id_document", public_id: up.public_id }); // no url — kept private
    } catch (err) { setError(err instanceof Error ? err.message : t("artisans.verify.errUpload")); } finally { setBusy(null); }
  }

  const toneColor = tone === "green" ? colors.brand.green : tone === "warn" ? colors.warn : tone === "danger" ? colors.danger : colors.muted;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.verify.backMyProfile")}</Text>
        </Pressable>

        <Text variant="heading">{t("artisans.verify.title")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 16 }}>{t("artisans.verify.subtitle")}</Text>

        {verification.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* Status */}
            <View style={{ borderRadius: 16, backgroundColor: "#0a0a0a", padding: 18 }}>
              <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Text variant="label" style={{ color: toneColor, fontSize: 12 }}>{t(`artisans.verify.status.${status}.label`)}</Text>
              </View>
              <Text variant="body" color="paper" style={{ opacity: 0.75, marginTop: 10, lineHeight: 20 }}>{t(`artisans.verify.status.${status}.note`)}</Text>
              {status === "rejected" && v?.decision_note ? (
                <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: "rgba(159,18,57,0.2)", padding: 12 }}>
                  <Text variant="caption" style={{ color: "#FCA5A5" }}>{v.decision_note}</Text>
                </View>
              ) : null}
            </View>

            {error ? <View style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

            {/* 1. Service images */}
            <Card>
              <Step n={1} done={Boolean(req?.service_images.done)} title={t("artisans.verify.step1Title")} subtitle={t("artisans.verify.step1Subtitle", { need: req?.service_images.need ?? 2, max: req?.service_images.max ?? 8 })} />
              {v && v.service_images.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                  {v.service_images.map((img) => (
                    <View key={img.id} style={{ width: 88, height: 88, borderRadius: 12, overflow: "hidden", backgroundColor: colors.mist }}>
                      <Image source={{ uri: img.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      {!locked ? (
                        <Pressable onPress={() => removeImage.mutate(img.id)} hitSlop={6} style={{ position: "absolute", top: 4, right: 4, height: 22, width: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                          <X size={12} color="#FFF" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {!locked && (v?.service_images.length ?? 0) < (req?.service_images.max ?? 8) ? (
                <Pressable onPress={addServiceImages} disabled={busy === "images"} style={{ marginTop: 14, height: 52, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {busy === "images" ? <ActivityIndicator color={colors.brand.green} /> : <><ImagePlus size={18} color={colors.muted} /><Text variant="label" color="muted">{t("marketplace.post.addPhotos")}</Text></>}
                </Pressable>
              ) : null}
            </Card>

            {/* 2. Work video */}
            <Card>
              <Step n={2} done={Boolean(req?.work_video.done)} title={t("artisans.verify.step2Title")} subtitle={t("artisans.verify.step2Subtitle")} />
              {v?.has_work_video ? (
                <View style={{ marginTop: 14, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.08)", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Film size={16} color={colors.brand.green} /><Text variant="label" color="green">{t("artisans.verify.videoUploaded")}</Text>
                </View>
              ) : null}
              {!locked ? (
                <Pressable onPress={addWorkVideo} disabled={busy === "video"} style={{ marginTop: 14, height: 52, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {busy === "video" ? <ActivityIndicator color={colors.brand.green} /> : <><VideoIcon size={18} color={colors.muted} /><Text variant="label" color="muted">{v?.has_work_video ? t("artisans.verify.replaceVideo") : t("artisans.verify.addVideo")}</Text></>}
                </Pressable>
              ) : null}
            </Card>

            {/* 3. ID document */}
            <Card>
              <Step n={3} done={Boolean(req?.id_document.done)} title={t("artisans.verify.step3Title")} subtitle={t("artisans.verify.step3Subtitle")} />
              <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.25)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12, flexDirection: "row", gap: 8 }}>
                <Lock size={14} strokeWidth={1.75} color={colors.brand.green} style={{ marginTop: 1 }} />
                <Text variant="caption" color="ink" style={{ flex: 1, lineHeight: 18 }}>
                  <Text variant="caption" color="ink">{t("artisans.verify.idPrivateLabel")} </Text>
                  {t("artisans.verify.idPrivateBody")}
                </Text>
              </View>
              {v?.has_id_document ? (
                <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.08)", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Check size={14} strokeWidth={2.5} color={colors.brand.green} /><Text variant="label" color="green">{t("artisans.verify.documentUploaded")}</Text>
                </View>
              ) : null}
              {!locked ? (
                <Pressable onPress={addIdDocument} disabled={busy === "id"} style={{ marginTop: 12, height: 52, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {busy === "id" ? <ActivityIndicator color={colors.brand.green} /> : <><IdCard size={18} color={colors.muted} /><Text variant="label" color="muted">{v?.has_id_document ? t("artisans.verify.replaceId") : t("artisans.verify.uploadId")}</Text></>}
                </Pressable>
              ) : null}
            </Card>

            {/* Submit / status */}
            {status === "approved" ? (
              <View style={{ marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", padding: 20, alignItems: "center" }}>
                <BadgeCheck size={26} strokeWidth={1.75} color={colors.brand.green} />
                <Text variant="label" color="ink" style={{ marginTop: 8 }}>{t("artisans.verify.approvedTitle")}</Text>
                <Text variant="caption" color="muted" style={{ marginTop: 2, textAlign: "center" }}>{t("artisans.verify.approvedBody")}</Text>
              </View>
            ) : status === "pending" ? (
              <View style={{ marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(180,83,9,0.3)", backgroundColor: "rgba(180,83,9,0.05)", padding: 20, alignItems: "center" }}>
                <Clock size={24} strokeWidth={1.75} color={colors.warn} />
                <Text variant="label" color="ink" style={{ marginTop: 8 }}>{t("artisans.verify.pendingTitle")}</Text>
                <Text variant="caption" color="muted" style={{ marginTop: 2, textAlign: "center", lineHeight: 18 }}>{t("artisans.verify.pendingBody")}</Text>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Button title={t("artisans.verify.submitForReview")} onPress={() => { setError(null); submit.mutate(); }} loading={submit.isPending} disabled={!readyToSubmit} />
                {!readyToSubmit ? <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>{t("artisans.verify.addAllThree")}</Text> : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>{children}</View>;
}

function Step({ n, done, title, subtitle }: { n: number; done: boolean; title: string; subtitle: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ height: 36, width: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.brand.green : colors.mist }}>
        {done ? <Check size={17} strokeWidth={3} color="#FFF" /> : <Text variant="label" color="muted">{n}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15.5 }}>{title}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 1, lineHeight: 18 }}>{subtitle}</Text>
      </View>
    </View>
  );
}
