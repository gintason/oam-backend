import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, X, Zap } from "lucide-react";
import { jobsApi, type PlanKey } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useCurrency } from "../../currency/CurrencyContext";
import { Button, ErrorNote } from "./ui";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

const REASON: Record<string, string> = {
  job_limit_reached: "You've reached your plan's active job limit.",
  upgrade_required: "This feature isn't included in your current plan.",
  candidate_view_limit: "You've used this month's candidate profile views.",
  featured_limit_reached: "All your featured slots are in use.",
};

/**
 * Opened whenever the API answers 402. Offers the two ways forward: upgrade
 * the plan, or (for the job limit) buy a single job post. Checkout redirects
 * to the payment page; the return is handled by JobsPaymentReturn.
 */
export default function UpgradeSheet({
  open, reason, onClose,
}: { open: boolean; reason?: string; onClose: () => void }) {
  const pricing = useQuery({ queryKey: ["jobs-pricing"], queryFn: jobsApi.plans, enabled: open });
  const { currency } = useCurrency();
  const supported = pricing.data?.supported_currencies ?? ["NGN"];
  const [picked, setCcy] = useState<string | null>(null);
  const ccy = picked && supported.includes(picked) ? picked
    : supported.includes(currency.code) ? currency.code : "NGN";
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const checkout = useMutation({
    mutationFn: (body: Parameters<typeof jobsApi.checkout>[0]) => jobsApi.checkout({ ...body, currency: ccy }),
    onSuccess: (p) => { window.location.href = p.authorization_url; },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't start the payment.")),
  });

  if (!open) return null;
  const paid = (pricing.data?.plans ?? []).filter((p) => p.key !== "free");
  const sym = SYMBOL[ccy] ?? "";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-paper p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="upgrade-title" className="font-display text-[19px] font-semibold text-ink">Upgrade to keep hiring</h2>
            <p className="mt-1 text-[13.5px] text-muted">{REASON[reason ?? ""] ?? "Choose a plan that fits your hiring."}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {supported.length > 1 && (
          <div className="mt-4 flex gap-1.5" role="radiogroup" aria-label="Currency">
            {supported.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={ccy === c}
                onClick={() => setCcy(c)}
                className={`h-8 rounded-full border px-3 text-[12.5px] font-medium ${ccy === c ? "border-ink bg-ink text-white" : "border-hairline text-ink"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {paid.map((p) => (
            <div key={p.key} className={`flex flex-col rounded-xl border p-4 ${p.key === "pro" ? "border-brand-green/40 bg-brand-green/[0.03]" : "border-hairline"}`}>
              <p className="font-display text-[16px] font-semibold text-ink">{p.label}</p>
              <p className="mt-1 text-[22px] font-bold text-ink tabular">
                {sym}{Number(p.prices[ccy] ?? 0).toLocaleString()}
                <span className="text-[13px] font-medium text-muted"> / {pricing.data?.period_days ?? 30} days</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-[13px] text-ink">
                <Perk>{p.active_job_limit == null ? "Unlimited active jobs" : `${p.active_job_limit} active jobs`}</Perk>
                <Perk>{p.featured_slots} featured listing{p.featured_slots === 1 ? "" : "s"}</Perk>
                <Perk>
                  {p.candidate_views_per_month == null
                    ? "Unlimited candidate search"
                    : `Candidate search · ${p.candidate_views_per_month} profiles/mo`}
                </Perk>
                {p.candidate_direct_message && <Perk>Message any candidate</Perk>}
                <Perk>Analytics & smart matching</Perk>
              </ul>
              <Button
                className="mt-4 w-full"
                variant={p.key === "pro" ? "primary" : "secondary"}
                loading={checkout.isPending && checkout.variables?.plan === p.key}
                onClick={() => checkout.mutate({ purpose: "plan", plan: p.key as PlanKey })}
              >
                Choose {p.label}
              </Button>
            </div>
          ))}
        </div>

        {(reason === "job_limit_reached" || !reason) && pricing.data && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-mist p-4">
            <div>
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink"><Zap size={15} /> Just one more job?</p>
              <p className="text-[12.5px] text-muted">
                A single job post: {sym}{Number(pricing.data.job_credit.prices[ccy] ?? 0).toLocaleString()} · live for {pricing.data.job_credit.days} days
              </p>
            </div>
            <Button
              variant="secondary"
              loading={checkout.isPending && checkout.variables?.purpose === "job_credit"}
              onClick={() => checkout.mutate({ purpose: "job_credit", quantity: 1 })}
            >
              Buy 1 job post
            </Button>
          </div>
        )}

        <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
      </div>
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> <span>{children}</span>
    </li>
  );
}
