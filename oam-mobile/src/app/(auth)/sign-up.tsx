import { useState } from "react";
import { View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { referralStore } from "@/features/referrals";
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
    mutationFn: async () =>
      authApi.register({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        first_name: firstName.trim(),
        referral_code: await referralStore.take(),
      }),
    onSuccess: () => {
      // Backend sends the OTP to email first; carry the identifier to verify.
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
        <Text variant="caption" color="danger" style={{ marginBottom: 12 }}>
          {error}
        </Text>
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
        onChangeText={setPhone}
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

      <View style={{ marginTop: 4 }}>
        <Button title={t("auth.signUp.submit")} onPress={submit} loading={register.isPending} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 24 }}>
        <Text variant="body" color="muted">
          {t("auth.signUp.altPrompt")}
        </Text>
        <Link href="/sign-in" asChild>
          <Text variant="label" color="green">
            {t("auth.signUp.altLabel")}
          </Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
