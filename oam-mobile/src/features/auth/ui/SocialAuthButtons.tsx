import { useState, useCallback, useEffect } from "react";
import { View, Pressable, Text as RNText, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { authApi, useAuthStore } from "@/features/auth";
import { useTranslation } from "react-i18next";
import {
  signInWithGoogle, SocialCancelled, SocialUnavailable, isGoogleAvailable,
  appleModule, isAppleAvailable, signInWithApple,
} from "@/features/auth/social-auth";

/** True on iOS devices that support Sign in with Apple. */
export function useAppleAvailable(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    isAppleAvailable().then((v) => { if (live) setOk(v); });
    return () => { live = false; };
  }, []);
  return ok;
}

/** Apple's own native button (required look under Apple's guidelines; iOS localizes its label). */
export function AppleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const A = appleModule();
  if (!A?.AppleAuthenticationButton) return null;
  const Btn = A.AppleAuthenticationButton;
  return (
    <View style={{ width: "100%", opacity: disabled ? 0.6 : 1 }} pointerEvents={disabled ? "none" : "auto"}>
      <Btn
        buttonType={A.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={A.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={4}
        style={{ width: "100%", height: 44 }}
        onPress={onPress}
      />
    </View>
  );
}

/** "Continue with Google" for the auth screens. Uses the native Google module
 *  (present in real builds; hidden in Expo Go). Styled like the website's
 *  button: white, #dadce0 border, 4px radius, 40px tall, Google "G" logo. */
export function SocialAuthButtons({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { t } = useTranslation();
  const [busy, setBusy] = useState<null | "google" | "apple">(null);
  const googleReady = isGoogleAvailable();
  const appleReady = useAppleAvailable();

  const finish = useCallback(() => router.replace("/home"), [router]);

  async function onGoogle() {
    onError?.("");
    setBusy("google");
    try {
      const idToken = await signInWithGoogle();
      const { user, tokens } = await authApi.social("google", idToken);
      await setSession(user, tokens);
      await finish();
    } catch (e) {
      if (e instanceof SocialUnavailable) onError?.("Google sign-in needs the full app build (not Expo Go).");
      else if (!(e instanceof SocialCancelled)) onError?.(apiErrorMessage(e, "Google sign-in failed. Please try again."));
    } finally { setBusy(null); }
  }

  async function onApple() {
    onError?.("");
    setBusy("apple");
    try {
      const { idToken, firstName, lastName } = await signInWithApple();
      const { user, tokens } = await authApi.social("apple", idToken, { first_name: firstName, last_name: lastName });
      await setSession(user, tokens);
      await finish();
    } catch (e) {
      if (!(e instanceof SocialCancelled)) onError?.(apiErrorMessage(e, t("auth.social.appleFailed", "Apple sign-in failed. Please try again.")));
    } finally { setBusy(null); }
  }

  if (!googleReady && !appleReady) return null;

  return (
    <View style={{ marginBottom: 8, gap: 10 }}>
      {appleReady ? <AppleButton onPress={onApple} disabled={busy !== null} /> : null}
      {googleReady ? <GoogleButton onPress={onGoogle} busy={busy === "google"} disabled={busy !== null} /> : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
        <Text variant="caption" color="muted">{t("auth.fields.orEmail", "or continue with email").toUpperCase()}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
      </View>
    </View>
  );
}

/** Same look as the web SOCIAL_BUTTON_STYLE (Google's standard light button). */
export function GoogleButton({ onPress, busy, disabled, label = "Continue with Google" }: {
  onPress: () => void; busy?: boolean; disabled?: boolean; label?: string;
}) {
  // Plain style objects only: NativeWind drops Pressable `style={({ pressed }) => …}`
  // on devices, so the pressed tint is tracked in state instead.
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: "100%", opacity: disabled && !busy ? 0.6 : 1 }}
    >
      <View
        style={{
          height: 40,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: "#dadce0",
          backgroundColor: pressed ? "#f8faff" : "#ffffff",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
          {busy ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleIcon />}
        </View>
        <RNText
          numberOfLines={1}
          style={{
            color: "#3c4043",
            fontSize: 14,
            fontWeight: "500",
            letterSpacing: 0.25,
            fontFamily: Platform.OS === "android" ? "sans-serif-medium" : undefined,
          }}
        >
          {busy ? "Connecting…" : label}
        </RNText>
      </View>
    </Pressable>
  );
}

/** Google's four-colour "G" — identical paths to the web GoogleIcon. */
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <Path fill="#EA4335" d="M12 4.75c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.5 12 .5A11 11 0 0 0 2.18 7.07L5.84 9.91C6.71 7.31 9.14 4.75 12 4.75z" />
    </Svg>
  );
}
