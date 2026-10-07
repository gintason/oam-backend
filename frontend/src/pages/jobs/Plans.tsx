import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Lock, Zap, Receipt } from "lucide-react";
import { JobsShell, Spinner, Button, ErrorNote } from "../../components/jobs/ui";
import { jobsApi, type PlanKey } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useCurrency } from "../../currency/CurrencyContext";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";
import { planLabel } from "../../services/jobsI18n";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** /jobs/employer/plans — plans, pay-per-job credits and payment history. */
export default function Plans() {
  const { t } = useTranslation();
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
    onError: (err) => setError(apiErrorMessage(err, t("jobs.plans.couldnTStartThePayment"))),
  });

  if (pricing.isLoading) return <JobsShell side="employer"><Spinner /></JobsShell>;
  const current = usage.data?.subscription.active_plan ?? "free";
  const sym = SYMBOL[ccy] ?? "";

  return (
    <JobsShell side="employer">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-ink">{t("jobs.plans.plansBilling")}</h1>
          {usage.data && (
            <p className="text-[13.5px] text-muted">
              {t("jobs.plans.youReOn")}{" "}<span className="font-semibold text-ink">{planLabel(usage.data.plan.key, usage.data.plan.label)}</span>
              {usage.data.subscription.current_period_end && current !== "free" &&
                t("jobs.plans.until", { date: new Date(usage.data.subscription.current_period_end).toLocaleDateString() })}
              {" · "}{usage.data.active_jobs}{usage.data.active_job_limit != null ? `/${usage.data.active_job_limit}` : ""}{" "}{t("jobs.plans.liveJobs")}
              {usage.data.job_credits ? ` · ${t("jobs.plans.jobCredits", { count: usage.data.job_credits })}` : ""}
            </p>
          )}
        </div>
        {supported.length > 1 && (
          <div className="flex gap-1.5" role="radiogroup" aria-label={t("jobs.plans.currency")}>
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
                <h2 className="font-display text-[17px] font-semibold text-ink">{planLabel(p.key, p.label)}</h2>
                {isCurrent && <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[11px] font-semibold text-brand-green">{t("jobs.plans.current")}</span>}
              </div>
              <p className="mt-2 text-[26px] font-bold text-ink tabular">
                {p.key === "free" ? t("jobs.plans.free") : `${sym}${Number(p.prices[ccy] ?? 0).toLocaleString()}`}
                {p.key !== "free" && <span className="text-[13px] font-medium text-muted">{" "}{t("jobs.plans.periodDaysDays", { period_days: pricing.data!.period_days })}</span>}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-[13px] text-ink">
                <Perk>{p.active_job_limit == null ? t("jobs.plans.unlimitedActiveJobs") : t("jobs.plans.activeJobs", { count: p.active_job_limit })}</Perk>
                <Perk>{t("jobs.plans.listingsRunJobDurationDays", { job_duration_days: p.job_duration_days })}</Perk>
                <Perk>{p.applications_per_job == null ? t("jobs.plans.seeEveryApplicant") : t("jobs.plans.seeFirstApplicationsPerJob", { applications_per_job: p.applications_per_job })}</Perk>
                {p.featured_slots > 0 && <Perk>{t("jobs.plans.featuredListings", { count: p.featured_slots })}</Perk>}
                {p.candidate_search && <Perk>{p.candidate_views_per_month == null ? t("jobs.plans.unlimitedCandidateSearch") : t("jobs.plans.candidateSearchCandidateViewsPer", { candidate_views_per_month: p.candidate_views_per_month })}</Perk>}
                {p.candidate_direct_message && <Perk>{t("jobs.plans.messageAnyCandidate")}</Perk>}
                {p.analytics && <Perk>{t("jobs.plans.analyticsHiringFunnel")}</Perk>}
                {p.smart_matching && <Perk>{t("jobs.plans.smartCandidateMatching")}</Perk>}
              </ul>
              {p.key !== "free" && (
                <Button className="mt-5 w-full" variant={p.key === "pro" ? "primary" : "secondary"}
                        loading={checkout.isPending && checkout.variables?.plan === p.key}
                        onClick={() => checkout.mutate({ purpose: "plan", plan: p.key as PlanKey })}>
                  {isCurrent ? t("jobs.plans.extendLabel", { label: planLabel(p.key, p.label) }) : t("jobs.plans.upgradeToLabel", { label: planLabel(p.key, p.label) })}
                </Button>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-paper p-5">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-[16px] font-semibold text-ink"><Zap size={17} />{" "}{t("jobs.plans.payPerJob")}</h2>
          <p className="text-[13px] text-muted">
            {t("jobs.plans.hiringOccasionallyEachCreditPublishes", { days: pricing.data?.job_credit.days })}
            {" "}{sym}{Number(pricing.data?.job_credit.prices[ccy] ?? 0).toLocaleString()}{" "}{t("jobs.plans.each")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="qty">{t("jobs.plans.quantity")}</label>
          <select id="qty" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-10 rounded-lg border border-hairline bg-paper px-2 text-[14px]">
            {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <Button loading={checkout.isPending && checkout.variables?.purpose === "job_credit"}
                  onClick={() => checkout.mutate({ purpose: "job_credit", quantity: qty })}>
            {t("jobs.plans.buyFor", { sym, amount: (Number(pricing.data?.job_credit.prices[ccy] ?? 0) * qty).toLocaleString() })}
          </Button>
        </div>
      </section>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted"><Lock size={12} />{" "}{t("jobs.plans.securePaymentByFlutterwaveCard")}</p>
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>

      {(payments.data?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-[16px] font-semibold text-ink"><Receipt size={16} />{" "}{t("jobs.plans.paymentHistory")}</h2>
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-paper">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead><tr className="border-b border-hairline text-left text-muted">
                <th className="px-4 py-2.5 font-medium">{t("jobs.plans.date")}</th><th className="px-4 py-2.5 font-medium">{t("jobs.plans.item")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("jobs.plans.amount")}</th><th className="px-4 py-2.5 font-medium">{t("jobs.plans.status")}</th>
              </tr></thead>
              <tbody>
                {payments.data!.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {p.purpose === "plan" ? t("jobs.plans.planPurchase", { plan: planLabel(p.plan) })
                        : p.purpose === "job_credit" ? t("jobs.plans.jobCredits", { count: p.quantity })
                        : t("jobs.plans.boostPurchase", { job: p.job_title ?? t("jobs.plans.aJob"), days: p.days })}
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
