import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AuthScaffold } from "@/features/auth/ui/AuthScaffold";
import { SocialAuthButtons } from "@/features/auth/ui/SocialAuthButtons";
import { authApi, useAuthStore } from "@/features/auth";
import { pinVault } from "@/shared/auth/pin-store";
import { apiErrorMessage } from "@/shared/api";
import { Button, Input, Text } from "@/shared/ui";
import { useTranslation } from "react-i18next";

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const beginPinSetup = useAuthStore((s) => s.beginPinSetup);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => authApi.login(identifier.trim(), password),
    onSuccess: async ({ user, tokens }) => {
      await setSession(user, tokens);
      // First login on this device (no unlock PIN yet)? Set one up, so the user
      // can unlock with a PIN on every launch afterwards.
      if (await pinVault.has()) {
        router.replace("/home");
      } else {
        beginPinSetup();
        router.replace("/create-pin");
      }
    },
    onError: (err) => {
      // A 403 with reason "unverified" means the backend re-sent an OTP — go verify.
      const data = (err as AxiosError<{ reason?: string }>).response?.data;
      if (data?.reason === "unverified") {
        router.push({ pathname: "/verify-otp", params: { identifier: identifier.trim() } });
        return;
      }
      setError(apiErrorMessage(err, t("auth.signIn.errFailed")));
    },
  });

  function submit() {
    setError(null);
    if (!identifier.trim() || !password) {
      setError(t("auth.signIn.errRequired"));
      return;
    }
    login.mutate();
  }

  return (
    <AuthScaffold title={t("auth.signIn.title")} subtitle={t("auth.signIn.subtitle")} headerGap={72}>
      <SocialAuthButtons onError={setError} />

      {error ? (
        <Text variant="caption" color="danger" style={{ marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}

      <Input
        label={t("auth.signIn.identifierLabel")}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder={t("auth.signIn.identifierPlaceholder")}
      />
      <Input
        label={t("auth.signIn.passwordLabel")}
        value={password}
        onChangeText={setPassword}
        secure
        placeholder={t("auth.signIn.passwordPlaceholder")}
      />

      <Text
        variant="label"
        color="green"
        onPress={() => router.push("/forgot-password")}
        style={{ textAlign: "right", marginBottom: 20 }}
      >
        {t("auth.signIn.forgot")}
      </Text>

      <Button title={t("auth.signIn.submit")} onPress={submit} loading={login.isPending} />

      <Text variant="body" color="muted" style={{ textAlign: "center", marginTop: 24 }}>
        {t("auth.signIn.altPrompt")}{" "}
        <Text variant="label" color="green" onPress={() => router.push("/sign-up")}>
          {t("auth.signIn.altLabel")}
        </Text>
      </Text>
    </AuthScaffold>
  );
}
