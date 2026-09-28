import { useState, useEffect, useCallback } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Facebook from "expo-auth-session/providers/facebook";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { authApi, useAuthStore } from "@/features/auth";
import { pinVault } from "@/shared/auth/pin-store";
import { signInWithGoogle, SocialCancelled, SocialUnavailable, isGoogleAvailable } from "@/features/auth/social-auth";

WebBrowser.maybeCompleteAuthSession();

const FACEBOOK_APP_ID = "1360671685491147";

/** "Continue with Google/Facebook" for the auth screens. Google uses the native
 *  module (real builds only); Facebook uses expo-auth-session (works anywhere). */
export function SocialAuthButtons({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const beginPinSetup = useAuthStore((s) => s.beginPinSetup);
  const [busy, setBusy] = useState<null | "google" | "facebook">(null);
  const googleReady = isGoogleAvailable();

  const [, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({ clientId: FACEBOOK_APP_ID });

  const finish = useCallback(async () => {
    if (await pinVault.has()) router.replace("/home");
    else { beginPinSetup(); router.replace("/create-pin"); }
  }, [router, beginPinSetup]);

  const complete = useCallback(async (provider: "google" | "facebook", token: string) => {
    const { user, tokens } = await authApi.social(provider, token);
    await setSession(user, tokens);
    await finish();
  }, [setSession, finish]);

  // Facebook auth-session result
  useEffect(() => {
    (async () => {
      if (fbResponse?.type === "success") {
        const token = fbResponse.authentication?.accessToken;
        if (!token) { setBusy(null); return; }
        try { await complete("facebook", token); }
        catch (e) { onError?.(apiErrorMessage(e, "Facebook sign-in failed. Please try again.")); }
        finally { setBusy(null); }
      } else if (fbResponse && fbResponse.type !== "success") {
        setBusy(null); // dismissed / cancelled / error
      }
    })();
  }, [fbResponse]);

  async function onGoogle() {
    onError?.("");
    setBusy("google");
    try {
      const idToken = await signInWithGoogle();
      await complete("google", idToken);
    } catch (e) {
      if (e instanceof SocialUnavailable) onError?.("Google sign-in needs the full app build (not Expo Go).");
      else if (!(e instanceof SocialCancelled)) onError?.(apiErrorMessage(e, "Google sign-in failed. Please try again."));
    } finally { setBusy(null); }
  }

  async function onFacebook() {
    onError?.("");
    setBusy("facebook");
    try { await fbPromptAsync(); } catch { setBusy(null); }
  }

  const rowBtn = {
    height: 50, borderRadius: 12, flexDirection: "row" as const, alignItems: "center" as const,
    justifyContent: "center" as const, gap: 10, marginBottom: 12, paddingHorizontal: 16,
  };

  return (
    <View style={{ marginBottom: 8 }}>
      {googleReady && (
        <Pressable onPress={onGoogle} disabled={busy !== null}
          style={{ ...rowBtn, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, opacity: busy ? 0.6 : 1 }}>
          <GoogleG />
          <Text variant="label" color="ink" numberOfLines={1}>{busy === "google" ? "Connecting…" : "Continue with Google"}</Text>
        </Pressable>
      )}

      <Pressable onPress={onFacebook} disabled={busy !== null}
        style={{ ...rowBtn, backgroundColor: "#1877F2", opacity: busy ? 0.6 : 1 }}>
        <FacebookF />
        <Text variant="label" style={{ color: "#fff" }} numberOfLines={1}>{busy === "facebook" ? "Connecting…" : "Continue with Facebook"}</Text>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
        <Text variant="caption" color="muted">OR CONTINUE WITH EMAIL</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
      </View>
    </View>
  );
}

function GoogleG() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.hairline }}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: "#4285F4" }}>G</Text>
    </View>
  );
}
function FacebookF() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 14, fontWeight: "900", color: "#1877F2" }}>f</Text>
    </View>
  );
}
