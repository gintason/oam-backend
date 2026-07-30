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
import { useTranslation } from "react-i18next";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-white/10 text-white/70",
  incomplete: "bg-warn/20 text-warn",
  pending: "bg-warn/20 text-warn",
  approved: "bg-brand-green/25 text-white",
  rejected: "bg-danger/20 text-danger",
};

export default function ArtisanVerify() {
  const { t } = useTranslation();
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
  const statusKey = STATUS_TONE[status] ? status : "draft";
  const tone = STATUS_TONE[statusKey];
  const locked = status === "pending" || status === "approved";

  function refresh() {
    qc.invalidateQueries({ queryKey: ["artisan"] });
  }

  const attach = useMutation({
    mutationFn: verificationApi.attach,
    onSuccess: () => { setError(undefined); setMissing([]); refresh(); },
    onError: (err) => setError(apiErrorMessage(err, t("artisans.verify.errAttach"))),
  });

  const removeImage = useMutation({
    mutationFn: verificationApi.removeImage,
    onSuccess: refresh,
    onError: (err) => setError(apiErrorMessage(err, t("artisans.verify.errRemove"))),
  });

  const submit = useMutation({
    mutationFn: verificationApi.submit,
    onSuccess: () => { setError(undefined); setMissing([]); refresh(); },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { missing?: string[]; detail?: string } } })
        ?.response?.data;
      setMissing(data?.missing ?? []);
      setError(data?.missing?.length ? undefined : apiErrorMessage(err, t("artisans.verify.errSubmit")));
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
              {t("artisans.verify.noProfile")}
            </p>
            <button
              onClick={() => navigate("/artisans/me")}
              className="mt-4 h-11 rounded-xl bg-brand-red px-5 text-[14px] font-semibold text-white"
            >
              {t("artisans.verify.goToProfile")}
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
          <ArrowLeft size={15} strokeWidth={1.75} /> {t("artisans.verify.backMyProfile")}
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
                  {t("artisans.verify.title")}
                </h1>
                <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-white/60">
                  {t("artisans.verify.subtitle")}
                </p>
              </div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide ${tone}`}>
                {t(`artisans.verify.status.${statusKey}.label`)}
              </span>
            </div>
            <p className="mt-3 border-t border-white/10 pt-3 text-[12.5px] leading-relaxed text-white/60">
              {t(`artisans.verify.status.${statusKey}.note`)}
            </p>
          </div>
        </DarkPanel>

        {status === "rejected" && v?.decision_note && (
          <Card className="mb-4 border-danger/25 bg-danger/5 p-4">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink">
              <XCircle size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
              <span><strong>{t("artisans.verify.reviewerNote")}</strong> {v.decision_note}</span>
            </p>
          </Card>
        )}

        {missing.length > 0 && (
          <Card className="mb-4 border-warn/30 bg-warn/5 p-4">
            <p className="text-[13px] font-semibold text-ink">{t("artisans.verify.stillToSort")}</p>
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
            title={t("artisans.verify.step1Title")}
            subtitle={t("artisans.verify.step1Subtitle", { need: req?.service_images.need ?? 2, max: req?.service_images.max ?? 8 })}
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
            title={t("artisans.verify.step2Title")}
            subtitle={t("artisans.verify.step2Subtitle")}
          />
          {v?.has_work_video && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-3 py-2 text-[12.5px] font-medium text-brand-green">
              <Check size={13} strokeWidth={2.5} /> {t("artisans.verify.videoUploaded")}
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
            title={t("artisans.verify.step3Title")}
            subtitle={t("artisans.verify.step3Subtitle")}
          />

          <p className="mt-3 flex items-start gap-2 rounded-xl border border-brand-green/25 bg-brand-green/5 p-3.5 text-[12.5px] leading-relaxed text-ink">
            <Lock size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
            <span>
              <strong>{t("artisans.verify.idPrivateLabel")}</strong> {t("artisans.verify.idPrivateBody")}
            </span>
          </p>

          {v?.has_id_document && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-3 py-2 text-[12.5px] font-medium text-brand-green">
              <Check size={13} strokeWidth={2.5} /> {t("artisans.verify.documentUploaded")}
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
            <p className="mt-2 text-[14px] font-semibold text-ink">{t("artisans.verify.approvedTitle")}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {t("artisans.verify.approvedBody")}
            </p>
          </Card>
        ) : status === "pending" ? (
          <Card className="border-warn/30 bg-warn/5 p-5 text-center">
            <Clock size={24} strokeWidth={1.75} className="mx-auto text-warn" />
            <p className="mt-2 text-[14px] font-semibold text-ink">{t("artisans.verify.pendingTitle")}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              {t("artisans.verify.pendingBody")}
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
              : <><ShieldCheck size={17} strokeWidth={1.75} /> {t("artisans.verify.submitForReview")}</>}
          </button>
        )}

        {!readyToSubmit && !locked && (
          <p className="mt-2.5 text-center text-[12px] text-muted">
            {t("artisans.verify.addAllThree")}
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
