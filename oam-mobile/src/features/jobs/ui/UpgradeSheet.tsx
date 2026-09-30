import { Modal, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Zap, Lock, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { jobsApi, type PlanKey } from "../api";
import { useJobsCheckout } from "../use-checkout";
import { PillButton } from "./kit";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
const REASON: Record<string, string> = {
  job_limit_reached: "You've reached your plan's active job limit.",
  upgrade_required: "This feature isn't included in your current plan.",
  candidate_view_limit: "You've used this month's candidate profile views.",
  featured_limit_reached: "All your featured slots are in use.",
};

/** Opened whenever the API answers 402 — upgrade, or buy one job post. */
export function UpgradeSheet({ reason, onClose }: { reason: string | null; onClose: () => void }) {
  const open = Boolean(reason);
  const pricing = useQuery({ queryKey: ["jobs-pricing"], queryFn: jobsApi.plans, enabled: open });
  const checkout = useJobsCheckout();
  const ccy = "NGN";
  const sym = SYMBOL[ccy];
  const paid = (pricing.data?.plans ?? []).filter((p) => p.key !== "free");
  const o = checkout.outcome;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
      <View style={{ maxHeight: "88%", backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 20, paddingBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">Upgrade to keep hiring</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 4 }}>{REASON[reason ?? ""] ?? "Choose a plan that fits your hiring."}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={colors.ink} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {checkout.verifying ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator color={colors.brand.green} />
              <Text variant="label" style={{ marginTop: 10 }}>Confirming your payment…</Text>
            </View>
          ) : o ? (
            <View style={{ alignItems: "center", padding: 12, gap: 8 }}>
              {o.kind === "success" ? <CheckCircle2 size={44} color={colors.brand.green} /> : o.kind === "pending" ? <Clock size={44} color={colors.warn} /> : <XCircle size={44} color={colors.danger} />}
              <Text variant="title" style={{ textAlign: "center" }}>{o.kind === "success" ? "Payment successful" : o.kind === "pending" ? "Payment received" : "Payment not completed"}</Text>
              <Text variant="caption" color="muted" style={{ textAlign: "center" }}>{o.message}</Text>
              <PillButton label={o.kind === "success" ? "Done" : "Try again"} onPress={o.kind === "success" ? onClose : checkout.clear} style={{ alignSelf: "stretch", marginTop: 8 }} />
            </View>
          ) : pricing.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {paid.map((p) => (
                <View key={p.key} style={{ borderRadius: 16, borderWidth: 1, borderColor: p.key === "pro" ? "rgba(11,115,39,0.4)" : colors.hairline, padding: 16, backgroundColor: p.key === "pro" ? "rgba(11,115,39,0.03)" : colors.paper }}>
                  <Text variant="title">{p.label}</Text>
                  <Text variant="heading" style={{ marginTop: 4 }}>
                    {sym}{Number(p.prices[ccy] ?? 0).toLocaleString()}
                    <Text variant="caption" color="muted"> / {pricing.data?.period_days ?? 30} days</Text>
                  </Text>
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Perk>{p.active_job_limit == null ? "Unlimited active jobs" : `${p.active_job_limit} active jobs`}</Perk>
                    <Perk>{`${p.featured_slots} featured listings`}</Perk>
                    <Perk>{p.candidate_views_per_month == null ? "Unlimited candidate search" : `Candidate search · ${p.candidate_views_per_month} profiles/mo`}</Perk>
                    {p.candidate_direct_message ? <Perk>Message any candidate</Perk> : null}
                    <Perk>Analytics & smart matching</Perk>
                  </View>
                  <PillButton label={`Choose ${p.label}`} tone={p.key === "pro" ? "green" : "outline"} style={{ marginTop: 14 }}
                              loading={checkout.busy === `plan-${p.key}`}
                              onPress={() => checkout.start({ purpose: "plan", plan: p.key as PlanKey, currency: ccy }, `plan-${p.key}`)} />
                </View>
              ))}
              {(reason === "job_limit_reached") && pricing.data ? (
                <View style={{ borderRadius: 16, backgroundColor: colors.mist, padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Zap size={16} color={colors.ink} /><Text variant="label">Just one more job?</Text></View>
                  <Text variant="caption" color="muted">A single job post: {sym}{Number(pricing.data.job_credit.prices[ccy] ?? 0).toLocaleString()} · live for {pricing.data.job_credit.days} days</Text>
                  <PillButton label="Buy 1 job post" tone="outline" loading={checkout.busy === "job_credit"}
                              onPress={() => checkout.start({ purpose: "job_credit", quantity: 1, currency: ccy })} />
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Lock size={12} color={colors.muted} />
                <Text variant="caption" color="muted">Secure payment by Flutterwave · card, bank transfer or USSD</Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
      {checkout.modal}
    </Modal>
  );
}

function Perk({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Check size={15} color={colors.brand.green} style={{ marginTop: 2 }} />
      <Text variant="body" style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}
