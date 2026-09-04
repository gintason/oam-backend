import { useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useAuthStore, authApi } from "@/features/auth";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/shared/i18n/LanguagePicker";

export default function Profile() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.first_name, user?.last_name, user?.phone]);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || t("profile.account", "Your account");

  const save = useMutation({
    mutationFn: () =>
      authApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }),
    onSuccess: (updated) => {
      useAuthStore.setState({ user: updated });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    },
    onError: (err) => {
      setSaved(false);
      setError(apiErrorMessage(err, t("profile.errSave", "Couldn't save your changes. Try again.")));
    },
  });

  const dirty =
    firstName.trim() !== (user?.first_name ?? "") ||
    lastName.trim() !== (user?.last_name ?? "") ||
    phone.trim() !== (user?.phone ?? "");

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="heading" style={{ marginBottom: 20 }}>{t("profile.title", "Profile")}</Text>

        {/* Identity card */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.hairline }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center" }}>
            <Text variant="title" color="paper">{(user?.first_name?.[0] || "?").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text variant="title" numberOfLines={1}>{fullName}</Text>
              {user?.is_verified ? <BadgeCheck size={16} strokeWidth={2} color={colors.brand.green} /> : null}
            </View>
            <Text variant="caption" color="muted" numberOfLines={1}>{user?.email || user?.phone || ""}</Text>
          </View>
        </View>

        {/* Edit form */}
        <Text variant="label" style={{ marginTop: 24, marginBottom: 10 }}>{t("profile.editTitle", "Edit your details")}</Text>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? (
            <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text variant="caption" color="danger">{error}</Text>
            </View>
          ) : null}

          <Input label={t("profile.firstName", "First name")} value={firstName} onChangeText={(v) => { setFirstName(v); setSaved(false); }} placeholder="Jane" />
          <Input label={t("profile.lastName", "Last name")} value={lastName} onChangeText={(v) => { setLastName(v); setSaved(false); }} placeholder="Doe" />
          <Input label={t("profile.phone", "Phone")} value={phone} onChangeText={(v) => { setPhone(v.replace(/[^\d+]/g, "")); setSaved(false); }} keyboardType="phone-pad" placeholder="0803..." />

          {/* Email (read-only) */}
          <Text variant="label" style={{ marginBottom: 8 }}>{t("profile.email", "Email")}</Text>
          <View style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, justifyContent: "center", paddingHorizontal: 14, marginBottom: 6 }}>
            <Text variant="body" color="muted" numberOfLines={1}>{user?.email || "—"}</Text>
          </View>
          <Text variant="caption" color="muted" style={{ marginBottom: 14 }}>{t("profile.emailNote", "Email can't be changed — it's your login.")}</Text>

          <Button
            title={saved ? t("profile.saved", "Saved!") : t("profile.save", "Save changes")}
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!dirty && !save.isPending}
          />
        </View>

        {/* Language */}
        <View style={{ marginTop: 24 }}>
          <LanguagePicker variant="row" />
        </View>

        <Button title={t("profile.signOut", "Sign out")} variant="secondary" onPress={signOut} style={{ marginTop: 24 }} />
      </ScrollView>
    </Screen>
  );
}
