import { Modal, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Zap, Lock, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { jobsApi, type PlanKey } from "../api";
import { useJobsCheckout } from "../use-checkout";
import { PillButton } from "./kit";
import { useTranslation } from "react-i18next";
import { planLabel } from "@/features/jobs/i18n";

const SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
const REASON: Record<string, string> = {
  job_limit_reached: "You've reached your plan's active job limit.",
  upgrade_required: "This feature isn't included in your current plan.",
  candidate_view_limit: "You've used this month's candidate profile views.",
  featured_limit_reached: "All your featured slots are in use.",
};

/** Opened whenever the API answers 402 — upgrade, or buy one job post. */
export function UpgradeSheet({ reason, onClose }: { reason: string | null; onClose: () => void }) {
  const { t } = useTranslation();
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
            <Text variant="heading">{t("jobs.upgradeSheet.upgradeToKeepHiring")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 4 }}>{(reason ?? "") && REASON[reason ?? ""] ? t(`jobs.upgradeSheet.reason.${reason ?? ""}`, { defaultValue: REASON[reason ?? ""] }) : t("jobs.upgradeSheet.chooseAPlanThatFits")}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t("jobs.upgradeSheet.close")}><X size={22} color={colors.ink} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {checkout.verifying ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator color={colors.brand.green} />
              <Text variant="label" style={{ marginTop: 10 }}>{t("jobs.upgradeSheet.confirmingYourPayment")}</Text>
            </View>
          ) : o ? (
            <View style={{ alignItems: "center", padding: 12, gap: 8 }}>
              {o.kind === "success" ? <CheckCircle2 size={44} color={colors.brand.green} /> : o.kind === "pending" ? <Clock size={44} color={colors.warn} /> : <XCircle size={44} color={colors.danger} />}
              <Text variant="title" style={{ textAlign: "center" }}>{o.kind === "success" ? t("jobs.upgradeSheet.paymentSuccessful") : o.kind === "pending" ? t("jobs.upgradeSheet.paymentReceived") : t("jobs.upgradeSheet.paymentNotCompleted")}</Text>
              <Text variant="caption" color="muted" style={{ textAlign: "center" }}>{o.message}</Text>
              <PillButton label={o.kind === "success" ? t("jobs.upgradeSheet.done") : t("jobs.upgradeSheet.tryAgain")} onPress={o.kind === "success" ? onClose : checkout.clear} style={{ alignSelf: "stretch", marginTop: 8 }} />
            </View>
          ) : pricing.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {paid.map((p) => (
                <View key={p.key} style={{ borderRadius: 16, borderWidth: 1, borderColor: p.key === "pro" ? "rgba(11,115,39,0.4)" : colors.hairline, padding: 16, backgroundColor: p.key === "pro" ? "rgba(11,115,39,0.03)" : colors.paper }}>
                  <Text variant="title">{planLabel(p.key, p.label)}</Text>
                  <Text variant="heading" style={{ marginTop: 4 }}>
                    {sym}{Number(p.prices[ccy] ?? 0).toLocaleString()}
                    <Text variant="caption" color="muted">{" "}{t("jobs.upgradeSheet.perDays", { days: pricing.data?.period_days ?? 30 })}</Text>
                  </Text>
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Perk>{p.active_job_limit == null ? t("jobs.upgradeSheet.unlimitedActiveJobs") : t("jobs.upgradeSheet.activeJobs", { count: p.active_job_limit })}</Perk>
                    <Perk>{t("jobs.upgradeSheet.featuredListings", { count: p.featured_slots })}</Perk>
                    <Perk>{p.candidate_views_per_month == null ? t("jobs.upgradeSheet.unlimitedCandidateSearch") : t("jobs.upgradeSheet.candidateSearchCandidateViewsPer", { candidate_views_per_month: p.candidate_views_per_month })}</Perk>
                    {p.candidate_direct_message ? <Perk>{t("jobs.upgradeSheet.messageAnyCandidate")}</Perk> : null}
                    <Perk>{t("jobs.upgradeSheet.analyticsSmartMatching")}</Perk>
                  </View>
                  <PillButton label={t("jobs.upgradeSheet.chooseLabel", { label: planLabel(p.key, p.label) })} tone={p.key === "pro" ? "green" : "outline"} style={{ marginTop: 14 }}
                              loading={checkout.busy === `plan-${p.key}`}
                              onPress={() => checkout.start({ purpose: "plan", plan: p.key as PlanKey, currency: ccy }, `plan-${p.key}`)} />
                </View>
              ))}
              {(reason === "job_limit_reached") && pricing.data ? (
                <View style={{ borderRadius: 16, backgroundColor: colors.mist, padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Zap size={16} color={colors.ink} /><Text variant="label">{t("jobs.upgradeSheet.justOneMoreJob")}</Text></View>
                  <Text variant="caption" color="muted">{t("jobs.upgradeSheet.singleJobPost", { sym, amount: Number(pricing.data.job_credit.prices[ccy] ?? 0).toLocaleString(), days: pricing.data.job_credit.days })}</Text>
                  <PillButton label={t("jobs.upgradeSheet.buy1JobPost")} tone="outline" loading={checkout.busy === "job_credit"}
                              onPress={() => checkout.start({ purpose: "job_credit", quantity: 1, currency: ccy })} />
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Lock size={12} color={colors.muted} />
                <Text variant="caption" color="muted">{t("jobs.upgradeSheet.securePaymentByFlutterwaveCard")}</Text>
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
