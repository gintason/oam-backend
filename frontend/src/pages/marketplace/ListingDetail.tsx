import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Package, Star, MapPin, Eye, Loader2, Lock, Send, Tag,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { marketplaceApi, CONDITIONS } from "../../services/marketplace";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";
import { naira, friendlyTime } from "../../lib/format";

export default function ListingDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const scope = useUserScope();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [activeImage, setActiveImage] = useState(0);

  const listing = useQuery({
    queryKey: ["marketplace", scope, "listing", id],
    queryFn: () => marketplaceApi.detail(id),
    enabled: Boolean(id),
  });

  const enquire = useMutation({
    mutationFn: () => messagingApi.start({ kind: "listing", id, body: message.trim() }),
    onSuccess: (convo) => navigate(`/messages/${convo.id}`),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't send that message.")),
  });

  const l = listing.data;
  const conditionLabel = CONDITIONS.find((c) => c.value === l?.condition)?.label ?? l?.condition;
  const images = l?.images ?? [];

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/marketplace/browse")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Back to browsing
        </button>

        {listing.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : !l ? (
          <p className="rounded-xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">
            This listing isn't available. It may have been sold or removed.
          </p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
              <div className="relative aspect-[4/3] bg-mist">
                {images.length > 0 ? (
                  <img src={images[activeImage]?.url} alt=""
                       className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package size={40} strokeWidth={1.25} className="text-muted" />
                  </div>
                )}
                {l.is_featured && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-warn px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
                    <Star size={9} strokeWidth={2.5} /> Featured
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-hairline p-2.5">
                  {images.map((img, i) => (
                    <button key={img.id} onClick={() => setActiveImage(i)}
                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                              i === activeImage ? "border-brand-green" : "border-transparent opacity-70"
                            }`}>
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5">
                <h1 className="font-display text-xl font-semibold leading-snug text-ink">
                  {l.title}
                </h1>
                <p className="mt-1 text-2xl font-bold text-brand-red tabular">
                  {naira(l.price)}
                  {l.negotiable && (
                    <span className="ml-2 text-[12px] font-medium text-muted">negotiable</span>
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip icon={<Tag size={11} strokeWidth={2} />}>{l.category_name}</Chip>
                  {conditionLabel && <Chip>{conditionLabel}</Chip>}
                  {l.location && <Chip icon={<MapPin size={11} strokeWidth={2} />}>{l.location}</Chip>}
                  <Chip icon={<Eye size={11} strokeWidth={2} />}>{l.views_count} views</Chip>
                </div>

                {l.description && (
                  <p className="mt-4 whitespace-pre-wrap border-t border-hairline pt-4 text-[14px] leading-relaxed text-ink">
                    {l.description}
                  </p>
                )}

                <p className="mt-4 text-[12.5px] text-muted">
                  Listed by <span className="font-medium text-ink">{l.seller_name}</span>
                  {" · "}{friendlyTime(l.created_at)}
                </p>
              </div>
            </div>

            {/* Message the seller — the only route to a phone number */}
            <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5 shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
              <h2 className="font-display text-[16px] font-semibold text-ink">
                Message the seller
              </h2>
              <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted">
                <Lock size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                Ask your questions here. Phone numbers are exchanged once the seller
                accepts — so neither of you gives out a number to a stranger.
              </p>

              {error && <p className="mt-2.5 text-[12.5px] text-danger">{error}</p>}

              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(undefined); }}
                rows={3}
                placeholder="Hi, is this still available? Would you take…"
                className="mt-3 w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />

              <button
                onClick={() => { setError(undefined); if (message.trim()) enquire.mutate(); }}
                disabled={!message.trim() || enquire.isPending}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
              >
                {enquire.isPending
                  ? <Loader2 size={17} className="animate-spin" />
                  : <><Send size={16} strokeWidth={1.75} /> Send message</>}
              </button>

              <p className="mt-3 rounded-lg bg-mist px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
                <span className="font-semibold text-ink">Stay safe:</span> meet in a public
                place, inspect before you pay, and never send money in advance to
                someone you haven't met.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-1 text-[11.5px] font-medium text-muted">
      {icon}{children}
    </span>
  );
}
