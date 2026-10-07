import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Check, Zap, Lock, CheckCircle2, Clock, XCircle, Receipt } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { jobsApi, useJobsCheckout, type PlanKey } from "@/features/jobs";
import { JobsScreen, Loading, Card, ChipGroup, PillButton } from "@/features/jobs/ui/kit";
import { useTranslation } from "react-i18next";
import { planLabel } from "@/features/jobs/i18n";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** Plans, pay-per-job credits and payment history. All payments go through Flutterwave. */
export default function JobsPlans() {
  const { t } = useTranslation();
  const pricing = useQuery({ queryKey: ["jobs-pricing"], queryFn: jobsApi.plans });
  const usage = useQuery({ queryKey: ["jobs", "subscription"], queryFn: jobsApi.subscription, retry: false });
  const payments = useQuery({ queryKey: ["jobs", "payments"], queryFn: jobsApi.payments, retry: false });
  const checkout = useJobsCheckout();
  const [ccyPick, setCcy] = useState<string | null>(null);
  const supported = pricing.data?.supported_currencies ?? ["NGN"];
  const ccy = ccyPick && supported.includes(ccyPick) ? ccyPick : "NGN";
  const [qty, setQty] = useState("1");
  const sym = SYMBOL[ccy] ?? "";
  const current = usage.data?.subscription.active_plan ?? "free";
  const o = checkout.outcome;

  if (pricing.isLoading) return <JobsScreen title={t("jobs.plans.plansBilling")} side="employer"><Loading /></JobsScreen>;

  return (
    <JobsScreen title={t("jobs.plans.plansBilling")} side="employer"
                subtitle={usage.data ? `${t("jobs.plans.youreOn", { plan: planLabel(usage.data.plan.key, usage.data.plan.label), jobs: `${usage.data.active_jobs}${usage.data.active_job_limit != null ? `/${usage.data.active_job_limit}` : ""}` })}${usage.data.job_credits ? ` · ${t("jobs.plans.credits", { count: usage.data.job_credits })}` : ""}` : undefined}>
      {checkout.verifying ? <Card><Text variant="label">{t("jobs.plans.confirmingYourPayment")}</Text></Card> : o ? (
        <Card style={{ alignItems: "center", gap: 6 }}>
          {o.kind === "success" ? <CheckCircle2 size={40} color={colors.brand.green} /> : o.kind === "pending" ? <Clock size={40} color={colors.warn} /> : <XCircle size={40} color={colors.danger} />}
          <Text variant="title">{o.kind === "success" ? t("jobs.plans.paymentSuccessful") : o.kind === "pending" ? t("jobs.plans.paymentReceived") : t("jobs.plans.paymentNotCompleted")}</Text>
          <Text variant="caption" color="muted" style={{ textAlign: "center" }}>{o.message}</Text>
          <PillButton label={t("jobs.plans.ok")} tone="outline" onPress={checkout.clear} style={{ alignSelf: "stretch", marginTop: 6 }} />
        </Card>
      ) : null}

      {supported.length > 1 ? <ChipGroup options={supported.map((c) => ({ value: c, label: c }))} value={ccy} onToggle={setCcy} /> : null}

      {(pricing.data?.plans ?? []).map((p) => {
        const isCurrent = p.key === current;
        return (
          <Card key={p.key} style={{ borderColor: p.key === "pro" ? "rgba(11,115,39,0.4)" : colors.hairline, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="title">{planLabel(p.key, p.label)}</Text>
              {isCurrent ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(11,115,39,0.10)" }}><Text variant="caption" color="green">{t("jobs.plans.current")}</Text></View> : null}
            </View>
            <Text variant="heading">{p.key === "free" ? t("jobs.plans.free") : `${sym}${Number(p.prices[ccy] ?? 0).toLocaleString()}`}{p.key !== "free" ? <Text variant="caption" color="muted">{" "}{t("jobs.plans.periodDaysDays", { period_days: pricing.data!.period_days })}</Text> : null}</Text>
            <Perk>{p.active_job_limit == null ? t("jobs.plans.unlimitedActiveJobs") : t("jobs.plans.activeJobs", { count: p.active_job_limit })}</Perk>
            <Perk>{t("jobs.plans.listingsRunJobDurationDays", { job_duration_days: p.job_duration_days })}</Perk>
            <Perk>{p.applications_per_job == null ? t("jobs.plans.seeEveryApplicant") : t("jobs.plans.seeFirstApplicationsPerJob", { applications_per_job: p.applications_per_job })}</Perk>
            {p.featured_slots ? <Perk>{t("jobs.plans.featuredListings", { count: p.featured_slots })}</Perk> : null}
            {p.candidate_search ? <Perk>{p.candidate_views_per_month == null ? t("jobs.plans.unlimitedCandidateSearch") : t("jobs.plans.candidateSearchCandidateViewsPer", { candidate_views_per_month: p.candidate_views_per_month })}</Perk> : null}
            {p.candidate_direct_message ? <Perk>{t("jobs.plans.messageAnyCandidate")}</Perk> : null}
            {p.analytics ? <Perk>{t("jobs.plans.analyticsSmartMatching")}</Perk> : null}
            {p.key !== "free" ? (
              <PillButton label={isCurrent ? t("jobs.plans.extendLabel", { label: planLabel(p.key, p.label) }) : t("jobs.plans.upgradeToLabel", { label: planLabel(p.key, p.label) })} tone={p.key === "pro" ? "green" : "outline"} style={{ marginTop: 6 }}
                          loading={checkout.busy === `plan-${p.key}`} onPress={() => checkout.start({ purpose: "plan", plan: p.key as PlanKey, currency: ccy }, `plan-${p.key}`)} />
            ) : null}
          </Card>
        );
      })}

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Zap size={17} color={colors.ink} /><Text variant="title">{t("jobs.plans.payPerJob")}</Text></View>
        <Text variant="caption" color="muted">{t("jobs.plans.hiringOccasionallyEachCreditPublishes", { days: pricing.data?.job_credit.days, sym, amount: Number(pricing.data?.job_credit.prices[ccy] ?? 0).toLocaleString() })}</Text>
        <ChipGroup options={["1", "2", "3", "5", "10"].map((n) => ({ value: n, label: n }))} value={qty} onToggle={setQty} />
        <PillButton label={t("jobs.plans.buyQtyFor", { qty, sym, amount: (Number(pricing.data?.job_credit.prices[ccy] ?? 0) * Number(qty)).toLocaleString() })}
                    loading={checkout.busy === "job_credit"} onPress={() => checkout.start({ purpose: "job_credit", quantity: Number(qty), currency: ccy })} />
      </Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Lock size={12} color={colors.muted} /><Text variant="caption" color="muted">{t("jobs.plans.securePaymentByFlutterwaveCard")}</Text>
      </View>

      {(payments.data?.length ?? 0) > 0 ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Receipt size={16} color={colors.ink} /><Text variant="title">{t("jobs.plans.paymentHistory")}</Text></View>
          {payments.data!.map((p) => (
            <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontSize: 14 }}>
                  {p.purpose === "plan" ? t("jobs.plans.planPurchase", { plan: planLabel(p.plan) }) : p.purpose === "job_credit" ? t("jobs.plans.jobCredits", { count: p.quantity }) : t("jobs.plans.boostDaysDays", { days: p.days })}
                </Text>
                <Text variant="caption" color="muted">{new Date(p.created_at).toLocaleDateString()} · {p.status}</Text>
              </View>
              <Text variant="label">{SYMBOL[p.currency] ?? ""}{Number(p.amount).toLocaleString()}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {checkout.modal}
    </JobsScreen>
  );
}

function Perk({ children }: { children: string }) {
  return <View style={{ flexDirection: "row", gap: 8 }}><Check size={15} color={colors.brand.green} style={{ marginTop: 2 }} /><Text variant="body" style={{ flex: 1 }}>{children}</Text></View>;
}
