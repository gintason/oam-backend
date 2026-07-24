import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, BadgeCheck, Check, Clock, Images, IdCard, Loader2,
  ShieldCheck, Video, XCircle, Lock,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import FileDrop, { UploadedThumb } from "../../components/FileDrop";
import { DarkPanel, Card } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { uploadsApi } from "../../services/uploads";
import { verificationApi, type Verification } from "../../services/homeservices";
import { apiErrorMessage } from "../../lib/api";

const STATUS: Record<string, { label: string; tone: string; note: string }> = {
  draft: {
    label: "Not submitted",
    tone: "bg-white/10 text-white/70",
    note: "Add the three items below, then submit for review.",
  },
  incomplete: {
    label: "Needs attention",
    tone: "bg-warn/20 text-warn",
    note: "Something didn't pass our checks — details below.",
  },
  pending: {
    label: "Awaiting review",
    tone: "bg-warn/20 text-warn",
    note: "We're checking your documents. Your profile is already live in search.",
  },
  approved: {
    label: "Verified",
    tone: "bg-brand-green/25 text-white",
    note: "You're verified. Customers see the badge, and you can appear in Featured.",
  },
  rejected: {
    label: "Not approved",
    tone: "bg-danger/20 text-danger",
    note: "See the reason below, then re-upload and submit again.",
  },
};

export default function ArtisanVerify() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const [missing, setMissing] = useState<string[]>([]);

  const rules = useQuery({
    queryKey: ["upload-rules"],
    queryFn: uploadsApi.rules,
    staleTime: 10 * 60_000,
  });

  const verification = useQuery({
    queryKey: ["artisan", scope, "verification"],
    queryFn: verificationApi.get,
    retry: false,
  });

  const v: Verification | undefined = verification.data;
  const status = v?.status ?? "draft";
  const meta = STATUS[status] ?? STATUS.draft;
  const locked = status === "pending" || status === "approved";

  function refresh() {
    qc.invalidateQueries({ queryKey: ["artisan"] });
  }

  const attach = useMutation({
    mutationFn: verificationApi.attach,
    onSuccess: () => { setError(undefined); setMissing([]); refresh(); },
    onError: (err) => setError(apiErrorMessage(err, "That file couldn't be attached.")),
  });

  const removeImage = useMutation({
    mutationFn: verificationApi.removeImage,
    onSuccess: refresh,
    onError: (err) => setError(apiErrorMessage(err, "Couldn't remove that photo.")),
  });

  const submit = useMutation({
    mutationFn: verificationApi.submit,
    onSuccess: () => { setError(undefined); setMissing([]); refresh(); },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { missing?: string[]; detail?: string } } })
        ?.response?.data;
      setMissing(data?.missing ?? []);
      setError(data?.missing?.length ? undefined : apiErrorMessage(err, "Couldn't submit just yet."));
      refresh();
    },
  });

  const req = v?.requirements;
  const readyToSubmit =
    Boolean(req?.service_images.done && req?.work_video.done && req?.id_document.done);

  if (verification.isError) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-5">
          <Card className="p-8">
            <p className="text-[14px] text-muted">
              Create your artisan profile before starting verification.
            </p>
            <button
              onClick={() => navigate("/artisans/me")}
              className="mt-4 h-11 rounded-xl bg-brand-red px-5 text-[14px] font-semibold text-white"
            >
              Go to my profile
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/artisans/me")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> My profile
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
                  Get verified
                </h1>
                <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-white/60">
                  Verified artisans carry a badge, rank higher, and are the only ones
                  eligible for Featured on the home page.
                </p>
              </div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide ${meta.tone}`}>
                {meta.label}
              </span>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-[12.5px] leading-relaxed text-white/60">
              {meta.note}
            </p>
          </div>
        </DarkPanel>

        {status === "rejected" && v?.decision_note && (
          <Card className="mb-4 border-danger/25 bg-danger/5 p-4">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink">
              <XCircle size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
              <span><strong>Reviewer's note:</strong> {v.decision_note}</span>
            </p>
          </Card>
        )}

        {missing.length > 0 && (
          <Card className="mb-4 border-warn/30 bg-warn/5 p-4">
            <p className="text-[13px] font-semibold text-ink">Still to sort out</p>
            <ul className="mt-1.5 space-y-1">
              {missing.map((m) => (
                <li key={m} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" />
                  {m}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {error && <p className="mb-4 text-[13px] text-danger">{error}</p>}

        {/* 1. Photos of work */}
        <Card className="mb-4 p-5">
          <Step
            n={1}
            done={Boolean(req?.service_images.done)}
            icon={<Images size={16} strokeWidth={1.75} />}
            title="Photos of your work"
            subtitle={`At least ${req?.service_images.need ?? 2}, up to ${req?.service_images.max ?? 8}. These appear on your public profile.`}
          />

          {v && v.service_images.length > 0 && (
            <div className="mb-3 mt-3.5 flex flex-wrap gap-2">
              {v.service_images.map((img) => (
                <UploadedThumb
                  key={img.id}
                  url={img.url}
                  label={img.caption}
                  onRemove={locked ? undefined : () => removeImage.mutate(img.id)}
                />
              ))}
            </div>
          )}

          {!locked && (v?.service_images.length ?? 0) < (req?.service_images.max ?? 8) && (
            <div className="mt-3">
              <FileDrop
                purpose="artisan_service_image"
                rule={rules.data?.artisan_service_image}
                disabled={attach.isPending}
                onUploaded={(r) =>
                  attach.mutateAsync({
                    purpose: "artisan_service_image",
                    public_id: r.public_id,
                    url: r.url,
                  }).then(() => undefined)
                }
              />
            </div>
          )}
        </Card>

        {/* 2. Video */}
        <Card className="mb-4 p-5">
          <Step
            n={2}
            done={Boolean(req?.work_video.done)}
            icon={<Video size={16} strokeWidth={1.75} />}
            title="Short video of previous work"
            subtitle="10 seconds to 3 minutes. Show the work itself — a finished job, or you working on one."
          />
          {v?.has_work_video && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-3 py-2 text-[12.5px] font-medium text-brand-green">
              <Check size={13} strokeWidth={2.5} /> Video uploaded
            </p>
          )}
          {!locked && (
            <div className="mt-3">
              <FileDrop
                purpose="artisan_work_video"
                rule={rules.data?.artisan_work_video}
                disabled={attach.isPending}
                onUploaded={(r) =>
                  attach.mutateAsync({
                    purpose: "artisan_work_video",
                    public_id: r.public_id,
                    url: r.url,
                  }).then(() => undefined)
                }
              />
            </div>
          )}
        </Card>

        {/* 3. ID */}
        <Card className="mb-4 p-5">
          <Step
            n={3}
            done={Boolean(req?.id_document.done)}
            icon={<IdCard size={16} strokeWidth={1.75} />}
            title="Identity document"
            subtitle="A clear photo of your government-issued ID."
          />

          <p className="mt-3 flex items-start gap-2 rounded-xl border border-brand-green/25 bg-brand-green/5 p-3.5 text-[12.5px] leading-relaxed text-ink">
            <Lock size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
            <span>
              <strong>This one is private.</strong> Your ID is never shown on your profile,
              never sent to customers, and can't be opened by anyone with a link. Only our
              review team sees it, through an access link that expires in five minutes.
            </span>
          </p>

          {v?.has_id_document && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-3 py-2 text-[12.5px] font-medium text-brand-green">
              <Check size={13} strokeWidth={2.5} /> Document uploaded
            </p>
          )}
          {!locked && (
            <div className="mt-3">
              <FileDrop
                purpose="artisan_id_document"
                rule={rules.data?.artisan_id_document}
                disabled={attach.isPending}
                onUploaded={(r) =>
                  attach.mutateAsync({
                    purpose: "artisan_id_document",
                    public_id: r.public_id,
                  }).then(() => undefined)
                }
              />
            </div>
          )}
        </Card>

        {/* Submit */}
        {status === "approved" ? (
          <Card className="border-brand-green/30 bg-brand-green/5 p-5 text-center">
            <BadgeCheck size={26} strokeWidth={1.75} className="mx-auto text-brand-green" />
            <p className="mt-2 text-[14px] font-semibold text-ink">You're verified</p>
            <p className="mt-1 text-[12.5px] text-muted">
              The badge is on your profile and you're eligible for Featured.
            </p>
          </Card>
        ) : status === "pending" ? (
          <Card className="border-warn/30 bg-warn/5 p-5 text-center">
            <Clock size={24} strokeWidth={1.75} className="mx-auto text-warn" />
            <p className="mt-2 text-[14px] font-semibold text-ink">With our review team</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Nothing more to do. Your profile is live in search meanwhile, so you can keep
              taking enquiries while you wait.
            </p>
          </Card>
        ) : (
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !readyToSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {submit.isPending
              ? <Loader2 size={18} className="animate-spin" />
              : <><ShieldCheck size={17} strokeWidth={1.75} /> Submit for review</>}
          </button>
        )}

        {!readyToSubmit && !locked && (
          <p className="mt-2.5 text-center text-[12px] text-muted">
            Add all three items above to submit.
          </p>
        )}
      </main>
    </div>
  );
}

function Step({ n, done, icon, title, subtitle }: {
  n: number; done: boolean; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold transition ${
        done ? "bg-brand-green text-white" : "bg-mist text-muted"
      }`}>
        {done ? <Check size={16} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 font-display text-[15.5px] font-semibold text-ink">
          <span className="text-muted">{icon}</span>
          {title}
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
