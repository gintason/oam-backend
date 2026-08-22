import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { marketplaceApi } from "../../services/marketplace";
import { homeServicesApi } from "../../services/homeservices";

/**
 * Return page for Flutterwave payments — Marketplace Pro/Premium upgrades and
 * artisan profile boosts. Flutterwave sends every payment back to ONE redirect
 * URL (FLUTTERWAVE_REDIRECT_URL) with ?status=&tx_ref=&transaction_id=, so this
 * page reads tx_ref, works out which flow it was from the reference prefix
 * (SUB- vs BOOST-), verifies with the backend — which re-checks with Flutterwave
 * by that reference and activates the tier/boost — and reports the outcome.
 * The verify endpoints are idempotent, so a refresh here is harmless.
 */
type Kind = "subscription" | "boost" | null;
type Phase = "working" | "success" | "pending" | "failed" | "error";

const PAID = ["paid", "success", "successful", "active"];

export default function FlutterwaveCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const reference =
    params.get("tx_ref") || params.get("reference") || params.get("trxref") || "";
  const urlStatus = (params.get("status") || "").toLowerCase();

  const [kind, setKind] = useState<Kind>(
    reference.startsWith("SUB-")
      ? "subscription"
      : reference.startsWith("BOOST-")
      ? "boost"
      : null,
  );
  const [phase, setPhase] = useState<Phase>("working");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!reference) {
        setPhase("error");
        return;
      }
      // The customer cancelled on Flutterwave's page — nothing was charged.
      if (urlStatus === "cancelled") {
        setPhase("failed");
        setDetail("Payment was cancelled. You have not been charged.");
        return;
      }

      try {
        if (reference.startsWith("SUB-")) {
          setKind("subscription");
          const r = await marketplaceApi.verify(reference);
          if (!active) return;
          const st = String((r as { payment_status?: string }).payment_status ?? r.status ?? "").toLowerCase();
          qc.invalidateQueries({ queryKey: ["marketplace"] });
          if (PAID.includes(st) || Boolean(r.expires_at)) {
            setPhase("success");
            setDetail(
              r.tier
                ? `Your seller account is now ${String(r.tier).toUpperCase()}.`
                : "Your upgrade is active.",
            );
          } else if (st === "pending" || st === "processing") {
            setPhase("pending");
          } else {
            setPhase("failed");
          }
        } else if (reference.startsWith("BOOST-")) {
          setKind("boost");
          const r = await homeServicesApi.verifyBoost(reference);
          if (!active) return;
          const st = String(r.status ?? "").toLowerCase();
          qc.invalidateQueries({ queryKey: ["homeservices"] });
          qc.invalidateQueries({ queryKey: ["artisan"] });
          if (PAID.includes(st) || Boolean(r.featured_until)) {
            setPhase("success");
            setDetail("Your profile is now featured and ranks higher in search.");
          } else if (st === "pending" || st === "processing") {
            setPhase("pending");
          } else {
            setPhase("failed");
          }
        } else {
          setPhase("error");
        }
      } catch {
        if (active) setPhase("error");
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [reference, urlStatus, qc]);

  const backTo = kind === "boost" ? "/artisans/me" : "/marketplace/sell";
  const backLabel = kind === "boost" ? "Back to my profile" : "Back to selling";

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {phase === "working" && (
            <>
              <Loader2 size={44} strokeWidth={1.75} className="mx-auto animate-spin text-brand-green" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Confirming your payment…</h1>
              <p className="mt-1 text-[14px] text-muted">This only takes a moment.</p>
            </>
          )}

          {phase !== "working" && (
            <>
              {phase === "success" ? (
                <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
              ) : phase === "pending" ? (
                <Clock size={48} strokeWidth={1.5} className="mx-auto text-warn" />
              ) : (
                <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              )}

              <h1 className="mt-4 font-display text-xl font-semibold text-ink">
                {phase === "success"
                  ? kind === "boost"
                    ? "Profile boosted!"
                    : "Upgrade successful!"
                  : phase === "pending"
                  ? "Payment received"
                  : phase === "failed"
                  ? "Payment not completed"
                  : "Couldn't confirm payment"}
              </h1>

              <p className="mt-1 text-[14px] text-muted">
                {phase === "success"
                  ? detail
                  : phase === "pending"
                  ? "Your payment is confirming. This page and your dashboard will update shortly."
                  : phase === "failed"
                  ? detail || "If you were charged, it will be reversed automatically."
                  : "If you were charged, your upgrade will activate once the payment settles. Check your dashboard in a moment."}
              </p>

              {reference && (
                <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
                  <div className="flex justify-between">
                    <span>Reference</span>
                    <span className="font-mono text-[11px] text-ink">{reference}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(backTo)}
              className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
