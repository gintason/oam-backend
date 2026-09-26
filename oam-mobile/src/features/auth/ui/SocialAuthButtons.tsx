import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { authApi, useAuthStore } from "@/features/auth";
import { pinVault } from "@/shared/auth/pin-store";
import { signInWithGoogle, SocialCancelled, SocialUnavailable, isGoogleAvailable } from "@/features/auth/social-auth";

/** "Continue with Google" for the auth screens. Runs the full native flow and
 *  lands the user exactly where a password login would (home or create-pin). */
export function SocialAuthButtons({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const beginPinSetup = useAuthStore((s) => s.beginPinSetup);
  const [busy, setBusy] = useState<null | "google">(null);
  const googleReady = isGoogleAvailable();

  async function finish() {
    if (await pinVault.has()) router.replace("/home");
    else { beginPinSetup(); router.replace("/create-pin"); }
  }

  async function onGoogle() {
    onError?.("");
    setBusy("google");
    try {
      const idToken = await signInWithGoogle();
      const { user, tokens } = await authApi.social("google", idToken);
      await setSession(user, tokens);
      await finish();
    } catch (e) {
      if (e instanceof SocialUnavailable) onError?.("Google sign-in will be available after the next app update.");
      else if (!(e instanceof SocialCancelled)) onError?.(apiErrorMessage(e, "Google sign-in failed. Please try again."));
    } finally { setBusy(null); }
  }

  if (!googleReady) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable
        onPress={onGoogle}
        disabled={busy !== null}
        style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: busy ? 0.6 : 1 }}
      >
        <GoogleG />
        <Text variant="label" color="ink">{busy === "google" ? "Connecting…" : "Continue with Google"}</Text>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, marginBottom: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
        <Text variant="caption" color="muted">OR CONTINUE WITH EMAIL</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
      </View>
    </View>
  );
}

/** Google "G" mark drawn with plain views (no extra deps). */
function GoogleG() {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 15, fontWeight: "800", color: "#4285F4" }}>G</Text>
    </View>
  );
}
