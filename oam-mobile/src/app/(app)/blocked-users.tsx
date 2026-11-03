import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { moderationApi } from "@/features/moderation/api";

/** People I've blocked — tap Unblock to see their content again. */
export default function BlockedUsers() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["moderation", "blocked"], queryFn: moderationApi.blocked });
  const unblock = useMutation({
    mutationFn: (userId: string) => moderationApi.unblock(userId),
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>
        <Text variant="heading">{t("moderation.blockedUsers", "Blocked users")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 6, lineHeight: 18 }}>
          {t("moderation.blockedHint", "You don't see content or messages from these people, and they can't message you.")}
        </Text>

        {list.isLoading ? <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} /> : null}
        {list.data && list.data.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40, gap: 10 }}>
            <Ban size={32} color={colors.muted} />
            <Text variant="body" color="muted">{t("moderation.noneBlocked", "You haven't blocked anyone.")}</Text>
          </View>
        ) : null}
        <View style={{ gap: 10, marginTop: 18 }}>
          {(list.data ?? []).map((u) => (
            <View key={u.user_id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 14 }}>
              <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>{u.name}</Text>
              <Pressable onPress={() => unblock.mutate(u.user_id)} disabled={unblock.isPending}
                         style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline }}>
                <Text variant="caption" color="ink">{t("moderation.unblock", "Unblock")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
