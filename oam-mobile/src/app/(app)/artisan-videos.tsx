import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Film, Trash2, Video as VideoIcon, Eye } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { uploadMediaDetailed } from "@/features/marketplace/api/uploads-api";
import { workVideosApi, type WorkVideo } from "@/features/artisans/api/work-videos-api";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";
import { VideoPlayer } from "@/features/media";

const MAX_VIDEOS = 12;
const TONE: Record<WorkVideo["status"], { fg: string; bg: string }> = {
  approved: { fg: colors.brand.green, bg: "rgba(11,115,39,0.10)" },
  pending: { fg: colors.warn, bg: "rgba(180,83,9,0.10)" },
  rejected: { fg: colors.danger, bg: "rgba(159,18,57,0.08)" },
};

/** Artisan: upload and manage videos of previous work. Live videos appear on the public profile. */
export default function ArtisanVideos() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const mine = useQuery({ queryKey: ["artisans", "me"], queryFn: homeServicesApi.me, retry: false });
  const videos = useQuery({ queryKey: ["artisans", "work-videos"], queryFn: workVideosApi.list });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["artisans", "work-videos"] });
    qc.invalidateQueries({ queryKey: ["artisans", "detail"] });
  };
  const remove = useMutation({
    mutationFn: workVideosApi.remove,
    onSuccess: refresh,
    onError: (e) => setError(apiErrorMessage(e, t("artisans.videos.errDelete", "Couldn't delete the video."))),
  });

  const list = videos.data ?? [];
  const full = list.length >= MAX_VIDEOS;

  async function addVideo() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("marketplace.post.permVideo")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1, videoMaxDuration: 180 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    // Phones report milliseconds; the web picker reports seconds.
    const ms = asset.duration ? (asset.duration < 1000 ? asset.duration * 1000 : asset.duration) : 0;
    if (ms > 0 && ms < 10_000) {
      setError(t("artisans.videos.tooShort", "Please pick a video of at least 10 seconds.")); return;
    }
    setUploading(true);
    try {
      const up = await uploadMediaDetailed("artisan_work_video", { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      await workVideosApi.add({ video_url: up.url, public_id: up.public_id, caption: caption.trim().slice(0, 200) });
      setCaption("");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, err instanceof Error ? err.message : t("artisans.verify.errUpload")));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        <Text variant="heading">{t("artisans.videos.title", "Videos of my work")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 16, lineHeight: 18 }}>
          {t("artisans.videos.subtitle", "Show customers what you can do. Videos appear on your public profile for everyone to watch.")}
        </Text>

        {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

        {/* Add */}
        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          <Text variant="label" style={{ marginBottom: 8 }}>{t("artisans.videos.captionLabel", "Caption (optional)")}</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            maxLength={200}
            placeholder={t("artisans.videos.captionPlaceholder", "e.g. Kitchen tiling in Lekki")}
            placeholderTextColor={colors.muted}
            style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
          />
          <Pressable onPress={addVideo} disabled={uploading || full}
            style={{ marginTop: 12, height: 52, borderRadius: 12, backgroundColor: colors.brand.red, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: uploading || full ? 0.55 : 1 }}>
            {uploading
              ? <><ActivityIndicator color="#FFF" /><Text variant="label" color="paper">{t("artisans.videos.uploading", "Uploading… keep the app open")}</Text></>
              : <><VideoIcon size={18} color="#FFF" /><Text variant="label" color="paper">{full ? t("artisans.videos.full", "Maximum {{n}} videos", { n: MAX_VIDEOS }) : t("artisans.videos.add", "Upload a video")}</Text></>}
          </Pressable>
          <Text variant="caption" color="muted" style={{ marginTop: 8 }}>{t("artisans.videos.hint", "10 seconds to 3 minutes. MP4 or MOV, up to 100 MB.")}</Text>
        </View>

        {mine.data?.id ? (
          <Pressable onPress={() => router.push({ pathname: "/artisan", params: { id: mine.data!.id } })} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
            <Eye size={15} color={colors.brand.green} /><Text variant="label" color="green">{t("artisans.videos.viewProfile", "See my public profile")}</Text>
          </Pressable>
        ) : null}

        {/* List */}
        <Text variant="title" style={{ marginTop: 20, marginBottom: 10 }}>{t("artisans.videos.yours", "Your videos")} ({list.length})</Text>
        {videos.isLoading ? <ActivityIndicator color={colors.brand.green} /> : list.length === 0 ? (
          <View style={{ borderRadius: 16, backgroundColor: colors.mist, padding: 20, alignItems: "center", gap: 6 }}>
            <Film size={26} color={colors.muted} />
            <Text variant="caption" color="muted">{t("artisans.videos.empty", "No videos yet.")}</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {list.map((v) => (
              <View key={v.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
                <VideoPlayer url={v.video_url} height={200} style={{ borderRadius: 0 }} />
                <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: TONE[v.status].bg }}>
                      <Text variant="caption" style={{ color: TONE[v.status].fg, fontSize: 11 }}>{t(`artisans.videos.status.${v.status}`)}</Text>
                    </View>
                    {v.caption ? <Text variant="body" color="ink">{v.caption}</Text> : null}
                    {v.status === "rejected" && v.review_note ? <Text variant="caption" color="danger">{v.review_note}</Text> : null}
                  </View>
                  <Pressable onPress={() => remove.mutate(v.id)} disabled={remove.isPending} hitSlop={8} accessibilityLabel={t("artisans.videos.delete", "Delete video")}
                    style={{ height: 38, width: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
