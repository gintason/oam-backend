import { useState } from "react";
import { View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AuthScaffold } from "@/features/auth/ui/AuthScaffold";
import { authApi } from "@/features/auth";
import { apiErrorMessage } from "@/shared/api";
import { Button, Input, Text } from "@/shared/ui";

export default function ForgotPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState<"request" | "confirm">("request");

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () => authApi.passwordResetRequest(identifier.trim()),
    onSuccess: () => {
      setError(null);
      setPhase("confirm");
    },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't send a reset code.")),
  });

  const confirm = useMutation({
    mutationFn: () => authApi.passwordResetConfirm(identifier.trim(), code.trim(), newPassword),
    onSuccess: () => router.replace("/sign-in"),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't reset your password.")),
  });

  function submitRequest() {
    setError(null);
    if (!identifier.trim()) {
      setError("Enter the email or phone on your account.");
      return;
    }
    request.mutate();
  }

  function submitConfirm() {
    setError(null);
    if (code.trim().length < 4) return setError("Enter the code we sent you.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    confirm.mutate();
  }

  return (
    <AuthScaffold
      title="Reset password"
      subtitle={
        phase === "request"
          ? "We'll send a code to your email or phone"
          : `Enter the code sent to ${identifier.trim()} and a new password`
      }
      headerGap={72}
    >
      {error ? (
        <Text variant="caption" color="danger" style={{ marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}

      {phase === "request" ? (
        <>
          <Input
            label="Email or phone number"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com or 0803…"
          />
          <Button title="Send reset code" onPress={submitRequest} loading={request.isPending} />
        </>
      ) : (
        <>
          <Input
            label="Reset code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={8}
            placeholder="123456"
          />
          <Input
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secure
            placeholder="At least 8 characters"
          />
          <Button title="Reset password" onPress={submitConfirm} loading={confirm.isPending} />
        </>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 24 }}>
        <Text variant="body" color="muted">
          Remembered it?
        </Text>
        <Link href="/sign-in" asChild>
          <Text variant="label" color="green">
            Sign in
          </Text>
        </Link>
      </View>
    </AuthScaffold>
  );
}
