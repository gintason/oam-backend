import { Redirect } from "expo-router";
import { useAuthStore } from "@/features/auth";

// The root layout only renders once auth is resolved, so status is settled here.
export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === "locked") return <Redirect href="/unlock" />;
  if (status === "authenticated") return <Redirect href="/home" />;
  return <Redirect href="/sign-in" />;
}
