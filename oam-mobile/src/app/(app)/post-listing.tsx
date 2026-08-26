import { useState } from "react";
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, ImagePlus, VideoIcon, Film, X, CheckCircle2 } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { useAuthStore } from "@/features/auth";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import { uploadListingImage, uploadListingVideo } from "@/features/marketplace/api/uploads-api";
import { PickerField } from "@/features/travel";
import { PhoneField } from "@/features/marketplace/ui/PhoneField";
import { CONDITIONS, type ListingWrite } from "@/entities/marketplace";
import { catLabel } from "@/shared/i18n/labels";

const MAX_IMAGES = 5;
const EMPTY: ListingWrite = { category: "", title: "", description: "", price: "", currency: "NGN", negotiable: false, condition: "used", location: "", contact_phone: "", contact_whatsapp: "", images: [], videos: [] };

export default function PostListing() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<ListingWrite>({ ...EMPTY, contact_phone: user?.phone ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const set = <K extends keyof ListingWrite>(k: K, v: ListingWrite[K]) => setForm((f) => ({ ...f, [k]: v }));

  const categories = useQuery({ queryKey: ["marketplace", "categories"], queryFn: marketplaceApi.categories });
  const sub = useQuery({ queryKey: ["marketplace", "subscription"], queryFn: marketplaceApi.subscription });

  const catOptions = (categories.data ?? [])
    .filter((c) => !c.is_admin_only)
    .map((c) => ({ value: c.slug, label: catLabel(t, c.slug, c.name) }));

  const create = useMutation({
    mutationFn: () => marketplaceApi.create({ ...form, category: form.category }),
    onSuccess: (listing) => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      router.replace({ pathname: "/listing", params: { id: listing.id } });
    },
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.post.errPost"))),
  });

  async function pickImage() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("marketplace.post.permPhotos")); return; }
    const remaining = MAX_IMAGES - (form.images ?? []).length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.7, allowsMultipleSelection: true, selectionLimit: remaining,
    });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of res.assets.slice(0, remaining)) {
        const url = await uploadListingImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
        uploaded.push(url);
      }
      set("images", [...(form.images ?? []), ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("marketplace.post.errImageUpload"));
    } finally {
      setUploading(false);
    }
  }

  async function pickVideo() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("marketplace.post.permVideo")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1, videoMaxDuration: 60 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploadingVideo(true);
    try {
      const url = await uploadListingVideo({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      set("videos", [url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("marketplace.post.errVideoUpload"));
    } finally {
      setUploadingVideo(false);
    }
  }

  function submit() {
    setError(null);
    if (!form.category) return setError(t("marketplace.post.vCategory"));
    if (!form.title.trim()) return setError(t("marketplace.post.vTitle"));
    if (!form.price || Number(form.price) <= 0) return setError(t("marketplace.post.vPrice"));
    if (!form.location.trim()) return setError(t("marketplace.post.vLocation"));
    if (!form.contact_phone.trim()) return setError(t("marketplace.post.vPhone"));
    create.mutate();
  }

  const limit = sub.data?.listing_limit;
  const atLimit = limit != null && (sub.data?.active_listings ?? 0) >= limit;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        <Text variant="heading">{t("marketplace.home.sellTitle")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 20 }}>{t("marketplace.post.subtitleNew")}</Text>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}
          {atLimit ? (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(180,83,9,0.3)", backgroundColor: "rgba(180,83,9,0.05)", padding: 12 }}>
              <Text variant="caption" color="ink">{t("marketplace.post.atLimitInline", { tier: sub.data?.active_tier, limit })}</Text>
              <Pressable onPress={() => router.push("/upgrade")} style={{ marginTop: 10, alignSelf: "flex-start", height: 38, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.brand.red, alignItems: "center", justifyContent: "center" }}>
                <Text variant="label" color="paper">{t("marketplace.post.upgradePlan", "Upgrade plan")}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Photos */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("marketplace.post.photos")} <Text variant="caption" color="muted">({(form.images ?? []).length}/{MAX_IMAGES})</Text></Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {(form.images ?? []).map((url, i) => (
              <View key={url} style={{ width: 88, height: 88, borderRadius: 12, overflow: "hidden", backgroundColor: colors.mist }}>
                <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <Pressable onPress={() => set("images", (form.images ?? []).filter((_, j) => j !== i))} hitSlop={6} style={{ position: "absolute", top: 4, right: 4, height: 22, width: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                  <X size={12} color="#FFF" />
                </Pressable>
              </View>
            ))}
            {(form.images ?? []).length < MAX_IMAGES ? (
              <Pressable onPress={pickImage} disabled={uploading} style={{ width: 88, height: 88, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", gap: 4 }}>
                {uploading ? <ActivityIndicator color={colors.brand.green} /> : <><ImagePlus size={20} color={colors.muted} /><Text variant="caption" color="muted" style={{ fontSize: 10 }}>{t("marketplace.post.addPhotos")}</Text></>}
              </Pressable>
            ) : null}
          </View>

          {/* Video (optional) */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("marketplace.post.video")}</Text>
          {(form.videos ?? []).length > 0 ? (
            <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ height: 40, width: 40, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Film size={18} strokeWidth={1.75} color={colors.brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" color="ink">{t("marketplace.post.videoAttached")}</Text>
                <Text variant="caption" color="muted">{t("marketplace.post.videoAttachedHint")}</Text>
              </View>
              <Pressable onPress={() => set("videos", [])} hitSlop={6} style={{ height: 28, width: 28, borderRadius: 14, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
                <X size={14} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickVideo} disabled={uploadingVideo} style={{ marginBottom: 16, height: 56, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {uploadingVideo ? <ActivityIndicator color={colors.brand.green} /> : <><VideoIcon size={18} color={colors.muted} /><Text variant="label" color="muted">{t("marketplace.post.addVideo")}</Text></>}
            </Pressable>
          )}

          <PickerField label={t("marketplace.post.category")} value={form.category} options={catOptions} onSelect={(v) => set("category", v)} placeholder={t("marketplace.post.categoryPlaceholder")} title={t("marketplace.post.category")} searchable={false} />

          <View style={{ marginTop: 14 }}>
            <Input label={t("marketplace.post.title")} value={form.title} onChangeText={(v) => set("title", v)} placeholder={t("marketplace.post.titlePlaceholder")} />
          </View>

          <Text variant="label" style={{ marginBottom: 8 }}>{t("marketplace.post.description")}</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => set("description", v)}
            multiline
            placeholder={t("marketplace.post.descriptionPlaceholder")}
            placeholderTextColor={colors.muted}
            style={{ marginBottom: 14, minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Input label={t("marketplace.post.price")} value={form.price} onChangeText={(v) => set("price", v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder={t("marketplace.post.pricePlaceholder")} /></View>
            <View style={{ flex: 1 }}><Input label={t("marketplace.post.location")} value={form.location} onChangeText={(v) => set("location", v)} placeholder={t("marketplace.post.locationPlaceholder")} /></View>
          </View>

          {/* Condition */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("marketplace.post.condition")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {CONDITIONS.map((c) => {
              const sel = form.condition === c.value;
              return (
                <Pressable key={c.value} onPress={() => set("condition", c.value)} style={{ flex: 1, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.10)" : colors.paper }}>
                  <Text variant="caption" color={sel ? "green" : "ink"}>{t(`marketplace.conditions.${c.value}`, c.label)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Negotiable */}
          <Pressable onPress={() => set("negotiable", !form.negotiable)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ height: 22, width: 22, borderRadius: 6, borderWidth: 2, borderColor: form.negotiable ? colors.brand.green : colors.hairline, backgroundColor: form.negotiable ? colors.brand.green : colors.paper, alignItems: "center", justifyContent: "center" }}>
              {form.negotiable ? <CheckCircle2 size={14} color="#FFF" /> : null}
            </View>
            <Text variant="label" color="ink">{t("marketplace.post.negotiableLabel")}</Text>
          </Pressable>

          <View style={{ paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.hairline }}>
            <Text variant="label" style={{ marginTop: 14, marginBottom: 2 }}>{t("marketplace.post.contactHeading")}</Text>
            <View style={{ marginTop: 8 }}>
              <PhoneField label={t("marketplace.post.phone")} initial={form.contact_phone} onChange={(full) => set("contact_phone", full)} placeholder={t("marketplace.post.phonePlaceholder")} />
            </View>
            <PhoneField label={t("marketplace.post.whatsapp")} initial={form.contact_whatsapp} onChange={(full) => set("contact_whatsapp", full)} placeholder={t("marketplace.post.phonePlaceholder")} />
          </View>

          <View style={{ marginTop: 6 }}>
            <Button title={t("marketplace.post.submitPost")} onPress={submit} loading={create.isPending} disabled={atLimit} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
