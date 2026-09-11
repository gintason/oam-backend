import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Gift, Loader2, Share2, Users, Wallet } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { referralApi } from "../services/referrals";
import { naira } from "../lib/format";
import { useTranslation } from "react-i18next";

const ngn = (v: string | number) => naira(Number(v) || 0);

/**
 * Referral Program dashboard. Shows the user's shareable link, lets them
 * customise the slug, and reports referrals + commission earnings. Users earn
 * 5% of OAM's profit on a referred user's transaction, whenever that profit is
 * at least ₦5,000.
 */
export default function Referral() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["referrals", "dashboard"], queryFn: referralApi.dashboard });

  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (dash.data?.custom_slug && !slug) setSlug(dash.data.custom_slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dash.data?.custom_slug]);

  const save = useMutation({
    mutationFn: () => referralApi.generateLink(slug.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referrals"] });
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2000);
    },
  });

  const link = dash.data?.link ?? "";
  const rate = Math.round((Number(dash.data?.commission_rate) || 0.05) * 100);
  const threshold = ngn(dash.data?.profit_threshold ?? 5000);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: t("referral.shareTitle"), text: t("referral.shareText"), url: link }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> {t("common.back")}
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Gift size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{t("referral.title")}</h1>
            <p className="text-[13px] text-muted">{t("referral.earnWhen", { rate })}</p>
          </div>
        </div>

        {dash.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-green" /></div>
        ) : dash.isError ? (
          <p className="py-16 text-center text-[14px] text-danger">
            {t("referral.loadError")} {" "}
            <button onClick={() => dash.refetch()} className="underline">{t("common.retry")}</button>
          </p>
        ) : (
          <>
            {/* Link card */}
            <div className="rounded-2xl border border-hairline bg-paper p-5">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("referral.yourLink")}</label>
              <div className="flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-[11px] border border-hairline bg-mist px-3.5">
                  <span className="truncate text-[13.5px] text-ink">{link}</span>
                </div>
                <button onClick={copy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border border-hairline bg-paper text-ink transition hover:bg-mist" title={t("referral.copy")}>
                  {copied ? <Check size={17} className="text-brand-green" /> : <Copy size={17} />}
                </button>
                <button onClick={share} className="flex h-11 items-center gap-1.5 rounded-[11px] bg-brand-green px-4 text-[13.5px] font-semibold text-white transition hover:brightness-95">
                  <Share2 size={16} /> {t("referral.share")}
                </button>
              </div>

              {/* Slug editor */}
              <div className="mt-4">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("referral.customizeName")}</label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-[11px] border border-hairline bg-paper px-3">
                    <span className="text-[13px] text-muted">oam-app.com/refer-</span>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
                      placeholder="your-name"
                    />
                    <span className="text-[13px] text-muted">-{dash.data?.referral_code}</span>
                  </div>
                  <button
                    onClick={() => save.mutate()}
                    disabled={save.isPending || !slug.trim() || slug === dash.data?.custom_slug}
                    className="h-11 rounded-[11px] bg-ink px-4 text-[13.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {save.isPending ? "…" : savedNote ? t("referral.saved") : t("common.save")}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat icon={<Users size={16} />} label={t("referral.referrals")} value={String(dash.data?.stats.total_referrals ?? 0)} />
              <Stat icon={<Check size={16} />} label={t("referral.active")} value={String(dash.data?.stats.active_referrals ?? 0)} />
              <Stat icon={<Wallet size={16} />} label={t("referral.earned")} value={ngn(dash.data?.stats.total_earned ?? 0)} accent />
            </div>

            {/* How it works */}
            <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="font-display text-[15px] font-semibold text-ink">{t("referral.howTitle")}</h2>
              <ol className="mt-2 space-y-1.5 text-[13.5px] text-muted">
                <li>{t("referral.step1")}</li>
                <li>{t("referral.step2", { threshold, rate })}</li>
                <li>{t("referral.step3")}</li>
              </ol>
            </div>

            {/* Recent commissions */}
            <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">{t("referral.recent")}</h2>
              {dash.data && dash.data.recent_commissions.length > 0 ? (
                <div className="divide-y divide-hairline">
                  {dash.data.recent_commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-ink">{c.referee_name}</p>
                        <p className="text-[11.5px] text-muted">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[14px] font-semibold text-brand-green">+{ngn(c.commission_amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-[13.5px] text-muted">{t("referral.noneYet")}</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-3.5 text-center">
      <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}>{icon}</span>
      <p className={`mt-1.5 text-[15px] font-bold ${accent ? "text-brand-green" : "text-ink"}`}>{value}</p>
      <p className="text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
