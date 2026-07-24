import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, BadgeCheck, MapPin, Clock, Star, Wrench, Loader2, Lock, Send,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { DarkPanel } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { homeServicesApi } from "../../services/homeservices";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";

export default function ArtisanProfile() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const scope = useUserScope();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();

  const artisan = useQuery({
    queryKey: ["artisan", scope, id],
    queryFn: () => homeServicesApi.detail(id),
    enabled: Boolean(id),
  });

  const enquire = useMutation({
    mutationFn: () => messagingApi.start({ kind: "artisan", id, body: message.trim() }),
    onSuccess: (convo) => navigate(`/messages/${convo.id}`),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't send that enquiry.")),
  });

  const a = artisan.data;

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/artisans/find")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Back to search
        </button>

        {artisan.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : !a ? (
          <p className="rounded-xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">
            This artisan profile isn't available.
          </p>
        ) : (
          <>
            <DarkPanel>
              <div className="flex gap-4 p-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                  {a.profile_photo
                    ? <img src={a.profile_photo} alt="" className="h-full w-full object-cover" />
                    : <Wrench size={26} strokeWidth={1.5} className="text-white/50" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <h1 className="font-display text-[19px] font-semibold sm:text-xl">
                      {a.business_name}
                    </h1>
                    {a.is_verified && (
                      <BadgeCheck size={17} strokeWidth={2} className="mt-1 shrink-0 text-brand-green" />
                    )}
                  </div>
                  <p className="text-[13.5px] text-white/60">{a.category_name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {a.is_featured && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warn/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn">
                        <Star size={9} strokeWidth={2.5} /> Featured
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                      a.is_available ? "bg-brand-green/25 text-white" : "bg-white/10 text-white/60"
                    }`}>
                      {a.is_available ? "Available" : "Busy"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-paper px-5 py-4">
              {a.description && (
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                  {a.description}
                </p>
              )}

              <dl className={`grid gap-2.5 text-[13px] sm:grid-cols-2 ${a.description ? "mt-4 border-t border-hairline pt-4" : ""}`}>
                <div className="flex items-start gap-2">
                  <MapPin size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" />
                  <div>
                    <dt className="text-muted">Based in</dt>
                    <dd className="font-medium text-ink">
                      {[a.city, a.state].filter(Boolean).join(", ") || "—"}
                      {a.distance_km != null && (
                        <span className="font-normal text-muted"> · {a.distance_km.toFixed(1)} km away</span>
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" />
                  <div>
                    <dt className="text-muted">Experience</dt>
                    <dd className="font-medium text-ink">
                      {a.years_experience ? `${a.years_experience} years` : "—"}
                    </dd>
                  </div>
                </div>
              </dl>
              </div>
            </DarkPanel>

            {/* Enquiry — the only route to a phone number */}
            <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5 shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
              <h2 className="font-display text-[16px] font-semibold text-ink">
                Send an enquiry
              </h2>
              <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted">
                <Lock size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                Describe the job. {a.business_name.replace(/^\[demo\]\s*/, "")} will reply here, and
                you'll both see each other's phone number once they accept the work.
              </p>

              {error && <p className="mt-2.5 text-[12.5px] text-danger">{error}</p>}

              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(undefined); }}
                rows={4}
                placeholder="e.g. Kitchen sink is leaking under the cupboard. Are you free this week?"
                className="mt-3 w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />

              <button
                onClick={() => { setError(undefined); if (message.trim()) enquire.mutate(); }}
                disabled={!message.trim() || enquire.isPending}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
              >
                {enquire.isPending
                  ? <Loader2 size={17} className="animate-spin" />
                  : <><Send size={16} strokeWidth={1.75} /> Send enquiry</>}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
