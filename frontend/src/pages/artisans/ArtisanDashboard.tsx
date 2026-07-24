import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, Star, BadgeCheck, MessagesSquare, Save, Rocket, Check, ShieldCheck, ChevronRight } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import FileDrop, { UploadedThumb } from "../../components/FileDrop";
import { uploadsApi } from "../../services/uploads";
import { DarkPanel, Card, Stat, SectionTitle } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import {
  homeServicesApi, BOOST_TIERS, type ArtisanWrite,
} from "../../services/homeservices";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";
import { naira, formatPhone } from "../../lib/format";

const EMPTY: ArtisanWrite = {
  category: "", business_name: "", description: "", phone: "", whatsapp: "",
  address: "", city: "", state: "", years_experience: 0, is_available: true,
  profile_photo: "",
};

/**
 * The artisan's own view: create or edit the profile, buy a boost, and see
 * enquiries. Reachable from the hub, and links back to it.
 */
export default function ArtisanDashboard() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState<ArtisanWrite>(EMPTY);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pendingDays, setPendingDays] = useState<number | null>(null);

  const uploadRules = useQuery({
    queryKey: ["upload-rules"],
    queryFn: uploadsApi.rules,
    staleTime: 10 * 60_000,
  });

  const categories = useQuery({
    queryKey: ["artisan-categories"],
    queryFn: homeServicesApi.categories,
    staleTime: 10 * 60_000,
  });

  const mine = useQuery({
    queryKey: ["artisan", scope, "me"],
    queryFn: homeServicesApi.me,
    retry: false,
  });
  const hasProfile = mine.isSuccess && Boolean(mine.data?.id);

  const enquiries = useQuery({
    queryKey: ["messaging", scope, "list", "provider"],
    queryFn: () => messagingApi.list("provider"),
    enabled: hasProfile,
    refetchInterval: 30000,
  });
  const artisanEnquiries = (enquiries.data?.results ?? []).filter((c) => c.kind === "artisan");
  const awaiting = artisanEnquiries.filter((c) => c.status === "open").length;

  // Prefill once the profile loads.
  useEffect(() => {
    if (!mine.data) return;
    const d = mine.data as ArtisanWrite & { category?: string };
    setForm({
      category: (d.category as string) || "",
      business_name: d.business_name || "",
      description: d.description || "",
      phone: d.phone || "",
      whatsapp: d.whatsapp || "",
      address: d.address || "",
      city: d.city || "",
      state: d.state || "",
      years_experience: d.years_experience || 0,
      is_available: d.is_available ?? true,
      profile_photo: (d as { profile_photo?: string }).profile_photo || "",
    });
  }, [mine.data]);

  const save = useMutation({
    mutationFn: () => homeServicesApi.register(form),
    onSuccess: () => {
      setSaved(true);
      setError(undefined);
      qc.invalidateQueries({ queryKey: ["artisan"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't save your profile.")),
  });

  const boost = useMutation({
    mutationFn: (days: number) => homeServicesApi.startBoost(days),
    onSuccess: (data) => { window.location.href = data.authorization_url; },
    onError: (err) => {
      setPendingDays(null);
      setError(apiErrorMessage(err, "Couldn't start that payment."));
    },
  });

  // Returning from Paystack.
  const boostRef = params.get("reference") || params.get("trxref");
  const verify = useQuery({
    queryKey: ["artisan-boost-verify", boostRef],
    queryFn: () => homeServicesApi.verifyBoost(boostRef!),
    enabled: Boolean(boostRef),
    retry: 1,
  });
  useEffect(() => {
    if (verify.isSuccess) {
      qc.invalidateQueries({ queryKey: ["artisan"] });
      setParams({}, { replace: true });
    }
  }, [verify.isSuccess]);

  function set<K extends keyof ArtisanWrite>(key: K, value: ArtisanWrite[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(undefined);
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/artisans")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Home services
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
              {hasProfile ? "My artisan profile" : "Offer your services"}
            </h1>
            <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-white/60">
              {hasProfile
                ? "Keep your details current — customers see this before they message you."
                : "List your trade so customers nearby can find and message you."}
            </p>

            {hasProfile && (
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
                <Stat
                  label="Visibility"
                  value={mine.data?.is_featured ? "Boosted" : "Standard"}
                  hint={mine.data?.is_featured ? "shown first in search" : "boost to rank higher"}
                  tone={mine.data?.is_featured ? "good" : "default"}
                />
                <Stat
                  label="Enquiries"
                  value={artisanEnquiries.length}
                  hint={awaiting > 0 ? `${awaiting} awaiting reply` : "all answered"}
                  tone={awaiting > 0 ? "warn" : "default"}
                />
                <Stat
                  label="Status"
                  value={form.is_available ? "Available" : "Busy"}
                  hint={mine.data?.is_verified ? "verified profile" : "not yet verified"}
                  tone={form.is_available ? "good" : "warn"}
                />
              </div>
            )}
          </div>
        </DarkPanel>

        {verify.isSuccess && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3.5">
            <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-[13px] text-ink">
              <span className="font-semibold">Boost active.</span> Your profile will appear
              above unboosted artisans in search results.
            </p>
          </div>
        )}

        {/* enquiries */}
        {hasProfile && (
          <Link
            to="/messages"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <MessagesSquare size={18} strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                {artisanEnquiries.length} enquir{artisanEnquiries.length === 1 ? "y" : "ies"}
              </p>
              <p className="text-[12.5px] text-muted">
                {awaiting > 0
                  ? `${awaiting} waiting for your reply`
                  : "Nothing needs your attention"}
              </p>
            </div>
            {awaiting > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-red px-2 text-[12px] font-bold text-white">
                {awaiting}
              </span>
            )}
          </Link>
        )}

        {/* verification */}
        {hasProfile && (
          <Link
            to="/artisans/verify"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
              mine.data?.is_verified ? "bg-brand-green/10 text-brand-green" : "bg-warn/10 text-warn"
            }`}>
              <ShieldCheck size={18} strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                {mine.data?.is_verified ? "Verified artisan" : "Get verified"}
              </p>
              <p className="text-[12.5px] leading-relaxed text-muted">
                {mine.data?.is_verified
                  ? "Your badge is live and you're eligible for Featured."
                  : "Add photos, a short video and your ID. Verified artisans rank higher and can be Featured."}
              </p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-muted" />
          </Link>
        )}

        {/* boost */}
        {hasProfile && (
          <Card className="mt-4 p-5">
            <div className="flex items-start gap-2">
              <Rocket size={17} strokeWidth={1.75} className="mt-0.5 text-warn" />
              <div>
                <h2 className="font-display text-[16px] font-semibold text-ink">
                  Get seen first
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                  Boosted profiles appear above others in search. Customers rarely
                  scroll far, so placement is most of the battle.
                </p>
              </div>
            </div>

            {mine.data?.is_featured && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-warn/10 px-2.5 py-1 text-[12px] font-semibold text-warn">
                <Star size={11} strokeWidth={2.5} /> Currently boosted
              </p>
            )}

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {BOOST_TIERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setPendingDays(t.days); boost.mutate(t.days); }}
                  disabled={boost.isPending}
                  className={`rounded-xl border-2 p-3.5 text-left transition disabled:opacity-60 ${
                    pendingDays === t.days
                      ? "border-brand-red bg-brand-red/5"
                      : "border-hairline bg-paper hover:border-brand-red/40 hover:bg-mist"
                  }`}
                >
                  <p className="text-[13.5px] font-bold text-ink">{t.label}</p>
                  <p className="mt-0.5 text-[17px] font-bold text-brand-red tabular">
                    {naira(t.price)}
                  </p>
                  {pendingDays === t.days && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-red">
                      <Loader2 size={11} className="animate-spin" /> Redirecting…
                    </p>
                  )}
                  <p className="mt-0.5 text-[12px] text-muted">
                    {t.days} days featured
                    {t.days >= 90 && (
                      <span className="ml-1 font-semibold text-brand-green">
                        · {naira(Math.round(t.price / (t.days / 30)))}/mo
                      </span>
                    )}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px] text-muted">
              One-off payment by card. This isn't a subscription — it won't renew
              automatically.
            </p>
          </Card>
        )}

        {/* profile form */}
        <Card className="mt-4 p-5">
          <h2 className="font-display text-[16px] font-semibold text-ink">
            {hasProfile ? "Profile details" : "Your details"}
          </h2>

          {error && <p className="mt-2.5 text-[13px] text-danger">{error}</p>}

          <div className="mt-4 space-y-3.5">
            <Field
              label="Profile photo"
              hint="A clear photo of you, or your business logo. It's the first thing customers see."
            >
              <div className="flex items-start gap-3">
                {form.profile_photo ? (
                  <UploadedThumb
                    url={form.profile_photo}
                    onRemove={() => set("profile_photo", "")}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <FileDrop
                    purpose="artisan_profile_photo"
                    rule={uploadRules.data?.artisan_profile_photo}
                    compact
                    onUploaded={(r) => set("profile_photo", r.url)}
                  />
                </div>
              </div>
            </Field>

            <Field label="Trade">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="h-11 w-full rounded-xl border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
              >
                <option value="">Choose your trade…</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Business name">
              <Input value={form.business_name} onChange={(v) => set("business_name", v)}
                     placeholder="e.g. Sure Flow Plumbing" />
            </Field>

            <Field label="What you do" hint="Customers read this before messaging you.">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="Describe your services, the areas you cover, and your typical response time."
                className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />
            </Field>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Phone" hint="Shared only after you accept a job.">
                <Input value={formatPhone(form.phone)} inputMode="numeric"
                       onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 11))}
                       placeholder="0803 123 4567" />
              </Field>
              <Field label="WhatsApp" hint="With country code, e.g. 234…">
                <Input value={form.whatsapp} inputMode="numeric"
                       onChange={(v) => set("whatsapp", v.replace(/\D/g, "").slice(0, 15))}
                       placeholder="2348031234567" />
              </Field>
            </div>

            <Field label="Address">
              <Input value={form.address} onChange={(v) => set("address", v)}
                     placeholder="Street and area" />
            </Field>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="City">
                <Input value={form.city} onChange={(v) => set("city", v)} placeholder="Abuja" />
              </Field>
              <Field label="State">
                <Input value={form.state} onChange={(v) => set("state", v)} placeholder="FCT" />
              </Field>
              <Field label="Years working">
                <Input value={String(form.years_experience || "")} inputMode="numeric"
                       onChange={(v) => set("years_experience", Number(v.replace(/\D/g, "")) || 0)}
                       placeholder="5" />
              </Field>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-hairline bg-mist px-3.5 py-3">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => set("is_available", e.target.checked)}
                className="h-4 w-4 accent-[#0B7327]"
              />
              <span className="text-[13.5px] text-ink">
                Available for work
                <span className="block text-[12px] text-muted">
                  Turn this off when you're fully booked — you'll still appear, marked busy.
                </span>
              </span>
            </label>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.business_name || !form.category}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-green text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 size={17} className="animate-spin" />
              : saved ? <><BadgeCheck size={16} strokeWidth={2} /> Saved</>
              : <><Save size={16} strokeWidth={1.75} /> {hasProfile ? "Save changes" : "Create my profile"}</>}
          </button>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
    />
  );
}
