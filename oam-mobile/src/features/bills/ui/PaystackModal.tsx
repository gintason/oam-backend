import { Modal, View, Pressable, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { colors } from "@/shared/theme";

/**
 * Shows the Paystack checkout in an in-app WebView. When Paystack redirects to
 * our backend return URL, we detect it, close, and hand back for verification —
 * no deep link / external browser, so it works in Expo Go and dev builds alike.
 */
export function PaystackModal({
  url,
  visible,
  onComplete,
  onCancel,
}: {
  url: string;
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  function handleNav(navUrl: string) {
    if (navUrl.includes("/billing/purchase/card/return")) {
      onComplete();
    }
  }

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
          <Text variant="title">{t("bills.cardPayment")}</Text>
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
            onNavigationStateChange={(nav) => handleNav(nav.url)}
            onShouldStartLoadWithRequest={(req) => {
              if (req.url.includes("/billing/purchase/card/return")) {
                onComplete();
                return false; // don't bother loading the return page
              }
              return true;
            }}
          />
        ) : null}
      </Screen>
    </Modal>
  );
}
