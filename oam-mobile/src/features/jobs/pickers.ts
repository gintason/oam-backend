/**
 * File pickers for CVs, logos and chat attachments.
 *
 * Images use expo-image-picker (already in the app). Documents (PDF / Word CVs)
 * need expo-document-picker, a native module: it's loaded lazily so an app
 * build that doesn't include it yet shows a clear message instead of crashing
 * (important with over-the-air updates reaching older builds).
 */
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { PickedMedia } from "@/features/marketplace/api/uploads-api";

export type PickedFile = PickedMedia & { size?: number | null };

export async function pickImage(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Photos access needed", "Allow photo access in Settings to choose an image.");
    return null;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return { uri: a.uri, fileName: a.fileName ?? `image_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize };
}

export async function pickDocument(types: string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]): Promise<PickedFile | null> {
  let DocumentPicker: typeof import("expo-document-picker");
  try {
    DocumentPicker = await import("expo-document-picker");
  } catch {
    Alert.alert("Update needed", "Uploading documents needs the latest version of the OAM app. Please update from the store.");
    return null;
  }
  try {
    const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.length) return null;
    const a = r.assets[0];
    return { uri: a.uri, fileName: a.name, mimeType: a.mimeType ?? "application/octet-stream", size: a.size };
  } catch {
    Alert.alert("Update needed", "Uploading documents needs the latest version of the OAM app. Please update from the store.");
    return null;
  }
}
