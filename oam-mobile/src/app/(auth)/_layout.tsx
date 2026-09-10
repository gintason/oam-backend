import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/features/auth";

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  const pendingPin = useAuthStore((s) => s.pendingPin);
  // Already signed in? Don't show auth screens.
  if (status === "authenticated") return <Redirect href={pendingPin ? "/create-pin" : "/home"} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
