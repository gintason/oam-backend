import { Navigate, useParams } from "react-router-dom";
import { referralStore } from "../services/referrals";

/**
 * Handles inbound referral links of the form /refer-<slug>-<code>. React Router
 * ranks the static routes above this single dynamic segment, so only unmatched
 * one-segment paths reach here. If it's a referral token we stash it (SignUp
 * sends it on register) and send the visitor to sign-up; otherwise home.
 */
export function ReferralCapture() {
  const { refToken } = useParams();
  if (refToken && refToken.startsWith("refer-")) {
    referralStore.set(refToken);
    return <Navigate to="/signup" replace />;
  }
  return <Navigate to="/" replace />;
}
