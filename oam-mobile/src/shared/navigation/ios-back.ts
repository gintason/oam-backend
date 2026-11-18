/**
 * iPhone only: make every "Back" link work.
 *
 * Screens call router.back(). When there's no previous screen to return to
 * (e.g. after switching account, or a screen opened fresh), that silently does
 * nothing, and iPhone has no hardware back button to fall back on, so the
 * customer is stuck. Here, on iOS, Back goes to the previous screen when there
 * is one and to Home otherwise. Android is unchanged.
 *
 * useRouter() returns this same shared router object, so this covers every screen.
 */
import { Platform } from "react-native";
import { router } from "expo-router";

if (Platform.OS === "ios") {
  const goBack = router.back;
  (router as { back: () => void }).back = () => {
    try {
      if (router.canGoBack()) {
        goBack();
        return;
      }
    } catch {
      /* navigation not ready: fall through to Home */
    }
    router.replace("/home");
  };
}
