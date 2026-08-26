import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/features/auth";

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  // Already signed in? Don't show auth screens.
  if (status === "authenticated") return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
