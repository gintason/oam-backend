/**
 * Returning user: "Welcome back, Ada" — only the password is needed. The
 * account (name + email/phone) is remembered on this device after any sign-in;
 * the password is checked by the server and issues a fresh session.
 */
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import type { AxiosError } from "axios";
import { BadgeCheck, Eye, EyeOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { LanguagePicker } from "@/shared/i18n/LanguagePicker";
import { maskIdentifier } from "@/shared/auth/account-store";
import { authApi, useAuthStore } from "@/features/auth";
import { signInWithGoogle, isGoogleAvailable, SocialCancelled, SocialUnavailable } from "@/features/auth/social-auth";
import { GoogleButton } from "@/features/auth/ui/SocialAuthButtons";
import { WelcomeArt } from "@/features/auth/ui/WelcomeArt";

const logo = require("../../../assets/images/logo.png");

export default function WelcomeBack() {
  const router = useRouter();
  const { t } = useTranslation();
  const account = useAuthStore((s) => s.account);
  const unlockWithPassword = useAuthStore((s) => s.unlockWithPassword);
  const setSession = useAuthStore((s) => s.setSession);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const notice = useAuthStore((s) => s.notice);

  const [password, setPassword] = useState("");
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState<null | "password" | "google">(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  if (!account) return <Redirect href="/sign-in" />;

  const name = account.name;
  const googleReady = isGoogleAvailable();
  const usesGoogle = account.provider === "google";

  async function onLogin() {
    if (busy) return;
    setError(null);
    if (!password) {
      setError(t("auth.welcomeBack.errRequired", "Enter your password to continue."));
      inputRef.current?.focus();
      return;
    }
    setBusy("password");
    try {
      await unlockWithPassword(password);
      router.replace("/home");
    } catch (err) {
      const res = (err as AxiosError<{ reason?: string }>).response;
      const data = res?.data;
      if (data?.reason === "unverified") {
        router.push({ pathname: "/verify-otp", params: { identifier: account!.identifier, next: "home" } });
        return;
      }
      setPassword("");
      // Wrong password → our wording; anything else (throttling, server) → the server's message.
      const wrong = res?.status === 400 || res?.status === 401;
      setError(wrong
        ? t("auth.welcomeBack.errWrong", "That password isn't right. Try again, or reset it below.")
        : apiErrorMessage(err, t("auth.welcomeBack.errFailed", "Couldn't log you in. Please try again.")));
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      const idToken = await signInWithGoogle();
      const { user, tokens } = await authApi.social("google", idToken);
      await setSession(user, tokens);
      router.replace("/home");
    } catch (e) {
      if (e instanceof SocialUnavailable) setError(t("auth.welcomeBack.googleUnavailable", "Google sign-in needs the full app build."));
      else if (!(e instanceof SocialCancelled)) setError(apiErrorMessage(e, t("auth.welcomeBack.googleFailed", "Google sign-in failed. Please try again.")));
    } finally {
      setBusy(null);
    }
  }

  const underline = error ? colors.danger : focused ? colors.brand.green : colors.hairline;
  const initials = (name || account.identifier).slice(0, 1).toUpperCase();

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Image source={logo} style={{ width: 96, height: 36 }} contentFit="contain" />
            <LanguagePicker variant="compact" />
          </View>

          <WelcomeArt height={230} />

          {/* Greeting */}
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 34, color: colors.ink, marginTop: 6 }} numberOfLines={2}>
            {name ? t("auth.welcomeBack.titleNamed", "Welcome back, {{name}}", { name }) : t("auth.welcomeBack.title", "Welcome back")}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            <View style={{ height: 28, width: 28, borderRadius: 14, backgroundColor: "rgba(11,115,39,0.12)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.brand.green }}>{initials}</Text>
            </View>
            <Text variant="body" color="muted" numberOfLines={1} style={{ flex: 1 }}>{maskIdentifier(account)}</Text>
          </View>

          {notice === "verified" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10,
                           borderRadius: 12, backgroundColor: "rgba(11,115,39,0.08)", borderWidth: 1, borderColor: "rgba(11,115,39,0.25)" }}>
              <BadgeCheck size={18} color={colors.brand.green} />
              <Text variant="caption" style={{ flex: 1, color: colors.brand.green, fontFamily: fonts.bold }}>
                {t("auth.welcomeBack.verified", "Your account is verified. Enter your password to log in.")}
              </Text>
            </View>
          ) : null}

          {usesGoogle && googleReady ? (
            <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
              {t("auth.welcomeBack.googleHint", "You usually sign in with Google — tap the Google button below.")}
            </Text>
          ) : null}

          {/* Password */}
          <View style={{ marginTop: 26, borderBottomWidth: focused ? 2 : 1, borderBottomColor: underline, flexDirection: "row", alignItems: "center" }}>
            <TextInput
              ref={inputRef}
              value={password}
              onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={onLogin}
              secureTextEntry={hidden}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              placeholder={t("auth.welcomeBack.passwordPlaceholder", "Password")}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t("auth.welcomeBack.passwordPlaceholder", "Password")}
              style={{ flex: 1, height: 52, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingHorizontal: 0 }}
            />
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? "Show password" : "Hide password"} style={{ padding: 6 }}>
              {hidden ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
            </Pressable>
          </View>

          {error ? (
            <Text variant="caption" color="danger" style={{ marginTop: 8 }}>{error}</Text>
          ) : null}

          <Text
            variant="label"
            color="green"
            onPress={() => router.push({ pathname: "/forgot-password", params: { identifier: account.identifier } })}
            style={{ alignSelf: "flex-end", marginTop: 14, marginBottom: 22, paddingVertical: 4 }}
          >
            {t("auth.welcomeBack.forgot", "Forgot password?")}
          </Text>

          <Button title={t("auth.welcomeBack.submit", "Log in")} onPress={onLogin} loading={busy === "password"} disabled={busy === "google"} />

          {googleReady ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 18 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
                <Text variant="caption" color="muted" style={{ marginHorizontal: 12 }}>{t("auth.welcomeBack.or", "or")}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
              </View>
              <GoogleButton onPress={onGoogle} busy={busy === "google"} disabled={busy !== null} />
            </>
          ) : null}

          <View style={{ flex: 1, minHeight: 20 }} />

          <Pressable onPress={() => { switchAccount().catch(() => {}); }} hitSlop={8} style={{ paddingTop: 20, alignItems: "center" }}>
            <Text variant="body" color="muted" style={{ textAlign: "center" }}>
              {name ? t("auth.welcomeBack.notYou", "Not {{name}}?", { name }) + " " : ""}
              <Text variant="label" color="green">{t("auth.welcomeBack.switch", "Switch account")}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
