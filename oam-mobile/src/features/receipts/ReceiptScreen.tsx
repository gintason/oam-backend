import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, Share, Dimensions, BackHandler, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, Download, Mail } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { receiptHtml, type ReceiptHtmlData } from "./receipt-html";

export type MobileReceipt = ReceiptHtmlData;

/** Pixel-matches the web receipt (WebView) + Download / WhatsApp / Email / Back. */
export function ReceiptScreen({ data, onBack }: { data: MobileReceipt; onBack?: () => void }) {
  const router = useRouter();
  const html = receiptHtml(data);
  const contentW = Dimensions.get("window").width - 40;
  const [natH, setNatH] = useState(560);

  const goHome = useCallback(() => { if (onBack) onBack(); else router.navigate("/home"); }, [onBack, router]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { goHome(); return true; });
    return () => sub.remove();
  }, [goHome]);

  const cur = data.currency ?? "₦";
  const receiptUrl = data.reference ? `https://oam-app.com/receipt/${data.reference}` : "";
  const shareText = `OAM receipt — ${cur} ${data.amount} to ${data.recipientName}.` + (receiptUrl ? `\nView: ${receiptUrl}` : "");

  async function onWhatsApp() {
    const wa = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const web = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    try {
      if (await Linking.canOpenURL(wa)) await Linking.openURL(wa);
      else await WebBrowser.openBrowserAsync(web);
    } catch { /* ignore */ }
  }
  async function onEmail() {
    const url = `mailto:?subject=${encodeURIComponent("OAM Transaction Receipt")}&body=${encodeURIComponent(shareText)}`;
    try { await Linking.openURL(url); } catch { Alert.alert("No mail app", "No email app is set up on this device."); }
  }
  async function onDownload() {
    // Open the hosted receipt page, which has a Download button that saves the image.
    if (receiptUrl) { try { await WebBrowser.openBrowserAsync(receiptUrl); } catch { /* ignore */ } }
  }
  async function onShare() {
    try { await Share.share({ message: shareText, url: receiptUrl || undefined, title: "OAM Receipt" }); } catch { /* cancelled */ }
  }

  const btn = { flex: 1, height: 48, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 6 };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentW, height: natH, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, alignSelf: "center" }}>
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            scrollEnabled={false}
            style={{ width: contentW, height: natH, backgroundColor: "#fff" }}
            injectedJavaScript={"function m(){var el=document.querySelector('.receipt'); if(el){window.ReactNativeWebView.postMessage(String(Math.ceil(el.getBoundingClientRect().height)+2));}} setTimeout(m,150); setTimeout(m,500); true;"}
            onMessage={(e) => { const n = Number(e.nativeEvent.data); if (n && n > 120) setNatH(n); }}
          />
        </View>

        {/* Download / WhatsApp / Email — mirrors the web */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Pressable onPress={onDownload} style={{ ...btn, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
            <Download size={17} color={colors.ink} /><Text variant="label" color="ink">Download</Text>
          </Pressable>
          <Pressable onPress={onWhatsApp} style={{ ...btn, backgroundColor: "#25D366" }}>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>WhatsApp</Text>
          </Pressable>
          <Pressable onPress={onEmail} style={{ ...btn, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
            <Mail size={17} color={colors.ink} /><Text variant="label" color="ink">Email</Text>
          </Pressable>
        </View>

        <Pressable onPress={onShare} style={{ height: 48, borderRadius: 12, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Share receipt</Text>
        </Pressable>
        <Pressable onPress={goHome} style={{ marginTop: 10, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <ArrowLeft size={16} color={colors.ink} /><Text variant="label" color="ink">Back to dashboard</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
