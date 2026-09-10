import { useState } from "react";
import { View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AuthScaffold } from "@/features/auth/ui/AuthScaffold";
import { authApi } from "@/features/auth";
import { apiErrorMessage } from "@/shared/api";
import { Button, Input, Text } from "@/shared/ui";
import { useTranslation } from "react-i18next";

export default function SignUp() {
  const router = useRouter();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      authApi.register({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        first_name: firstName.trim(),
      }),
    onSuccess: () => {
      router.push({ pathname: "/verify-otp", params: { identifier: email.trim().toLowerCase() } });
    },
    onError: (err) => setError(apiErrorMessage(err, t("auth.signUp.errFailed"))),
  });

  function submit() {
    setError(null);
    if (!email.trim() || !phone.trim() || !password) {
      setError(t("auth.signUp.errRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.signUp.errPasswordShort"));
      return;
    }
    register.mutate();
  }

  return (
    <AuthScaffold title={t("auth.signUp.title")} subtitle={t("auth.signUp.subtitle")}>
      {error ? (
        <View style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 14, paddingVertical: 11 }}>
          <Text variant="caption" color="danger">{error}</Text>
        </View>
      ) : null}

      <Input
        label={t("auth.signUp.firstNameLabel")}
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        placeholder={t("auth.signUp.firstNameOptional")}
      />
      <Input
        label={t("auth.signUp.emailLabel")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder={t("auth.signUp.emailPlaceholder")}
      />
      <Input
        label={t("auth.signUp.phoneLabel")}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^\d+]/g, ""))}
        keyboardType="phone-pad"
        placeholder={t("auth.signUp.phonePlaceholder")}
      />
      <Input
        label={t("auth.signUp.passwordLabel")}
        value={password}
        onChangeText={setPassword}
        secure
        placeholder={t("auth.signUp.passwordPlaceholder")}
      />
      <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 20 }}>
        {t("auth.signUp.passwordHint", "Use at least 8 characters.")}
      </Text>

      <Button title={t("auth.signUp.submit")} onPress={submit} loading={register.isPending} />

      <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 14, lineHeight: 17 }}>
        {t("auth.signUp.terms", "By creating an account you agree to OAM's Terms and Privacy Policy.")}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 22 }}>
        <Text variant="body" color="muted">{t("auth.signUp.altPrompt")}</Text>
        <Link href="/sign-in" asChild>
          <Text variant="label" color="green">{t("auth.signUp.altLabel")}</Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
