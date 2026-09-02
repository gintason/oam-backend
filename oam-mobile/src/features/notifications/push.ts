import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "@/shared/api";

export const notificationsApi = {
  registerDevice: (token: string, platform: string) =>
    api.post("/notifications/register-device/", { token, platform }).then((r) => r.data),
  unregisterDevice: (token: string) =>
    api.post("/notifications/unregister-device/", { token }).then((r) => r.data),
};

// Show notifications while the app is in the foreground too. Extra fields keep
// this working across expo-notifications versions.
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

/** Ask permission + return this device's Expo push token (null on simulators / if denied). */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens are not issued on simulators

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

  try {
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

/** Get the token and register it with the backend. Safe to call repeatedly. */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPush();
    if (!token) return;
    await notificationsApi.registerDevice(token, Platform.OS);
  } catch {
    /* best-effort — never block the app */
  }
}
