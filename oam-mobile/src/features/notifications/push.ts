import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "@/shared/api";

export const notificationsApi = {
  registerDevice: (token: string, platform: string) =>
    api.post("/notifications/register-device/", { token, platform }).then((r) => r.data),
  unregisterDevice: (token: string) =>
    api.post("/notifications/unregister-device/", { token }).then((r) => r.data),
};

// Expo Go (SDK 53+) can't do remote push; importing expo-notifications eagerly
// crashes it. So we ONLY require it lazily, and skip entirely in Expo Go.
const isExpoGo = Constants.appOwnership === "expo";

/** Ask permission + return this device's Expo push token (null on Expo Go / simulator / denied). */
export async function registerForPush(): Promise<string | null> {
  if (isExpoGo) return null; // needs a dev/production build

  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) return null; // no tokens on simulators

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.status === "granted";
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted || req.status === "granted";
    }
    if (!granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch(() => {});
    }

    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

/** Set the foreground handler (dev/prod builds only). Safe no-op in Expo Go. */
export async function initNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as any,
    });
  } catch {
    /* ignore */
  }
}

/** Get the token and register it with the backend. Safe to call repeatedly. */
export async function syncPushToken(): Promise<void> {
  try {
    await initNotifications();
    const token = await registerForPush();
    if (!token) return;
    await notificationsApi.registerDevice(token, Platform.OS);
  } catch {
    /* best-effort — never block the app */
  }
}
