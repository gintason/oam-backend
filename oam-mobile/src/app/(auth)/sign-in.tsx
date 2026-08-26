import { useState } from "react";
import { View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AuthScaffold } from "@/features/auth/ui/AuthScaffold";
import { authApi, useAuthStore } from "@/features/auth";
import { apiErrorMessage } from "@/shared/api";
import { Button, Input, Text } from "@/shared/ui";
import { useTranslation } from "react-i18next";

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => authApi.login(identifier.trim(), password),
    onSuccess: async ({ user, tokens }) => {
      await setSession(user, tokens);
      router.replace("/home");
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

      <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
        <Link href="/forgot-password" asChild>
          <Text variant="label" color="green">
            {t("auth.signIn.forgot")}
          </Text>
        </Link>
      </View>

      <Button title={t("auth.signIn.submit")} onPress={submit} loading={login.isPending} />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 24 }}>
        <Text variant="body" color="muted">
          {t("auth.signIn.altPrompt")}
        </Text>
        <Link href="/sign-up" asChild>
          <Text variant="label" color="green">
            {t("auth.signIn.altLabel")}
          </Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
