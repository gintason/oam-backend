import "@/shared/i18n";
import "../../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";
import * as SplashScreen from "expo-splash-screen";
import { AppProviders } from "./providers";
import { useAuthStore } from "@/features/auth";
import * as Linking from "expo-linking";
import { referralStore, extractReferralToken } from "@/features/referrals";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Satoshi-Regular": require("../../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.otf"),
    "ClashDisplay-Medium": require("../../assets/fonts/ClashDisplay-Medium.otf"),
    "ClashDisplay-Bold": require("../../assets/fonts/ClashDisplay-Bold.otf"),
    GeistMono_400Regular,
  });

  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Capture inbound referral links (/refer-<slug>-<code>) for the sign-up flow.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const tok = extractReferralToken(url);
      if (tok) referralStore.set(tok);
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      const tok = extractReferralToken(url);
      if (tok) referralStore.set(tok);
    });
    return () => sub.remove();
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && status !== "loading";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
