import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Zap, Receipt } from "lucide-react";
import { JobsShell, Spinner, Button, ErrorNote } from "../../components/jobs/ui";
import { jobsApi, type PlanKey } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useCurrency } from "../../currency/CurrencyContext";
import { useUserScope } from "../../auth/useUserScope";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** /jobs/employer/plans — plans, pay-per-job credits and payment history. */
export default function Plans() {
  const scope = useUserScope();
  const pricing = useQuery({ queryKey: ["jobs-pricing"], queryFn: jobsApi.plans });
  const usage = useQuery({ queryKey: ["jobs", scope, "subscription"], queryFn: jobsApi.subscription, retry: false });
  const payments = useQuery({ queryKey: ["jobs", scope, "payments"], queryFn: jobsApi.payments, retry: false });
  const { currency } = useCurrency();
  const supported = pricing.data?.supported_currencies ?? ["NGN"];
  const [picked, setCcy] = useState<string | null>(null);
  const ccy = picked && supported.includes(picked) ? picked
    : supported.includes(currency.code) ? currency.code : "NGN";
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string>();

  const checkout = useMutation({
    mutationFn: (b: Parameters<typeof jobsApi.checkout>[0]) => jobsApi.checkout({ ...b, currency: ccy }),
    onSuccess: (p) => { window.location.href = p.authorization_url; },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't start the payment.")),
  });

  if (pricing.isLoading) return <JobsShell side="employer"><Spinner /></JobsShell>;
  const current = usage.data?.subscription.active_plan ?? "free";
  const sym = SYMBOL[ccy] ?? "";

  return (
    <JobsShell side="employer">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-ink">Plans & billing</h1>
          {usage.data && (
            <p className="text-[13.5px] text-muted">
              You're on <span className="font-semibold text-ink">{usage.data.plan.label}</span>
              {usage.data.subscription.current_period_end && current !== "free" &&
                ` until ${new Date(usage.data.subscription.current_period_end).toLocaleDateString()}`}
              {" · "}{usage.data.active_jobs}{usage.data.active_job_limit != null ? `/${usage.data.active_job_limit}` : ""} live jobs
              {usage.data.job_credits ? ` · ${usage.data.job_credits} job credits` : ""}
            </p>
          )}
        </div>
        {supported.length > 1 && (
          <div className="flex gap-1.5" role="radiogroup" aria-label="Currency">
            {supported.map((c) => (
              <button key={c} role="radio" aria-checked={ccy === c} onClick={() => setCcy(c)}
                      className={`h-8 rounded-full border px-3 text-[12.5px] font-medium ${ccy === c ? "border-ink bg-ink text-white" : "border-hairline bg-paper text-ink"}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(pricing.data?.plans ?? []).map((p) => {
          const isCurrent = p.key === current;
          return (
            <section key={p.key} className={`flex flex-col rounded-2xl border bg-paper p-5 ${p.key === "pro" ? "border-brand-green/40 shadow-[0_8px_24px_rgba(11,115,39,0.08)]" : "border-hairline"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[17px] font-semibold text-ink">{p.label}</h2>
                {isCurrent && <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[11px] font-semibold text-brand-green">Current</span>}
              </div>
              <p className="mt-2 text-[26px] font-bold text-ink tabular">
                {p.key === "free" ? "Free" : `${sym}${Number(p.prices[ccy] ?? 0).toLocaleString()}`}
                {p.key !== "free" && <span className="text-[13px] font-medium text-muted"> / {pricing.data!.period_days} days</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-[13px] text-ink">
                <Perk>{p.active_job_limit == null ? "Unlimited active jobs" : `${p.active_job_limit} active job${p.active_job_limit === 1 ? "" : "s"}`}</Perk>
                <Perk>Listings run {p.job_duration_days} days</Perk>
                <Perk>{p.applications_per_job == null ? "See every applicant" : `See first ${p.applications_per_job} applicants per job`}</Perk>
                {p.featured_slots > 0 && <Perk>{p.featured_slots} featured listing{p.featured_slots === 1 ? "" : "s"}</Perk>}
                {p.candidate_search && <Perk>{p.candidate_views_per_month == null ? "Unlimited candidate search" : `Candidate search · ${p.candidate_views_per_month} profiles/mo`}</Perk>}
                {p.candidate_direct_message && <Perk>Message any candidate</Perk>}
                {p.analytics && <Perk>Analytics & hiring funnel</Perk>}
                {p.smart_matching && <Perk>Smart candidate matching</Perk>}
              </ul>
              {p.key !== "free" && (
                <Button className="mt-5 w-full" variant={p.key === "pro" ? "primary" : "secondary"}
                        loading={checkout.isPending && checkout.variables?.plan === p.key}
                        onClick={() => checkout.mutate({ purpose: "plan", plan: p.key as PlanKey })}>
                  {isCurrent ? `Extend ${p.label}` : `Upgrade to ${p.label}`}
                </Button>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-paper p-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-[16px] font-semibold text-ink"><Zap size={17} /> Pay per job</h2>
          <p className="text-[13px] text-muted">
            Hiring occasionally? Each credit publishes one extra job for {pricing.data?.job_credit.days} days — no subscription.
            {" "}{sym}{Number(pricing.data?.job_credit.prices[ccy] ?? 0).toLocaleString()} each.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="qty">Quantity</label>
          <select id="qty" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-10 rounded-lg border border-hairline bg-paper px-2 text-[14px]">
            {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <Button loading={checkout.isPending && checkout.variables?.purpose === "job_credit"}
                  onClick={() => checkout.mutate({ purpose: "job_credit", quantity: qty })}>
            Buy for {sym}{(Number(pricing.data?.job_credit.prices[ccy] ?? 0) * qty).toLocaleString()}
          </Button>
        </div>
      </section>
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>

      {(payments.data?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-[16px] font-semibold text-ink"><Receipt size={16} /> Payment history</h2>
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-paper">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead><tr className="border-b border-hairline text-left text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {payments.data!.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {p.purpose === "plan" ? `${p.plan[0]?.toUpperCase()}${p.plan.slice(1)} plan`
                        : p.purpose === "job_credit" ? `${p.quantity} job credit${p.quantity > 1 ? "s" : ""}`
                        : `Boost · ${p.job_title ?? "job"} · ${p.days}d`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink tabular">{SYMBOL[p.currency] ?? ""}{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-2.5 capitalize text-muted">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </JobsShell>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand-green" /><span>{children}</span></li>;
}
