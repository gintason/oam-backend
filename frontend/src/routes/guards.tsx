import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Wrap routes that require a logged-in user. Redirects to /sign-in otherwise. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;
  if (!isAuthenticated) {
    // Remember where they were going, so we can return after sign-in.
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** Wrap routes that also require a VERIFIED user (money movement, etc.). */
export function RequireVerified({ children }: { children: ReactNode }) {
  const { isAuthenticated, isVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/sign-in" state={{ from: location }} replace />;
  if (!isVerified) return <Navigate to="/verify" replace />;
  return <>{children}</>;
}

/** Keep authed users away from sign-in/sign-up pages. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function FullscreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-brand-green" />
    </div>
  );
}
