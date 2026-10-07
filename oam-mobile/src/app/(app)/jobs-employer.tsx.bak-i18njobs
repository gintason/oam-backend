import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Eye, Users, Lock, BriefcaseBusiness, ShieldCheck, CheckCircle2, Clock, XCircle } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, jobsErrorCode, useJobsSocket, useJobsCheckout, timeAgo, UPGRADE_CODES, type JobOwned } from "@/features/jobs";
import { JobsScreen, Loading, Card, EmptyState, ErrorNote, PillButton, JobStatusPill, CompanyLogo, Chip, useActionSheet } from "@/features/jobs/ui/kit";
import { ApplicationsChart, FunnelChart } from "@/features/jobs/ui/Charts";
import { UpgradeSheet } from "@/features/jobs/ui/UpgradeSheet";

/** Hiring overview: plan usage, analytics, and every listing with its actions. */
export default function EmployerDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkout = useJobsCheckout();

  const company = useQuery({ queryKey: ["jobs", "company"], queryFn: jobsApi.myCompany, retry: false });
  const has = company.isSuccess;
  const dash = useQuery({ queryKey: ["jobs", "employer-dashboard", days], queryFn: () => jobsApi.employerDashboard(days), enabled: has });
  const jobs = useQuery({ queryKey: ["jobs", "mine"], queryFn: () => jobsApi.myJobs(), enabled: has });
  useJobsSocket((e) => {
    if (e.type.startsWith("application.")) {
      qc.invalidateQueries({ queryKey: ["jobs", "employer-dashboard"] });
      qc.invalidateQueries({ queryKey: ["jobs", "mine"] });
    }
  }, has);

  function onError(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
    else setError(apiErrorMessage(err, "That didn't work."));
  }

  if (company.isLoading) return <JobsScreen title="Hiring overview" side="employer"><Loading /></JobsScreen>;
  if (company.isError && jobsErrorCode(company.error) === "no_employer_profile") return <Redirect href={{ pathname: "/jobs-company", params: { new: "1" } } as never} />;
  if (!company.data) return <JobsScreen title="Hiring overview" side="employer"><ErrorNote>{apiErrorMessage(company.error, "Couldn't load your company.")}</ErrorNote></JobsScreen>;

  const c = company.data;
  const d = dash.data;
  const u = d?.usage ?? c.usage;
  const list = jobs.data?.results ?? [];
  const o = checkout.outcome;

  return (
    <JobsScreen title="Hiring overview" side="employer"
                right={<Pressable onPress={() => router.push("/jobs-post" as never)} accessibilityLabel="Post a job"
                                  style={{ height: 42, width: 42, borderRadius: 21, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center" }}>
                         <Plus size={20} color="#FFF" /></Pressable>}>
      <View style={{ borderRadius: 18, backgroundColor: "#0a0a0a", padding: 16, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, flexDirection: "row" }}>
          <View style={{ flex: 1, backgroundColor: colors.brand.black }} /><View style={{ flex: 1, backgroundColor: colors.brand.red }} /><View style={{ flex: 1, backgroundColor: colors.brand.green }} />
        </View>
        <Pressable onPress={() => router.push("/jobs-company" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <CompanyLogo url={c.logo_url} name={c.company_name} size={42} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text variant="title" color="paper" numberOfLines={1}>{c.company_name}</Text>
              {c.is_verified ? <ShieldCheck size={15} color="#4ade80" /> : null}
            </View>
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.6)" }}>
              {u?.plan.label ?? "Free"} plan{u?.subscription.current_period_end && u.subscription.active_plan !== "free" ? ` · renews ${new Date(u.subscription.current_period_end).toLocaleDateString()}` : ""}
            </Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16, rowGap: 14 }}>
          <Stat label="LIVE JOBS" value={`${u?.active_jobs ?? 0}${u?.active_job_limit != null ? ` / ${u.active_job_limit}` : ""}`} hint={u?.job_credits ? `+${u.job_credits} credits` : undefined} />
          <Stat label="APPLICANTS" value={String(d?.applications.total ?? 0)} />
          <Stat label="VIEWS" value={String(d?.views ?? list.reduce((n, j) => n + j.views_count, 0))} />
          <Stat label="DAYS TO HIRE" value={d?.avg_days_to_hire != null ? String(d.avg_days_to_hire) : "—"} />
        </View>
      </View>

      {c.verification_status !== "verified" ? (
        <Card onPress={c.verification_status === "pending" ? undefined : () => router.push("/jobs-company" as never)}>
          <Text variant="label">{c.verification_status === "pending" ? "Verification in review" : "Get the verified badge"}</Text>
          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>Verified employers get more applicants and skip manual review.</Text>
        </Card>
      ) : null}
      <ErrorNote>{error}</ErrorNote>
      {checkout.verifying ? <Card><Text variant="label">Confirming your payment…</Text></Card> : o ? (
        <Card style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          {o.kind === "success" ? <CheckCircle2 size={22} color={colors.brand.green} /> : o.kind === "pending" ? <Clock size={22} color={colors.warn} /> : <XCircle size={22} color={colors.danger} />}
          <Text variant="caption" style={{ flex: 1 }}>{o.message}</Text>
          <Pressable onPress={checkout.clear} hitSlop={8}><Text variant="caption" color="muted">Dismiss</Text></Pressable>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <Text variant="title">Recruitment analytics</Text>
        {!d?.locked ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[7, 30, 90].map((n) => <Chip key={n} label={`${n}d`} active={days === n} onPress={() => setDays(n)} />)}
          </View>
        ) : null}
      </View>
      {dash.isLoading ? <Loading /> : d?.locked ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}><Lock size={16} color={colors.muted} /><Text variant="caption" style={{ flex: 1 }}>Charts, the hiring funnel and time-to-hire are on Premium and Pro.</Text></View>
          <PillButton label="See plans" onPress={() => setUpgrade("upgrade_required")} />
        </Card>
      ) : d?.series ? (
        <>
          <ApplicationsChart series={d.series} />
          <FunnelChart funnel={d.funnel ?? []} />
        </>
      ) : null}

      <Text variant="title" style={{ marginTop: 4 }}>Your jobs</Text>
      {jobs.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState icon={<BriefcaseBusiness size={20} color={colors.muted} />} title="No jobs yet" body="Post your first job — it takes about three minutes."
                    action={<PillButton label="Post a job" onPress={() => router.push("/jobs-post" as never)} />} />
      ) : list.map((j) => <JobRow key={j.id} job={j} onError={onError} onBoost={(days) => checkout.start({ purpose: "boost", job: j.id, days }, `boost-${j.id}`)} />)}

      <UpgradeSheet reason={upgrade} onClose={() => setUpgrade(null)} />
      {checkout.modal}
    </JobsScreen>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={{ width: "50%" }}>
      <Text variant="caption" style={{ color: "rgba(255,255,255,0.45)", fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.6 }}>{label}</Text>
      <Text variant="heading" color="paper" style={{ fontSize: 20, marginTop: 2 }}>{value}</Text>
      {hint ? <Text variant="caption" style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{hint}</Text> : null}
    </View>
  );
}

function JobRow({ job, onError, onBoost }: { job: JobOwned; onError: (e: unknown) => void; onBoost: (days: number) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["jobs"] });
  const act = useMutation({ mutationFn: (a: "publish" | "pause" | "resume" | "close" | "renew") => jobsApi.jobAction(job.id, a), onSuccess: refresh, onError });
  const feature = useMutation({ mutationFn: (on: boolean) => jobsApi.feature(job.id, on), onSuccess: refresh, onError });
  const remove = useMutation({ mutationFn: () => jobsApi.deleteJob(job.id), onSuccess: refresh, onError });

  const actions: { label: string; run: () => void; destructive?: boolean }[] = [
    { label: "View applicants", run: () => router.push({ pathname: "/jobs-pipeline", params: { id: job.id } } as never) },
    { label: "Edit", run: () => router.push({ pathname: "/jobs-post", params: { id: job.id } } as never) },
    ...(job.status === "draft" ? [{ label: "Publish", run: () => act.mutate("publish") }] : []),
    ...(job.status === "active" ? [{ label: "Pause", run: () => act.mutate("pause") }] : []),
    ...(job.status === "paused" ? [{ label: "Resume", run: () => act.mutate("resume") }] : []),
    ...(["active", "expired", "closed"].includes(job.status) ? [{ label: job.status === "active" ? "Extend" : "Renew", run: () => act.mutate("renew") }] : []),
    ...(job.status === "active" ? [
      { label: job.is_featured ? "Unfeature" : "Feature", run: () => feature.mutate(!job.is_featured) },
      { label: "Boost 7 days (Flutterwave)", run: () => onBoost(7) },
      { label: "Boost 30 days (Flutterwave)", run: () => onBoost(30) },
    ] : []),
    ...(["active", "paused"].includes(job.status) ? [{ label: "Close", destructive: true, run: () => act.mutate("close") }] : []),
    ...(["draft", "expired", "closed"].includes(job.status) ? [{ label: "Delete", destructive: true, run: () => remove.mutate() }] : []),
  ];

  const menu = useActionSheet();
  const openMenu = () => menu.show(job.title, actions);

  return (
    <Card onPress={() => router.push({ pathname: "/jobs-pipeline", params: { id: job.id } } as never)}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" numberOfLines={2}>{job.title}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <JobStatusPill status={job.status} />
            {job.is_boosted ? <Text variant="caption" color="red" style={{ fontFamily: fonts.bold }}>Boosted</Text> : null}
            {job.is_featured ? <Text variant="caption" style={{ fontFamily: fonts.bold }}>Featured</Text> : null}
          </View>
          <Text variant="caption" color="muted">
            {job.status === "active" && job.expires_at ? `Live until ${new Date(job.expires_at).toLocaleDateString()}` : `Updated ${timeAgo(job.updated_at)}`}
            {job.status === "pending_review" && job.moderation_note ? ` · ${job.moderation_note}` : ""}
          </Text>
        </View>
        <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Job actions" style={{ padding: 4 }}>
          <MoreHorizontal size={20} color={colors.muted} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Eye size={14} color={colors.muted} /><Text variant="caption" color="muted">{job.views_count} views</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Users size={14} color={colors.ink} /><Text variant="caption" style={{ fontFamily: fonts.bold }}>{job.applications_count} applicants</Text></View>
      </View>
      {menu.sheet}
    </Card>
  );
}
