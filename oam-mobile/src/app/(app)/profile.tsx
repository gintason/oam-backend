import { View } from "react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useAuthStore } from "@/features/auth";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "@/shared/i18n/LanguagePicker";

export default function Profile() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || t("profile.account");

  return (
    <Screen edges={["top"]}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text variant="heading" style={{ marginBottom: 20 }}>
          {t("profile.title")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.mist,
            borderWidth: 1,
            borderColor: colors.hairline,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.brand.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="title" color="paper">
              {(user?.first_name?.[0] || "?").toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={1}>
              {fullName}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {user?.email || user?.phone || ""}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <LanguagePicker variant="row" />
        </View>

        <View style={{ flex: 1 }} />
        <Button title={t("profile.signOut")} variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}
