import { Modal, View, Pressable, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { X, Lock } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useTranslation } from "react-i18next";

/**
 * In-app Flutterwave checkout for jobs payments.
 *
 * Same approach as the marketplace CheckoutModal (window.open is redirected into
 * this WebView so Flutterwave's OTP/3-D Secure step works), but it also
 * recognises the jobs return page (/jobs/payment-return) that the backend now
 * sends jobs payments back to.
 */
const RETURN_MARKERS = ["/jobs/payment-return", "/payment/flutterwave-callback"];

const OPEN_IN_SAME_VIEW = `
(function () {
  try {
    window.open = function (u) {
      if (u) { window.location.href = u; }
      return { closed: false, close: function () {}, focus: function () {}, blur: function () {},
               postMessage: function () {}, location: window.location };
    };
  } catch (e) {}
})();
true;
`;

export function JobsCheckoutModal({ url, onComplete, onCancel }: {
  url: string | null;
  onComplete: (returnUrl: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const isReturn = (u: string) => RETURN_MARKERS.some((m) => u.includes(m));
  return (
    <Modal visible={Boolean(url)} animationType="slide" onRequestClose={onCancel}>
      <Screen edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Lock size={15} color={colors.brand.green} />
            <Text variant="title">{t("jobs.checkoutModal.securePaymentFlutterwave")}</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel={t("jobs.checkoutModal.closePayment")}>
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>
        {url ? (
          <WebView
            source={{ uri: url }}
            startInLoadingState
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            javaScriptCanOpenWindowsAutomatically
            setSupportMultipleWindows={false}
            mixedContentMode="always"
            injectedJavaScriptBeforeContentLoaded={OPEN_IN_SAME_VIEW}
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={colors.brand.green} />
              </View>
            )}
            onNavigationStateChange={(nav) => { if (isReturn(nav.url)) onComplete(nav.url); }}
            onShouldStartLoadWithRequest={(req) => {
              if (isReturn(req.url)) { onComplete(req.url); return false; }
              return true;
            }}
          />
        ) : null}
      </Screen>
    </Modal>
  );
}
