import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, Share, Dimensions, BackHandler } from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { ArrowLeft } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { receiptHtml, type ReceiptHtmlData } from "./receipt-html";

export type MobileReceipt = ReceiptHtmlData;

/** Pixel-matches the web receipt by rendering the SAME HTML in a WebView. */
export function ReceiptScreen({ data, onBack }: { data: MobileReceipt; onBack?: () => void }) {
  const router = useRouter();
  const contentW = Dimensions.get("window").width - 40; // matches the 20px page padding
  const html = receiptHtml(data, scale);
  const [natH, setNatH] = useState(760);                 // natural (CSS) height; updated on load

  const goHome = useCallback(() => { if (onBack) onBack(); else router.navigate("/home"); }, [onBack, router]);
  // Intercept hardware/gesture back so it lands on the dashboard (no GO_BACK error).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { goHome(); return true; });
    return () => sub.remove();
  }, [goHome]);

  const receiptUrl = data.reference ? `https://oam-app.com/receipt/${data.reference}` : "";
  async function share() {
    try {
      const cur = data.currency ?? "₦";
      const msg = `OAM receipt — ${cur} ${data.amount} to ${data.recipientName}.` + (receiptUrl ? `\nView: ${receiptUrl}` : "");
      await Share.share({ message: msg, url: receiptUrl || undefined, title: "OAM Receipt" });
    } catch { /* cancelled */ }
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentW, height: natH, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, alignSelf: "center" }}>
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            scrollEnabled={false}
            style={{ width: contentW, height: natH, backgroundColor: "#fff" }}
            injectedJavaScript={"setTimeout(function(){var el=document.querySelector('.receipt'); if(el){window.ReactNativeWebView.postMessage(String(el.scrollHeight));}},120); true;"}
            onMessage={(e) => { const n = Number(e.nativeEvent.data); if (n && n > 100) setNatH(n); }}
          />
        </View>

        <Button title="Share receipt" onPress={share} style={{ marginTop: 18 }} />
        <Pressable
          onPress={goHome}
          style={{ marginTop: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <ArrowLeft size={16} color={colors.ink} /><Text variant="label" color="ink">Back to dashboard</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
