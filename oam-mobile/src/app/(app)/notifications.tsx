import { useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { notificationsApi } from "@/features/notifications/notifications-api";

export default function Notifications() {
  const router = useRouter();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["notifications", "list"], queryFn: notificationsApi.list, retry: false });
  const markRead = useMutation({
    mutationFn: () => notificationsApi.markRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "unread"] }),
  });
  useEffect(() => { markRead.mutate(); /* eslint-disable-next-line */ }, []);

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">Back</Text>
        </Pressable>
        <Text variant="heading" style={{ marginBottom: 16 }}>Notifications</Text>

        {list.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 24 }} />
        ) : list.data && list.data.length > 0 ? (
          list.data.map((n) => (
            <View key={n.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: n.is_read ? colors.paper : "rgba(11,115,39,0.05)", padding: 14, marginBottom: 10 }}>
              <Text variant="label" color="ink">{n.title}</Text>
              {n.body ? <Text variant="caption" color="muted" style={{ marginTop: 3 }}>{n.body}</Text> : null}
              <Text variant="caption" color="muted" style={{ marginTop: 6 }}>{new Date(n.created_at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
            <Bell size={30} color={colors.muted} />
            <Text variant="body" color="muted">No notifications yet.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
