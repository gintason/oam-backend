import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import FileDrop, { UploadedThumb, UploadedVideo } from "../../components/FileDrop";
import { uploadsApi } from "../../services/uploads";
import { useUserScope } from "../../auth/useUserScope";
import {
  marketplaceApi, CONDITIONS, type ListingWrite,
} from "../../services/marketplace";
import { apiErrorMessage } from "../../lib/api";
import { formatPhone, naira } from "../../lib/format";

/** Enough to show an item properly without turning the page into a gallery. */
const MAX_IMAGES = 6;
const MAX_VIDEOS = 2;

const EMPTY: ListingWrite = {
  category: "", title: "", description: "", price: "", currency: "NGN",
  negotiable: false, condition: "used", location: "",
  contact_phone: "", contact_whatsapp: "", images: [], videos: [],
};

export default function PostListing() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const qc = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<ListingWrite>(EMPTY);
  const [error, setError] = useState<string>();

  // In edit mode, load the existing listing and prefill the form. Contact
  // fields aren't returned by the public detail endpoint, so they stay blank —
  // a partial PATCH leaves the seller's saved number untouched unless retyped.
  const existing = useQuery({
    queryKey: ["marketplace", scope, "listing", id],
    queryFn: () => marketplaceApi.detail(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    const l = existing.data;
    if (!l) return;
    setForm({
      category: l.category,
      title: l.title,
      description: l.description,
      price: String(l.price),
      currency: l.currency,
      negotiable: l.negotiable,
      condition: l.condition || "used",
      location: l.location,
      contact_phone: "",
      contact_whatsapp: "",
      images: l.images.map((i) => i.url),
      videos: l.videos.map((v) => v.url),
    });
  }, [existing.data]);

  const rules = useQuery({
    queryKey: ["upload-rules"],
    queryFn: uploadsApi.rules,
    staleTime: 10 * 60_000,
  });

  const categories = useQuery({
    queryKey: ["market-categories"],
    queryFn: marketplaceApi.categories,
    staleTime: 10 * 60_000,
  });

  const sub = useQuery({
    queryKey: ["marketplace", scope, "subscription"],
    queryFn: marketplaceApi.subscription,
  });

  const limit = sub.data?.listing_limit ?? null;
  const used = sub.data?.active_listings ?? 0;
  const atLimit = !isEdit && limit !== null && used >= limit;

  const save = useMutation({
    mutationFn: () => {
      if (isEdit) {
        // Partial update: drop empty contact fields so we don't wipe the saved
        // number when the seller leaves them blank.
        const payload: Partial<ListingWrite> = { ...form };
        if (!payload.contact_phone) delete payload.contact_phone;
        if (!payload.contact_whatsapp) delete payload.contact_whatsapp;
        return marketplaceApi.update(id!, payload);
      }
      return marketplaceApi.create(form);
    },
    onSuccess: (listing) => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      navigate(`/marketplace/${listing.id}`);
    },
    onError: (err) =>
      setError(apiErrorMessage(err, isEdit ? "Couldn't save your changes." : "Couldn't post that listing.")),
  });

  function set<K extends keyof ListingWrite>(key: K, value: ListingWrite[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(undefined);
  }


  function submit() {
    setError(undefined);
    if (!form.category) return setError("Choose a category.");
    if (!form.title.trim()) return setError("Give your item a title.");
    if (!form.price || Number(form.price) <= 0) return setError("Enter a price.");
    // Phone is required when posting; on edit it's optional (blank keeps current).
    if (!isEdit && !form.contact_phone) {
      return setError("Add a phone number — buyers see it only after you accept.");
    }
    save.mutate();
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/marketplace/sell")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Selling
        </button>

        <h1 className="font-display text-[22px] font-semibold text-ink sm:text-2xl">
          {isEdit ? "Edit listing" : "Post an item"}
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          {isEdit
            ? "Changes go live right away. Editing removes the Verified badge until it's reviewed again."
            : limit === null
            ? "Unlimited listings on your plan."
            : `${used} of ${limit} listings used on your plan.`}
        </p>

        {atLimit && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 p-4">
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="text-[13.5px] font-semibold text-danger">
                You've reached your listing limit
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                Upgrade your plan, or remove an existing listing to make room.
              </p>
              <button
                onClick={() => navigate("/marketplace/sell")}
                className="mt-2 h-9 rounded-lg bg-brand-red px-3.5 text-[12.5px] font-semibold text-white transition hover:brightness-95"
              >
                See plans
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3.5 rounded-2xl border border-hairline bg-paper p-5 shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
          {error && <p className="text-[13px] text-danger">{error}</p>}

          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="h-11 w-full rounded-xl border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
            >
              <option value="">Choose a category…</option>
              {categories.data?.filter((c) => !c.is_admin_only).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Title" hint="Say what it is, plainly. 'iPhone 13 Pro 256GB' beats 'phone for sale'.">
            <Input value={form.title} onChange={(v) => set("title", v)}
                   placeholder="e.g. Hisense 43-inch Smart TV" />
          </Field>

          <Field label="Description" hint="Condition, age, what's included, any faults. Honesty saves wasted trips.">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe the item, its condition, and why you're selling."
              className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Price (₦)">
              <Input value={form.price} inputMode="numeric"
                     onChange={(v) => set("price", v.replace(/\D/g, ""))}
                     placeholder="145000" />
              {form.price && (
                <p className="mt-1 text-[12px] font-semibold text-brand-red">
                  {naira(form.price)}
                </p>
              )}
            </Field>
            <Field label="Condition">
              <select
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                className="h-11 w-full rounded-xl border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
              >
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-hairline bg-mist px-3.5 py-3">
            <input
              type="checkbox"
              checked={form.negotiable}
              onChange={(e) => set("negotiable", e.target.checked)}
              className="h-4 w-4 accent-[#0B7327]"
            />
            <span className="text-[13.5px] text-ink">
              Price is negotiable
              <span className="block text-[12px] text-muted">
                Buyers are likelier to message when they know there's room to talk.
              </span>
            </span>
          </label>

          <Field label="Location" hint="Area and city, so buyers know how far they'd travel.">
            <Input value={form.location} onChange={(v) => set("location", v)}
                   placeholder="e.g. Wuse 2, Abuja" />
          </Field>

          <Field
            label="Photos"
            hint="The first photo becomes the cover. Listings with photos get far more messages than ones without."
          >
            {(form.images ?? []).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(form.images ?? []).map((url, i) => (
                  <div key={url} className="relative">
                    <UploadedThumb
                      url={url}
                      onRemove={() => set("images", (form.images ?? []).filter((_, j) => j !== i))}
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-ink/75 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(form.images ?? []).length < MAX_IMAGES ? (
              <FileDrop
                purpose="listing_image"
                rule={rules.data?.listing_image}
                compact={(form.images ?? []).length > 0}
                multiple
                onUploaded={(r) => set("images", [...(form.images ?? []), r.url])}
              />
            ) : (
              <p className="rounded-xl border border-hairline bg-mist px-3.5 py-3 text-[12.5px] text-muted">
                That's {MAX_IMAGES} photos — the maximum. Remove one to add another.
              </p>
            )}

            {(form.images ?? []).length > 1 && (
              <p className="mt-2 text-[11.5px] text-muted">
                Photos appear in the order you added them. Remove and re-add to change the cover.
              </p>
            )}
          </Field>

          <Field
            label="Video (optional)"
            hint="A short clip helps buyers trust the item. Up to 2 minutes."
          >
            {(form.videos ?? []).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(form.videos ?? []).map((url, i) => (
                  <UploadedVideo
                    key={url}
                    url={url}
                    onRemove={() => set("videos", (form.videos ?? []).filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}

            {(form.videos ?? []).length < MAX_VIDEOS ? (
              <FileDrop
                purpose="listing_video"
                rule={rules.data?.listing_video}
                compact={(form.videos ?? []).length > 0}
                onUploaded={(r) => set("videos", [...(form.videos ?? []), r.url])}
              />
            ) : (
              <p className="rounded-xl border border-hairline bg-mist px-3.5 py-3 text-[12.5px] text-muted">
                That's {MAX_VIDEOS} videos — the maximum. Remove one to add another.
              </p>
            )}
          </Field>

          <div className="grid gap-3.5 border-t border-hairline pt-3.5 sm:grid-cols-2">
            <Field label="Phone" hint={isEdit ? "Leave blank to keep your current number." : "Shared only after you accept a buyer."}>
              <Input value={formatPhone(form.contact_phone)} inputMode="numeric"
                     onChange={(v) => set("contact_phone", v.replace(/\D/g, "").slice(0, 11))}
                     placeholder="0803 123 4567" />
            </Field>
            <Field label="WhatsApp (optional)" hint="With country code, e.g. 234…">
              <Input value={form.contact_whatsapp} inputMode="numeric"
                     onChange={(v) => set("contact_whatsapp", v.replace(/\D/g, "").slice(0, 15))}
                     placeholder="2348031234567" />
            </Field>
          </div>

          <button
            onClick={submit}
            disabled={save.isPending || atLimit}
            className="h-12 w-full rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {save.isPending
              ? <Loader2 size={18} className="mx-auto animate-spin" />
              : isEdit ? "Save changes" : "Post listing"}
          </button>
        </div>
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
      {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
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
