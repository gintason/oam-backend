import { Modal, View, Pressable, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

/**
 * In-app checkout WebView for Flutterwave payments (Marketplace upgrades and
 * artisan boosts). Loads the Flutterwave payment link and watches for the return
 * to FLUTTERWAVE_REDIRECT_URL (which contains "/payment/flutterwave-callback").
 *
 * Flutterwave runs its 3-D Secure / OTP step by calling window.open() — a popup.
 * React Native's WebView blocks popups, so "Pay" silently does nothing and the
 * session eventually expires. We override window.open INSIDE the page (before its
 * own scripts run) so that call navigates the same WebView instead, which lets
 * the OTP page load and, after auth, redirect on to our callback. DOM storage +
 * cookies keep the Flutterwave session alive across those hops.
 */
const RETURN_MARKER = "/payment/flutterwave-callback";

// Runs at document-start, before Flutterwave's own JS. Any window.open(url) now
// loads in this same WebView; the stub return value stops code that does
// `var w = window.open(...); w.focus()` from throwing.
const OPEN_IN_SAME_VIEW = `
(function () {
  try {
    window.open = function (u) {
      if (u) { window.location.href = u; }
      return {
        closed: false,
        close: function () {},
        focus: function () {},
        blur: function () {},
        postMessage: function () {},
        location: window.location,
      };
    };
  } catch (e) {}
})();
true;
`;

export function CheckoutModal({
  url,
  visible,
  title,
  onComplete,
  onCancel,
}: {
  url: string;
  visible: boolean;
  title: string;
  onComplete: (returnUrl: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const isReturn = (u: string) => u.includes(RETURN_MARKER);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <Screen edges={["top"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.hairline,
          }}
        >
          <Text variant="title">{title || t("payments.checkout", "Complete payment")}</Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>

        {visible && url ? (
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
            onNavigationStateChange={(nav) => {
              if (isReturn(nav.url)) onComplete(nav.url);
            }}
            onShouldStartLoadWithRequest={(req) => {
              if (isReturn(req.url)) {
                onComplete(req.url);
                return false; // don't bother loading the callback page
              }
              return true;
            }}
          />
        ) : null}
      </Screen>
    </Modal>
  );
}
