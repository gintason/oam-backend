import { Redirect } from "expo-router";
import { useAuthStore } from "@/features/auth";

// The root layout only renders once auth is resolved, so status is settled here.
export default function Index() {
  const status = useAuthStore((s) => s.status);
  return status === "authenticated" ? (
    <Redirect href="/home" />
  ) : (
    <Redirect href="/sign-in" />
  );
}
