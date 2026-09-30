import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/features/auth";

const FIRST_RUN_KEY = "oam.hasLaunched";

/**
 * Entry router. Signed-in users go home; a saved PIN goes to unlock. For everyone
 * else we distinguish a BRAND-NEW install (never launched -> Registration) from a
 * returning-but-signed-out user (-> Sign in). The first-run flag is persisted so
 * this only sends someone to sign-up once, ever.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const [firstRun, setFirstRun] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const seen = await SecureStore.getItemAsync(FIRST_RUN_KEY);
        if (!seen) {
          await SecureStore.setItemAsync(FIRST_RUN_KEY, "1");
          setFirstRun(true);
        } else {
          setFirstRun(false);
        }
      } catch {
        setFirstRun(false);   // on any storage error, default to sign-in (safe)
      }
    })();
  }, []);

  if (status === "locked") return <Redirect href="/unlock" />;
  if (status === "authenticated") return <Redirect href="/home" />;
  if (firstRun === null) return null;                 // brief wait for the flag check
  return <Redirect href={firstRun ? "/sign-up" : "/sign-in"} />;
}
