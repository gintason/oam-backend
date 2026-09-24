import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { colors } from "@/shared/theme";
import { useUnreadNotifications } from "@/features/notifications/use-unread";

/** Dashboard bell: navigates to the notifications screen, red dot when unread. */
export function NotificationBell() {
  const router = useRouter();
  const unread = useUnreadNotifications();
  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      hitSlop={8}
      accessibilityLabel="Notifications"
      style={{ height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.mist }}
    >
      <Bell size={20} strokeWidth={1.9} color={colors.brand.green} />
      {unread > 0 ? (
        <View style={{ position: "absolute", top: 8, right: 8, minWidth: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.red, borderWidth: 1.5, borderColor: colors.paper }} />
      ) : null}
    </Pressable>
  );
}
