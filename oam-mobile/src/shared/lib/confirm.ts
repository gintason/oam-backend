import { Alert, Platform } from "react-native";

/**
 * Ask before a destructive action. Native: the system dialog with a red
 * button. Web preview: the browser's confirm(), since Alert buttons don't
 * work there.
 */
export function confirmDestructive(opts: {
  title: string; message?: string; confirmText: string; cancelText: string; onConfirm: () => void;
}) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm([opts.title, opts.message].filter(Boolean).join("\n\n"))) opts.onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: opts.cancelText, style: "cancel" },
    { text: opts.confirmText, style: "destructive", onPress: opts.onConfirm },
  ]);
}
