import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Car, Check, Eye, Gauge, Loader2, Plus, Trash2, X,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import FileDrop, { UploadedThumb } from "../../components/FileDrop";
import { DarkPanel, Card, Stat, SectionTitle } from "../../components/Surface";
import { useAuth } from "../../auth/AuthContext";
import { uploadsApi } from "../../services/uploads";
import {
  motorsApi, BODY_TYPES, FUELS, TRANSMISSIONS,
  type MotorsListing, type Vehicle,
} from "../../services/motors";
import { apiErrorMessage } from "../../lib/api";
import { naira, formatPhone, friendlyTime } from "../../lib/format";

const MAX_PHOTOS = 12;

const EMPTY_VEHICLE: Vehicle = {
  make: "", model_name: "", year: new Date().getFullYear(), mileage_km: null,
  transmission: "automatic", fuel: "petrol", body_type: "sedan",
  colour: "", engine_size: "", seats: null,
  is_registered: false, duty_paid: false, vin: "",
};

/**
 * O.A.M Motors inventory — staff only.
 *
 * These listings skip the Free/Premium/Pro caps on purpose: those exist to
 * price third-party sellers, and OAM charging itself for its own stock would be
 * meaningless bookkeeping.
 */
export default function MotorsAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);

  const isStaff = Boolean(
    (user as { is_staff?: boolean; is_superuser?: boolean } | null)?.is_staff ||
    (user as { is_superuser?: boolean } | null)?.is_superuser,
  );

  const inventory = useQuery({
    queryKey: ["motors", "inventory"],
    queryFn: () => motorsApi.list(),
    enabled: isStaff,
    retry: false,
  });

  const remove = useMutation({
    mutationFn: motorsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["motors"] }),
  });

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-5">
          <Card className="p-8">
            <p className="text-[14px] text-muted">This area is for OAM staff.</p>
            <button
              onClick={() => navigate("/marketplace")}
              className="mt-4 h-11 rounded-xl bg-brand-red px-5 text-[14px] font-semibold text-white"
            >
              Back to Marketplace
            </button>
          </Card>
        </main>
      </div>
    );
  }

  const listings = inventory.data?.results ?? [];
  const live = listings.filter((l) => l.status === "active").length;
  const views = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/marketplace")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Marketplace
        </button>

        <DarkPanel className="mb-4">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight sm:text-[26px]">
                  O.A.M Motors
                </h1>
                <p className="mt-1 text-[13.5px] text-white/60">
                  Vehicles sold directly by O.A.M Motors.
                </p>
              </div>
              <button
                onClick={() => setAdding((v) => !v)}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-semibold transition ${
                  adding
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-brand-red text-white hover:brightness-110"
                }`}
              >
                {adding ? <><X size={15} strokeWidth={2} /> Cancel</> : <><Plus size={16} strokeWidth={2} /> Add vehicle</>}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <Stat label="In stock" value={live} hint="listed and live" />
              <Stat label="Total" value={listings.length} hint="including sold" />
              <Stat label="Views" value={views.toLocaleString()} hint="across all vehicles" />
            </div>
          </div>
        </DarkPanel>

        {adding && (
          <VehicleForm
            onDone={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["motors"] }); }}
            onCancel={() => setAdding(false)}
          />
        )}

        <SectionTitle>Inventory</SectionTitle>

        {inventory.isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : listings.length === 0 ? (
          <Card className="py-12 text-center">
            <Car size={28} strokeWidth={1.5} className="mx-auto text-muted" />
            <p className="mt-2.5 text-[14px] font-medium text-ink">No vehicles listed yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">
              Vehicles you add here appear in the Marketplace under O.A.M Motors, and
              buyers message you through the app like any other listing.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => (
              <VehicleRow
                key={l.id}
                listing={l}
                onRemove={() => remove.mutate(l.id)}
                removing={remove.isPending}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VehicleRow({ listing, onRemove, removing }: {
  listing: MotorsListing; onRemove: () => void; removing: boolean;
}) {
  const v = listing.vehicle;
  const cover = listing.images.find((i) => i.is_primary) ?? listing.images[0];
  const sold = listing.status !== "active";

  return (
    <li>
      <Card className={`flex gap-3 p-3.5 ${sold ? "opacity-60" : ""}`}>
        <span className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-mist">
          {cover
            ? <img src={cover.url} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full items-center justify-center">
                <Car size={22} strokeWidth={1.5} className="text-muted" />
              </span>}
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[14px] font-semibold text-ink">{listing.title}</p>
          <p className="tabular text-[15px] font-bold text-brand-red">
            {naira(listing.price)}
            {listing.negotiable && (
              <span className="ml-1.5 text-[11px] font-medium text-muted">negotiable</span>
            )}
          </p>

          {v && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
              {v.mileage_km != null && (
                <span className="inline-flex items-center gap-1">
                  <Gauge size={10} strokeWidth={2} />
                  {v.mileage_km.toLocaleString()} km
                </span>
              )}
              {v.transmission && <span className="capitalize">{v.transmission}</span>}
              {v.fuel && <span className="capitalize">{v.fuel}</span>}
              {v.is_registered && <span className="text-brand-green">Registered</span>}
              {v.duty_paid && <span className="text-brand-green">Duty paid</span>}
            </div>
          )}

          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Eye size={10} strokeWidth={2} /> {listing.views_count}
            </span>
            <span>{friendlyTime(listing.created_at)}</span>
            {sold && (
              <span className="rounded bg-mist px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                {listing.status}
              </span>
            )}
          </p>
        </div>

        {!sold && (
          <button
            onClick={onRemove}
            disabled={removing}
            title="Remove from sale"
            className="inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-lg border border-hairline bg-paper px-2.5 text-[12px] font-medium text-muted transition hover:border-danger/40 hover:text-danger disabled:opacity-60"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        )}
      </Card>
    </li>
  );
}

/* ------------------------------------------------------------------ */

function VehicleForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY_VEHICLE);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [condition, setCondition] = useState("used");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const rules = useQuery({
    queryKey: ["upload-rules"],
    queryFn: uploadsApi.rules,
    staleTime: 10 * 60_000,
  });

  const create = useMutation({
    mutationFn: () => motorsApi.create({
      description, price, location, condition, negotiable,
      contact_phone: phone, contact_whatsapp: whatsapp,
      vehicle, images,
    }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err, "Couldn't save that vehicle.")),
  });

  function set<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setVehicle((v) => ({ ...v, [key]: value }));
    setError(undefined);
  }

  function submit() {
    setError(undefined);
    if (!vehicle.make.trim()) return setError("Enter the make, e.g. Toyota.");
    if (!vehicle.model_name.trim()) return setError("Enter the model, e.g. Camry.");
    if (!price) return setError("Enter a price.");
    if (images.length === 0) return setError("Add at least one photo — nobody buys a car they can't see.");
    if (!phone) return setError("Add a contact number.");
    create.mutate();
  }

  const headline = `${vehicle.year} ${vehicle.make} ${vehicle.model_name}`.trim();

  return (
    <Card className="mb-5 p-5">
      <SectionTitle>Add a vehicle</SectionTitle>

      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}

      <div className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Make"><Input value={vehicle.make} onChange={(v) => set("make", v)} placeholder="Toyota" /></Field>
          <Field label="Model"><Input value={vehicle.model_name} onChange={(v) => set("model_name", v)} placeholder="Camry" /></Field>
          <Field label="Year">
            <Input value={String(vehicle.year)} inputMode="numeric"
                   onChange={(v) => set("year", Number(v.replace(/\D/g, "").slice(0, 4)) || 0)} />
          </Field>
        </div>

        {headline.length > 5 && (
          <p className="rounded-lg bg-mist px-3 py-2 text-[12.5px] text-muted">
            Listing title will be <span className="font-semibold text-ink">{headline}</span>
          </p>
        )}

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Mileage (km)">
            <Input value={vehicle.mileage_km?.toString() ?? ""} inputMode="numeric"
                   onChange={(v) => set("mileage_km", v ? Number(v.replace(/\D/g, "")) : null)}
                   placeholder="86000" />
          </Field>
          <Field label="Transmission">
            <Select value={vehicle.transmission} onChange={(v) => set("transmission", v)} options={TRANSMISSIONS} />
          </Field>
          <Field label="Fuel">
            <Select value={vehicle.fuel} onChange={(v) => set("fuel", v)} options={FUELS} />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-4">
          <Field label="Body type">
            <Select value={vehicle.body_type} onChange={(v) => set("body_type", v)} options={BODY_TYPES} />
          </Field>
          <Field label="Colour"><Input value={vehicle.colour} onChange={(v) => set("colour", v)} placeholder="Silver" /></Field>
          <Field label="Engine"><Input value={vehicle.engine_size} onChange={(v) => set("engine_size", v)} placeholder="2.4L" /></Field>
          <Field label="Seats">
            <Input value={vehicle.seats?.toString() ?? ""} inputMode="numeric"
                   onChange={(v) => set("seats", v ? Number(v.replace(/\D/g, "")) : null)} placeholder="5" />
          </Field>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={vehicle.is_registered} onChange={(v) => set("is_registered", v)}
                  label="Registered" hint="Papers complete and current." />
          <Toggle checked={vehicle.duty_paid} onChange={(v) => set("duty_paid", v)}
                  label="Customs duty paid" hint="Buyers ask this first on imports." />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Price (₦)">
            <Input value={price} inputMode="numeric"
                   onChange={(v) => setPrice(v.replace(/\D/g, ""))} placeholder="8500000" />
            {price && <p className="mt-1 text-[12px] font-semibold text-brand-red">{naira(price)}</p>}
          </Field>
          <Field label="Condition">
            <Select value={condition} onChange={setCondition}
                    options={[
                      { value: "new", label: "Brand new" },
                      { value: "used", label: "Used" },
                      { value: "refurbished", label: "Refurbished" },
                    ]} />
          </Field>
        </div>

        <Toggle checked={negotiable} onChange={setNegotiable}
                label="Price is negotiable" hint="Buyers message more when there's room to talk." />

        <Field label="Description" hint="Service history, known faults, what's included. Honesty saves wasted viewings.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Full service history, one previous owner, new tyres fitted in March…"
            className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
        </Field>

        <Field label="Photos" hint="First photo becomes the cover. Exterior, interior, dashboard and engine bay sell a car.">
          {images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url} className="relative">
                  <UploadedThumb url={url} onRemove={() => setImages(images.filter((_, j) => j !== i))} />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-ink/75 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {images.length < MAX_PHOTOS && (
            <FileDrop
              purpose="oam_motors_image"
              rule={rules.data?.oam_motors_image}
              compact={images.length > 0}
              onUploaded={(r) => setImages((prev) => [...prev, r.url])}
            />
          )}
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Location"><Input value={location} onChange={setLocation} placeholder="Abuja" /></Field>
          <Field label="Phone">
            <Input value={formatPhone(phone)} inputMode="numeric"
                   onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 11))} placeholder="0803 123 4567" />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} inputMode="numeric"
                   onChange={(v) => setWhatsapp(v.replace(/\D/g, "").slice(0, 15))} placeholder="2348031234567" />
          </Field>
        </div>

        <Field label="VIN (private)" hint="Kept for your records. Never shown publicly — a VIN on a public page is enough to clone a vehicle's identity.">
          <Input value={vehicle.vin ?? ""} onChange={(v) => set("vin", v.toUpperCase())} placeholder="Optional" />
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={onCancel}
          className="h-12 flex-1 rounded-xl border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={create.isPending}
          className="inline-flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {create.isPending
            ? <Loader2 size={18} className="animate-spin" />
            : <><Check size={16} strokeWidth={2.5} /> List this vehicle</>}
        </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

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
  value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: "numeric" | "text";
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

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-xl border border-hairline bg-mist px-3.5 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#0B7327]"
      />
      <span className="text-[13.5px] text-ink">
        {label}
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}
