import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Switch, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Car, Plus, Trash2, Eye, Check, X, Gauge, Loader2 } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { naira, shortDate } from "@/shared/lib/format";
import { apiErrorMessage } from "@/shared/api";
import { useAuthStore } from "@/features/auth";
import { uploadListingImage } from "@/features/marketplace/api/uploads-api";
import { motorsApi, EMPTY_VEHICLE, TRANSMISSIONS, FUELS, BODY_TYPES, CONDITIONS, type Vehicle, type MotorsListing } from "@/features/motors";

export default function MotorsAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isStaff = Boolean((user as { is_staff?: boolean; is_superuser?: boolean } | null)?.is_staff || (user as { is_superuser?: boolean } | null)?.is_superuser);
  const [adding, setAdding] = useState(false);

  const inventory = useQuery({ queryKey: ["motors", "inventory"], queryFn: () => motorsApi.list(), enabled: isStaff, retry: false });
  const remove = useMutation({ mutationFn: motorsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ["motors"] }) });

  if (!isStaff) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 }}>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>This area is for OAM staff.</Text>
          <Button title="Back to Marketplace" onPress={() => router.replace("/marketplace")} />
        </View>
      </Screen>
    );
  }

  const items = inventory.data?.results ?? [];
  const active = items.filter((l) => l.status === "active").length;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => (adding ? setAdding(false) : router.back())} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">Back</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Car size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">Motors Admin</Text>
            <Text variant="caption" color="muted">O.A.M Motors vehicle inventory</Text>
          </View>
        </View>

        {adding ? (
          <VehicleForm onDone={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["motors"] }); }} onCancel={() => setAdding(false)} />
        ) : (
          <>
            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <StatCard label="Listings" value={String(inventory.data?.count ?? items.length)} />
              <StatCard label="Active" value={String(active)} accent />
            </View>

            <Button title="Add vehicle" onPress={() => setAdding(true)} style={{ marginBottom: 18 }} />

            {inventory.isLoading ? (
              <ActivityIndicator color={colors.brand.green} style={{ marginTop: 20 }} />
            ) : inventory.isError ? (
              <Text variant="body" color="muted">Couldn't load the inventory.</Text>
            ) : items.length === 0 ? (
              <Text variant="body" color="muted">No vehicles listed yet. Tap "Add vehicle" to list one.</Text>
            ) : (
              items.map((l) => (
                <VehicleRow
                  key={l.id}
                  listing={l}
                  removing={remove.isPending && remove.variables === l.id}
                  onRemove={() =>
                    Alert.alert("Remove vehicle", `Remove "${l.title}" from sale?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => remove.mutate(l.id) },
                    ])
                  }
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14, alignItems: "center" }}>
      <Text variant="heading" color={accent ? "green" : "ink"}>{value}</Text>
      <Text variant="caption" color="muted">{label}</Text>
    </View>
  );
}

function VehicleRow({ listing, onRemove, removing }: { listing: MotorsListing; onRemove: () => void; removing: boolean }) {
  const v = listing.vehicle;
  const cover = listing.images.find((i) => i.is_primary) ?? listing.images[0];
  const sold = listing.status !== "active";
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, marginBottom: 10 }}>
      <View style={{ height: 64, width: 64, borderRadius: 12, overflow: "hidden", backgroundColor: colors.mist }}>
        {cover ? <Image source={{ uri: cover.url }} style={{ height: 64, width: 64 }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Car size={22} color={colors.muted} /></View>}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" color="ink" numberOfLines={1}>{listing.title}</Text>
        <Text variant="label" color="red" style={{ marginTop: 2 }}>{naira(listing.price)}{listing.negotiable ? " · neg." : ""}</Text>
        {v ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {v.mileage_km != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Gauge size={11} color={colors.muted} /><Text variant="caption" color="muted">{v.mileage_km.toLocaleString()} km</Text>
              </View>
            ) : null}
            <Text variant="caption" color="muted">{v.transmission} · {v.fuel}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Eye size={11} color={colors.muted} /><Text variant="caption" color="muted">{listing.views_count}</Text></View>
          <Text variant="caption" color="muted">{shortDate(listing.created_at)}</Text>
          {sold ? <Text variant="caption" color="muted">· {listing.status}</Text> : null}
        </View>
      </View>
      <Pressable onPress={onRemove} disabled={removing} hitSlop={6} style={{ height: 34, width: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.08)" }}>
        {removing ? <ActivityIndicator size="small" color={colors.brand.red} /> : <Trash2 size={16} color={colors.brand.red} />}
      </Pressable>
    </View>
  );
}

function VehicleForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY_VEHICLE);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [condition, setCondition] = useState("used");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setVehicle((v) => ({ ...v, [key]: value }));
  }

  const create = useMutation({
    mutationFn: () =>
      motorsApi.create({
        description, price, location, condition, negotiable,
        contact_phone: phone, contact_whatsapp: whatsapp || undefined,
        vehicle, images,
      }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err, "Couldn't list the vehicle. Try again.")),
  });

  async function pickImage() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.7 });
    if (res.canceled) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of res.assets) {
        const url = await uploadListingImage({ uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? undefined });
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't upload a photo. Try again."));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    if (!vehicle.make.trim()) return setError("Enter the make, e.g. Toyota.");
    if (!vehicle.model_name.trim()) return setError("Enter the model, e.g. Camry.");
    if (!price) return setError("Enter a price.");
    if (images.length === 0) return setError("Add at least one photo — nobody buys a car they can't see.");
    if (!phone) return setError("Add a contact number.");
    create.mutate();
  }

  const headline = `${vehicle.year} ${vehicle.make} ${vehicle.model_name}`.trim();

  return (
    <View style={{ gap: 14 }}>
      {error ? <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

      <Card>
        <Row><HalfInput label="Make" value={vehicle.make} onChangeText={(v) => set("make", v)} placeholder="Toyota" /><HalfInput label="Model" value={vehicle.model_name} onChangeText={(v) => set("model_name", v)} placeholder="Camry" /></Row>
        <Row>
          <HalfInput label="Year" value={String(vehicle.year || "")} keyboardType="number-pad" onChangeText={(v) => set("year", Number(v.replace(/\D/g, "").slice(0, 4)) || 0)} />
          <HalfInput label="Mileage (km)" value={vehicle.mileage_km?.toString() ?? ""} keyboardType="number-pad" onChangeText={(v) => set("mileage_km", v ? Number(v.replace(/\D/g, "")) : null)} placeholder="e.g. 82000" />
        </Row>
        {headline ? <Text variant="caption" color="muted">Listing title will be <Text variant="caption" color="ink">{headline}</Text></Text> : null}
        <Row><HalfSelect label="Transmission" value={vehicle.transmission} onChange={(v) => set("transmission", v)} options={TRANSMISSIONS} /><HalfSelect label="Fuel" value={vehicle.fuel} onChange={(v) => set("fuel", v)} options={FUELS} /></Row>
        <HalfSelect label="Body type" value={vehicle.body_type} onChange={(v) => set("body_type", v)} options={BODY_TYPES} full />
        <Row><HalfInput label="Colour" value={vehicle.colour} onChangeText={(v) => set("colour", v)} placeholder="Silver" /><HalfInput label="Engine" value={vehicle.engine_size} onChangeText={(v) => set("engine_size", v)} placeholder="2.4L" /></Row>
        <Row>
          <HalfInput label="Seats" value={vehicle.seats?.toString() ?? ""} keyboardType="number-pad" onChangeText={(v) => set("seats", v ? Number(v.replace(/\D/g, "")) : null)} placeholder="5" />
          <View style={{ flex: 1 }} />
        </Row>
        <ToggleRow label="Registered" checked={vehicle.is_registered} onChange={(v) => set("is_registered", v)} />
        <ToggleRow label="Customs duty paid" checked={vehicle.duty_paid} onChange={(v) => set("duty_paid", v)} />
      </Card>

      <Card>
        <Row>
          <HalfInput label="Price (₦)" value={price} keyboardType="number-pad" onChangeText={(v) => setPrice(v.replace(/\D/g, ""))} placeholder="e.g. 12500000" />
          <HalfSelect label="Condition" value={condition} onChange={setCondition} options={CONDITIONS} />
        </Row>
        <ToggleRow label="Price negotiable" checked={negotiable} onChange={setNegotiable} />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Service history, known faults, what's included." multiline />
      </Card>

      <Card>
        <Text variant="label" style={{ marginBottom: 8 }}>Photos</Text>
        <Text variant="caption" color="muted" style={{ marginBottom: 10 }}>First photo becomes the cover. Exterior, interior, dashboard and engine bay sell a car.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {images.map((uri, i) => (
            <View key={i} style={{ height: 72, width: 72, borderRadius: 10, overflow: "hidden", backgroundColor: colors.mist }}>
              <Image source={{ uri }} style={{ height: 72, width: 72 }} />
              <Pressable onPress={() => setImages((p) => p.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 2, right: 2, height: 20, width: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                <X size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={pickImage} disabled={uploading} style={{ height: 72, width: 72, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
            {uploading ? <ActivityIndicator color={colors.brand.green} /> : <Plus size={22} color={colors.muted} />}
          </Pressable>
        </View>
      </Card>

      <Card>
        <HalfInput label="Location" value={location} onChangeText={setLocation} placeholder="Abuja" full />
        <Row>
          <HalfInput label="Phone" value={phone} keyboardType="phone-pad" onChangeText={(v) => setPhone(v.replace(/[^\d+]/g, ""))} placeholder="0803..." />
          <HalfInput label="WhatsApp" value={whatsapp} keyboardType="phone-pad" onChangeText={(v) => setWhatsapp(v.replace(/[^\d+]/g, ""))} placeholder="Optional" />
        </Row>
        <Input label="VIN (private — never shown publicly)" value={vehicle.vin ?? ""} onChangeText={(v) => set("vin", v.toUpperCase())} placeholder="Optional" autoCapitalize="characters" />
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
        <Button title="List this vehicle" onPress={submit} loading={create.isPending || uploading} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16, gap: 6 }}>{children}</View>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}
function HalfInput(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "default" | "number-pad" | "phone-pad"; full?: boolean; multiline?: boolean }) {
  return <View style={{ flex: 1 }}><Input {...props} /></View>;
}
function HalfSelect({ label, value, onChange, options, full }: { label: string; value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[]; full?: boolean }) {
  return (
    <View style={{ flex: 1, marginBottom: 6 }}>
      <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map((o) => {
          const sel = value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.brand.green : colors.hairline, backgroundColor: sel ? "rgba(11,115,39,0.08)" : colors.paper, alignItems: "center", justifyContent: "center" }}>
              <Text variant="caption" color={sel ? "green" : "ink"}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text variant="body" color="ink">{label}</Text>
      <Switch value={checked} onValueChange={onChange} trackColor={{ true: colors.brand.green }} />
    </View>
  );
}
