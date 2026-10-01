import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AuthScaffold } from "@/features/auth/ui/AuthScaffold";
import { authApi, useAuthStore } from "@/features/auth";
import { apiErrorMessage } from "@/shared/api";
import { Button, Input, Text } from "@/shared/ui";

export default function VerifyOtp() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const ident = String(identifier ?? "");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: () => authApi.verifyOtp(ident, code.trim()),
    onSuccess: async ({ user, tokens }) => {
      await setSession(user, tokens);
      router.replace("/home");
    },
    onError: (err) => setError(apiErrorMessage(err, "That code didn't work. Check it and try again.")),
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendOtp(ident),
    onSuccess: () => {
      setError(null);
      setInfo("A new code is on its way.");
    },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't resend the code.")),
  });

  function submit() {
    setError(null);
    setInfo(null);
    if (code.trim().length < 4) {
      setError("Enter the code we sent you.");
      return;
    }
    verify.mutate();
  }

  return (
    <AuthScaffold
      title="Verify your account"
      subtitle={ident ? `Enter the code we sent to ${ident}` : "Enter the code we sent you"}
      headerGap={72}
    >
      {error ? (
        <Text variant="caption" color="danger" style={{ marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}
      {info ? (
        <Text variant="caption" color="green" style={{ marginBottom: 12 }}>
          {info}
        </Text>
      ) : null}

      <Input
        label="Verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={8}
        placeholder="123456"
      />

      <Button title="Verify" onPress={submit} loading={verify.isPending} />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 24 }}>
        <Text variant="body" color="muted">
          Didn't get it?
        </Text>
        <Text variant="label" color="green" onPress={() => resend.mutate()}>
          {resend.isPending ? "Sending…" : "Resend code"}
        </Text>
      </View>
    </AuthScaffold>
  );
}
