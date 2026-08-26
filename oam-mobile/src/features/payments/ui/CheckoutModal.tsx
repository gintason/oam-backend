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
 * When it sees that, it hands the return URL back so the screen can verify by
 * the stored reference — no external browser, so it works in Expo Go and dev
 * builds alike, exactly like the bills PaystackModal.
 */
const RETURN_MARKER = "/payment/flutterwave-callback";

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
