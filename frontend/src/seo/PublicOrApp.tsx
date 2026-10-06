import { type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

/**
 * Same URL for everyone: signed-in users get the app screen, signed-out
 * visitors (and search engines) get the public page instead of a redirect to
 * /sign-in. Shared links therefore work for people who aren't members yet.
 */
export function PublicOrApp({ app, pub }: { app: ReactNode; pub: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-brand-green" />
      </div>
    );
  }
  return <>{isAuthenticated ? app : pub}</>;
}
