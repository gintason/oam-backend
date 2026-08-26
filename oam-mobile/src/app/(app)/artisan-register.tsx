import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { PickerField } from "@/features/travel";
import { PhoneField } from "@/features/marketplace/ui/PhoneField";
import { uploadMedia } from "@/features/marketplace/api/uploads-api";
import { homeServicesApi } from "@/features/artisans/api/homeservices-api";
import { CITIES, type ArtisanWrite } from "@/entities/homeservices";
import { tradeLabel } from "@/shared/i18n/labels";

const EMPTY: ArtisanWrite = {
  category: "", profile_photo: "", business_name: "", description: "", phone: "", whatsapp: "",
  address: "", city: "Abuja", state: "", years_experience: 0, is_available: true,
  latitude: CITIES[0].lat, longitude: CITIES[0].lng,
};

export default function ArtisanRegister() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<ArtisanWrite>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof ArtisanWrite>(k: K, v: ArtisanWrite[K]) => setForm((f) => ({ ...f, [k]: v }));

  const categories = useQuery({ queryKey: ["artisans", "categories"], queryFn: homeServicesApi.categories });
  const mine = useQuery({ queryKey: ["artisans", "me"], queryFn: homeServicesApi.me, retry: false });

  // Prefill when editing an existing profile.
  useEffect(() => {
    const m = mine.data;
    if (m?.id) {
      setForm((f) => ({
        ...f, category: m.category ?? f.category, profile_photo: m.profile_photo ?? "",
        business_name: m.business_name ?? "", description: m.description ?? "",
        phone: m.phone ?? "", whatsapp: m.whatsapp ?? "", address: m.address ?? "",
        city: m.city || f.city, state: m.state ?? "", years_experience: m.years_experience ?? 0,
        is_available: m.is_available ?? true,
        latitude: m.latitude ?? f.latitude, longitude: m.longitude ?? f.longitude,
      }));
    }
  }, [mine.data]);

  const catOptions = (categories.data ?? []).map((c) => ({ value: c.slug, label: tradeLabel(t, c.slug, c.name) }));

  function pickCity(name: string) {
    const c = CITIES.find((x) => x.name === name);
    setForm((f) => ({ ...f, city: name, latitude: c?.lat ?? f.latitude, longitude: c?.lng ?? f.longitude }));
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("artisans.dashboard.permPhoto")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const url = await uploadMedia("artisan_profile_photo", { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      set("profile_photo", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("artisans.dashboard.errPhotoUpload"));
    } finally { setUploading(false); }
  }

  const save = useMutation({
    mutationFn: () => homeServicesApi.register(form),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["artisans"] });
      router.replace({ pathname: "/artisan", params: { id: a.id } });
    },
    onError: (err) => setError(apiErrorMessage(err, t("artisans.dashboard.errSave"))),
  });

  function submit() {
    setError(null);
    if (!form.business_name.trim()) return setError(t("artisans.dashboard.vBusiness"));
    if (!form.category) return setError(t("artisans.dashboard.vTrade"));
    if (!form.phone.trim()) return setError(t("artisans.dashboard.vPhone"));
    if (!form.city) return setError(t("artisans.dashboard.vCity"));
    save.mutate();
  }

  const editing = !!mine.data?.id;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("artisans.dashboard.backHome")}</Text>
        </Pressable>

        <Text variant="heading">{editing ? t("artisans.dashboard.editTitle") : t("artisans.hub.profileActionNew")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 20 }}>{t("artisans.dashboard.subNew")}</Text>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          {/* Profile photo */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable onPress={pickPhoto} disabled={uploading} style={{ height: 96, width: 96, borderRadius: 20, overflow: "hidden", backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
              {uploading ? <ActivityIndicator color={colors.brand.green} /> : form.profile_photo ? <Image source={{ uri: form.profile_photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Camera size={26} color={colors.muted} />}
            </Pressable>
            <Text variant="caption" color="muted" style={{ marginTop: 6 }}>{form.profile_photo ? t("artisans.dashboard.changePhoto") : t("artisans.dashboard.addPhoto")}</Text>
          </View>

          <Input label={t("artisans.dashboard.businessLabel")} value={form.business_name} onChangeText={(v) => set("business_name", v)} placeholder={t("artisans.dashboard.businessPlaceholder")} />
          <PickerField label={t("artisans.dashboard.tradeLabel")} value={form.category} options={catOptions} onSelect={(v) => set("category", v)} placeholder={t("artisans.dashboard.tradeChoose")} title={t("artisans.dashboard.tradeLabel")} searchable={false} />

          <Text variant="label" style={{ marginTop: 14, marginBottom: 8 }}>{t("artisans.dashboard.whatLabel")}</Text>
          <TextInput value={form.description} onChangeText={(v) => set("description", v)} multiline placeholder={t("artisans.dashboard.whatPlaceholder")} placeholderTextColor={colors.muted} style={{ marginBottom: 14, minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }} />

          <PhoneField label={t("artisans.dashboard.phoneLabel")} initial={form.phone} onChange={(full) => set("phone", full)} placeholder={t("artisans.dashboard.phonePlaceholder")} />
          <PhoneField label={t("artisans.dashboard.whatsappLabel")} initial={form.whatsapp} onChange={(full) => set("whatsapp", full)} placeholder={t("artisans.dashboard.whatsappPlaceholder")} />

          <View style={{ marginTop: 2 }}>
            <PickerField label={t("artisans.dashboard.cityLabel")} value={form.city} options={CITIES.map((c) => ({ value: c.name, label: c.name }))} onSelect={pickCity} title={t("artisans.dashboard.cityLabel")} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1 }}><Input label={t("artisans.dashboard.stateLabel")} value={form.state} onChangeText={(v) => set("state", v)} placeholder={t("artisans.dashboard.statePlaceholder")} /></View>
            <View style={{ flex: 1 }}><Input label={t("artisans.dashboard.yearsLabel")} value={form.years_experience ? String(form.years_experience) : ""} onChangeText={(v) => set("years_experience", Number(v.replace(/[^\d]/g, "")) || 0)} keyboardType="number-pad" placeholder={t("artisans.dashboard.yearsPlaceholder")} /></View>
          </View>

          <Input label={t("artisans.dashboard.addressLabel")} value={form.address} onChangeText={(v) => set("address", v)} placeholder={t("artisans.dashboard.addressPlaceholder")} />

          {/* Availability */}
          <Pressable onPress={() => set("is_available", !form.is_available)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 14, marginBottom: 8 }}>
            <View><Text variant="label" color="ink">{t("artisans.dashboard.availableForWork")}</Text><Text variant="caption" color="muted">{t("artisans.dashboard.availableHint")}</Text></View>
            <View style={{ height: 28, width: 48, borderRadius: 14, backgroundColor: form.is_available ? colors.brand.green : colors.hairline, justifyContent: "center", paddingHorizontal: 3, alignItems: form.is_available ? "flex-end" : "flex-start" }}>
              <View style={{ height: 22, width: 22, borderRadius: 11, backgroundColor: "#FFF" }} />
            </View>
          </Pressable>

          <View style={{ marginTop: 8 }}>
            <Button title={editing ? t("artisans.dashboard.saveChanges") : t("artisans.dashboard.createProfile")} onPress={submit} loading={save.isPending} />
          </View>
          {!editing ? (
            <View style={{ marginTop: 12, borderRadius: 10, backgroundColor: colors.mist, padding: 12, flexDirection: "row", gap: 8 }}>
              <CheckCircle2 size={15} color={colors.brand.green} style={{ marginTop: 1 }} />
              <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>{t("artisans.dashboard.getVerifiedBody")}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
