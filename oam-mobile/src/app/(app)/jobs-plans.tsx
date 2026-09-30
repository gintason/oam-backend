import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Check, Zap, Lock, CheckCircle2, Clock, XCircle, Receipt } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { jobsApi, useJobsCheckout, type PlanKey } from "@/features/jobs";
import { JobsScreen, Loading, Card, ChipGroup, PillButton } from "@/features/jobs/ui/kit";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** Plans, pay-per-job credits and payment history. All payments go through Flutterwave. */
export default function JobsPlans() {
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

  if (pricing.isLoading) return <JobsScreen title="Plans & billing" side="employer"><Loading /></JobsScreen>;

  return (
    <JobsScreen title="Plans & billing" side="employer"
                subtitle={usage.data ? `You're on ${usage.data.plan.label} · ${usage.data.active_jobs}${usage.data.active_job_limit != null ? `/${usage.data.active_job_limit}` : ""} live jobs${usage.data.job_credits ? ` · ${usage.data.job_credits} credits` : ""}` : undefined}>
      {checkout.verifying ? <Card><Text variant="label">Confirming your payment…</Text></Card> : o ? (
        <Card style={{ alignItems: "center", gap: 6 }}>
          {o.kind === "success" ? <CheckCircle2 size={40} color={colors.brand.green} /> : o.kind === "pending" ? <Clock size={40} color={colors.warn} /> : <XCircle size={40} color={colors.danger} />}
          <Text variant="title">{o.kind === "success" ? "Payment successful" : o.kind === "pending" ? "Payment received" : "Payment not completed"}</Text>
          <Text variant="caption" color="muted" style={{ textAlign: "center" }}>{o.message}</Text>
          <PillButton label="OK" tone="outline" onPress={checkout.clear} style={{ alignSelf: "stretch", marginTop: 6 }} />
        </Card>
      ) : null}

      {supported.length > 1 ? <ChipGroup options={supported.map((c) => ({ value: c, label: c }))} value={ccy} onToggle={setCcy} /> : null}

      {(pricing.data?.plans ?? []).map((p) => {
        const isCurrent = p.key === current;
        return (
          <Card key={p.key} style={{ borderColor: p.key === "pro" ? "rgba(11,115,39,0.4)" : colors.hairline, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="title">{p.label}</Text>
              {isCurrent ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(11,115,39,0.10)" }}><Text variant="caption" color="green">Current</Text></View> : null}
            </View>
            <Text variant="heading">{p.key === "free" ? "Free" : `${sym}${Number(p.prices[ccy] ?? 0).toLocaleString()}`}{p.key !== "free" ? <Text variant="caption" color="muted"> / {pricing.data!.period_days} days</Text> : null}</Text>
            <Perk>{p.active_job_limit == null ? "Unlimited active jobs" : `${p.active_job_limit} active job${p.active_job_limit === 1 ? "" : "s"}`}</Perk>
            <Perk>{`Listings run ${p.job_duration_days} days`}</Perk>
            <Perk>{p.applications_per_job == null ? "See every applicant" : `See first ${p.applications_per_job} applicants per job`}</Perk>
            {p.featured_slots ? <Perk>{`${p.featured_slots} featured listings`}</Perk> : null}
            {p.candidate_search ? <Perk>{p.candidate_views_per_month == null ? "Unlimited candidate search" : `Candidate search · ${p.candidate_views_per_month} profiles/mo`}</Perk> : null}
            {p.candidate_direct_message ? <Perk>Message any candidate</Perk> : null}
            {p.analytics ? <Perk>Analytics & smart matching</Perk> : null}
            {p.key !== "free" ? (
              <PillButton label={isCurrent ? `Extend ${p.label}` : `Upgrade to ${p.label}`} tone={p.key === "pro" ? "green" : "outline"} style={{ marginTop: 6 }}
                          loading={checkout.busy === `plan-${p.key}`} onPress={() => checkout.start({ purpose: "plan", plan: p.key as PlanKey, currency: ccy }, `plan-${p.key}`)} />
            ) : null}
          </Card>
        );
      })}

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Zap size={17} color={colors.ink} /><Text variant="title">Pay per job</Text></View>
        <Text variant="caption" color="muted">Hiring occasionally? Each credit publishes one extra job for {pricing.data?.job_credit.days} days. {sym}{Number(pricing.data?.job_credit.prices[ccy] ?? 0).toLocaleString()} each.</Text>
        <ChipGroup options={["1", "2", "3", "5", "10"].map((n) => ({ value: n, label: n }))} value={qty} onToggle={setQty} />
        <PillButton label={`Buy ${qty} for ${sym}${(Number(pricing.data?.job_credit.prices[ccy] ?? 0) * Number(qty)).toLocaleString()}`}
                    loading={checkout.busy === "job_credit"} onPress={() => checkout.start({ purpose: "job_credit", quantity: Number(qty), currency: ccy })} />
      </Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Lock size={12} color={colors.muted} /><Text variant="caption" color="muted">Secure payment by Flutterwave · card, bank transfer or USSD</Text>
      </View>

      {(payments.data?.length ?? 0) > 0 ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Receipt size={16} color={colors.ink} /><Text variant="title">Payment history</Text></View>
          {payments.data!.map((p) => (
            <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontSize: 14 }}>
                  {p.purpose === "plan" ? `${p.plan.charAt(0).toUpperCase()}${p.plan.slice(1)} plan` : p.purpose === "job_credit" ? `${p.quantity} job credit${p.quantity > 1 ? "s" : ""}` : `Boost · ${p.days} days`}
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
