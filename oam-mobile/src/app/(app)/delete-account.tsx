import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react-native";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { authApi, useAuthStore } from "@/features/auth";

/** Self-service account deletion (required by the App Store and Google Play). */
export default function DeleteAccount() {
  const { t } = useTranslation();
  const router = useRouter();
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const status = useQuery({ queryKey: ["account", "deletion"], queryFn: authApi.deletionStatus });
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsPassword = status.data?.requires_password ?? true;
  const blockers = status.data?.blockers ?? [];
  const ready = !status.isLoading && blockers.length === 0 &&
    (needsPassword ? secret.length > 0 : secret.trim().toUpperCase() === "DELETE");

  const del = useMutation({
    mutationFn: () => authApi.deleteAccount(needsPassword ? { password: secret } : { confirm: secret }),
    onSuccess: async () => {
      await switchAccount().catch(() => {});   // forget the account on this device too
      Alert.alert(t("deleteAccount.doneTitle", "Account deleted"), t("deleteAccount.doneBody", "Your OAM account has been deleted. We're sorry to see you go."));
    },
    onError: (err) => setError(apiErrorMessage(err, t("deleteAccount.errFailed", "Couldn't delete your account. Please try again."))),
  });

  function confirm() {
    setError(null);
    Alert.alert(
      t("deleteAccount.confirmTitle", "Delete your account?"),
      t("deleteAccount.confirmBody", "This can't be undone."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        { text: t("deleteAccount.confirmCta", "Delete"), style: "destructive", onPress: () => del.mutate() },
      ],
    );
  }

  const points = [
    t("deleteAccount.p1", "You'll be signed out everywhere and won't be able to sign in again."),
    t("deleteAccount.p2", "Your name, email, phone and saved devices are erased."),
    t("deleteAccount.p3", "Your listings, artisan profile, CV and open jobs are taken down."),
    t("deleteAccount.p4", "Records of past payments are kept, anonymised, as the law requires."),
  ];

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={16} color={colors.muted} />
          <Text variant="label" color="muted">{t("deleteAccount.back", "Back to profile")}</Text>
        </Pressable>

        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(159,18,57,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <AlertTriangle size={24} strokeWidth={2} color={colors.danger} />
        </View>
        <Text variant="heading">{t("deleteAccount.title", "Delete your account")}</Text>
        <Text variant="body" color="muted" style={{ marginTop: 6, marginBottom: 18 }}>
          {t("deleteAccount.subtitle", "This permanently deletes your OAM account. Here's what happens:")}
        </Text>

        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16, gap: 12 }}>
          {points.map((p) => (
            <View key={p} style={{ flexDirection: "row", gap: 10 }}>
              <Check size={16} strokeWidth={2.2} color={colors.muted} style={{ marginTop: 2 }} />
              <Text variant="body" style={{ flex: 1 }}>{p}</Text>
            </View>
          ))}
        </View>

        {blockers.length ? (
          <View style={{ marginTop: 18, borderRadius: 14, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", padding: 14, gap: 6 }}>
            <Text variant="label" color="danger">{t("deleteAccount.blockedTitle", "Before you can delete your account:")}</Text>
            {blockers.map((b) => <Text key={b} variant="body" color="danger">• {b}</Text>)}
          </View>
        ) : null}

        {!status.isLoading && !blockers.length ? (
          <View style={{ marginTop: 22 }}>
            {needsPassword ? (
              <Input
                label={t("deleteAccount.passwordLabel", "Enter your password to confirm")}
                value={secret}
                onChangeText={(v) => { setSecret(v); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />
            ) : (
              <Input
                label={t("deleteAccount.typeDelete", "Type DELETE to confirm")}
                value={secret}
                onChangeText={(v) => { setSecret(v); setError(null); }}
                autoCapitalize="characters"
                placeholder="DELETE"
              />
            )}
          </View>
        ) : null}

        {error ? <Text variant="caption" color="danger" style={{ marginTop: 4, marginBottom: 8 }}>{error}</Text> : null}

        <Pressable
          onPress={confirm}
          disabled={!ready || del.isPending}
          accessibilityRole="button"
          style={{ marginTop: 14, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger, opacity: !ready || del.isPending ? 0.45 : 1 }}
        >
          <Text variant="label" color="paper">
            {del.isPending ? t("deleteAccount.deleting", "Deleting…") : t("deleteAccount.cta", "Delete my account permanently")}
          </Text>
        </Pressable>
        <Button title={t("common.cancel", "Cancel")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </ScrollView>
    </Screen>
  );
}
