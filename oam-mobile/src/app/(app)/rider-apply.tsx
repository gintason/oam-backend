/** Rider sign-up: details, vehicle, photo and documents (ID, licence, vehicle papers). */
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, CheckCircle2, FileText, Upload } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useAuthStore } from "@/features/auth";
import { pickDocument } from "@/features/jobs/pickers";
import type { PickedMedia } from "@/features/marketplace/api/uploads-api";
import { riderApi, uploadDeliveriesFile, VEHICLES, type DocKind, type RiderProfile, type VehicleType } from "@/features/deliveries";
import { BankFields, type BankValue } from "@/features/deliveries/ui/BankFields";
import { Card, Chip, DeliveriesScreen, ErrorNote, Field, Loading, PillButton, TextBox, useActionSheet } from "@/features/deliveries/ui/kit";

const DOCS: { kind: DocKind; label: string; hint: string; requiredFor: (v: VehicleType) => boolean }[] = [
  { kind: "id_card", label: "Government ID", hint: "NIN slip, voter's card, passport or driver's licence", requiredFor: () => true },
  { kind: "license", label: "Rider's / driver's licence", hint: "Required for motorcycles, cars and vans", requiredFor: (v) => v !== "bicycle" },
  { kind: "vehicle", label: "Vehicle papers", hint: "Registration or proof of ownership (optional)", requiredFor: () => false },
  { kind: "selfie", label: "Selfie holding your ID", hint: "Helps us verify faster (optional)", requiredFor: () => false },
];

export default function RiderApply() {
  const me = useQuery({ queryKey: ["rider", "me"], queryFn: riderApi.me });
  if (me.isLoading) return <DeliveriesScreen title="Rider sign-up" tabs={false}><Loading /></DeliveriesScreen>;
  return <Form existing={me.data ?? null} />;
}

function Form({ existing }: { existing: RiderProfile | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const sheet = useActionSheet();
  const [v, setV] = useState(() => ({
    full_name: existing?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    phone: existing?.phone || (user as { phone?: string } | null)?.phone || "",
    city: existing?.city || "Lagos",
    vehicle_type: (existing?.vehicle_type || "motorcycle") as VehicleType,
    vehicle_plate: existing?.vehicle_plate || "",
    vehicle_description: existing?.vehicle_description || "",
    photo_url: existing?.photo_url || "",
  }));
  const [docs, setDocs] = useState<Partial<Record<DocKind, string>>>(() =>
    Object.fromEntries((existing?.documents ?? []).map((d) => [d.kind, d.url])));
  const [bank, setBank] = useState<BankValue>(() => ({
    bank_code: existing?.payout_account?.bank_code ?? "", bank_name: existing?.payout_account?.bank_name ?? "",
    account_number: "", account_name: "",
  }));
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(source: "camera" | "library" | "file"): Promise<PickedMedia | null> {
    if (source === "file") return pickDocument(["application/pdf", "image/*"]);
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", `Allow ${source === "camera" ? "camera" : "photo"} access in Settings.`); return null; }
    const r = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (r.canceled || !r.assets?.length) return null;
    const a = r.assets[0];
    return { uri: a.uri, fileName: a.fileName ?? `doc_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg" };
  }

  function upload(key: DocKind | "photo") {
    const run = async (source: "camera" | "library" | "file") => {
      const file = await choose(source);
      if (!file) return;
      setUploading(key); setError(null);
      try {
        const url = await uploadDeliveriesFile(key === "photo" ? "rider_photo" : "rider_document", file);
        if (key === "photo") setV((x) => ({ ...x, photo_url: url }));
        else setDocs((d) => ({ ...d, [key]: url }));
      } catch (e) { setError((e as Error).message || "Upload failed."); } finally { setUploading(null); }
    };
    sheet.show("Add a photo", [
      { label: "Take photo", run: () => run("camera") },
      { label: "Choose from gallery", run: () => run("library") },
      ...(key !== "photo" ? [{ label: "Upload PDF", run: () => run("file") }] : []),
    ]);
  }

  const missing = DOCS.filter((d) => d.requiredFor(v.vehicle_type) && !docs[d.kind]).map((d) => d.label);
  const needsPlate = v.vehicle_type !== "bicycle" && !v.vehicle_plate.trim();
  const bankOk = Boolean(bank.bank_code && /^\d{10}$/.test(bank.account_number) && bank.account_name);
  if (!bankOk) missing.push("bank account");
  const ok = v.full_name.trim().length >= 3 && /^\+?[0-9 ()-]{7,20}$/.test(v.phone.trim()) && !missing.length && !needsPlate;

  const submit = useMutation({
    mutationFn: () => riderApi.apply({
      ...v, bank_code: bank.bank_code, account_number: bank.account_number,
      documents: (Object.entries(docs) as [DocKind, string][]).filter(([, url]) => url).map(([kind, url]) => ({ kind, url })),
    }),
    onSuccess: (r) => { qc.setQueryData(["rider", "me"], r); router.replace("/rider" as never); },
    onError: (e) => setError(apiErrorMessage(e, "Couldn't submit your application.")),
  });

  const back = (
    <Pressable onPress={() => router.replace("/rider" as never)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <ArrowLeft size={16} color={colors.brand.green} /><Text variant="label" color="green">Ride & earn</Text>
    </Pressable>
  );

  return (
    <DeliveriesScreen title="Rider sign-up" subtitle="We review applications within a day." tabs={false} back={back}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable onPress={() => upload("photo")} accessibilityLabel="Profile photo"
          style={{ height: 76, width: 76, borderRadius: 38, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.hairline }}>
          {uploading === "photo" ? <ActivityIndicator color={colors.brand.green} />
            : v.photo_url ? <Image source={{ uri: v.photo_url }} style={{ height: 76, width: 76 }} /> : <Camera size={24} color={colors.muted} />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title" style={{ fontSize: 15 }}>Profile photo</Text>
          <Text variant="caption" color="muted">Customers see this when you're on the way. Clear face, no sunglasses.</Text>
        </View>
      </View>

      <Field label="Full name (as on your ID)"><TextBox value={v.full_name} onChangeText={(t) => setV({ ...v, full_name: t })} /></Field>
      <Field label="Phone number" hint="Customers call this number during a delivery."><TextBox value={v.phone} onChangeText={(t) => setV({ ...v, phone: t })} keyboardType="phone-pad" /></Field>
      <Field label="City"><TextBox value={v.city} onChangeText={(t) => setV({ ...v, city: t })} /></Field>

      <Text variant="title" style={{ marginTop: 4 }}>Vehicle</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {VEHICLES.map((o) => <Chip key={o.value} label={o.label} active={v.vehicle_type === o.value} onPress={() => setV({ ...v, vehicle_type: o.value })} />)}
      </View>
      {v.vehicle_type !== "bicycle" ? (
        <Field label="Plate number"><TextBox value={v.vehicle_plate} onChangeText={(t) => setV({ ...v, vehicle_plate: t.toUpperCase() })} placeholder="e.g. LAG-123-XY" autoCapitalize="characters" /></Field>
      ) : null}
      <Field label="Make, model & colour (optional)"><TextBox value={v.vehicle_description} onChangeText={(t) => setV({ ...v, vehicle_description: t })} placeholder="e.g. Red Bajaj Boxer" /></Field>

      <Text variant="title" style={{ marginTop: 4 }}>Documents</Text>
      {DOCS.map((d) => {
        const url = docs[d.kind];
        const required = d.requiredFor(v.vehicle_type);
        return (
          <Card key={d.kind} onPress={() => upload(d.kind)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderColor: url ? "rgba(11,115,39,0.35)" : colors.hairline }}>
            <View style={{ height: 44, width: 44, borderRadius: 10, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {uploading === d.kind ? <ActivityIndicator color={colors.brand.green} />
                : url && !/\.pdf($|\?)/i.test(url) ? <Image source={{ uri: url }} style={{ height: 44, width: 44 }} />
                : url ? <FileText size={20} color={colors.brand.green} /> : <Upload size={20} color={colors.muted} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ fontSize: 14.5 }}>{d.label}{required ? " *" : ""}</Text>
              <Text variant="caption" color="muted">{url ? "Uploaded — tap to replace" : d.hint}</Text>
            </View>
            {url ? <CheckCircle2 size={20} color={colors.brand.green} /> : null}
          </Card>
        );
      })}

      <Text variant="title" style={{ marginTop: 4 }}>Where should we pay you?</Text>
      <Text variant="caption" color="muted">Your 80% of every delivery paid in the app is sent straight to this account. It must be in your name.</Text>
      <BankFields value={bank} onChange={setBank} />

      {missing.length ? <Text variant="caption" color="muted">Still needed: {missing.join(", ")}.</Text> : null}
      <ErrorNote>{error}</ErrorNote>
      <PillButton label={existing ? "Submit for review" : "Submit application"} tone="red" style={{ height: 50 }} disabled={!ok || Boolean(uploading)} loading={submit.isPending} onPress={() => submit.mutate()} />
      <Text variant="caption" color="muted" style={{ textAlign: "center" }}>By applying you agree to OAM's rider terms. Documents are used only for verification.</Text>
      {sheet.sheet}
    </DeliveriesScreen>
  );
}
