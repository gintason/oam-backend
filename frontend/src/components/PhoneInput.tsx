import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY, findByDial, type Country } from "../lib/countryCodes";

/**
 * Phone entry with a searchable country-code dropdown.
 *
 * Emits the combined international number as a single string, e.g.
 * "+2348031234567" — or "" when no local digits are entered (so required-field
 * checks still work). Flags use flag-icons (SVG) so they render on Windows.
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder = "803 123 4567",
}: {
  value: string;
  onChange: (combined: string) => void;
  placeholder?: string;
}) {
  // Split any incoming value into country + local (best-effort). Falls back to
  // the default country with the raw digits as the local part.
  const initial = useMemo(() => splitValue(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(initial.country);
  const [local, setLocal] = useState<string>(initial.local);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function emit(c: Country, digits: string) {
    onChange(digits ? `${c.dial}${digits}` : "");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.dial.replace("+", "").includes(q.replace("+", "")) ||
        c.code.includes(q)
    );
  }, [search]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-hairline bg-paper focus-within:border-brand-green">
        {/* Country selector */}
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setSearch(""); }}
          className="flex shrink-0 items-center gap-1.5 border-r border-hairline px-2.5 text-[14px] text-ink transition hover:bg-mist"
        >
          <span className={`fi fi-${country.code} rounded-[2px]`} style={{ width: 20, height: 14 }} />
          <span className="tabular">{country.dial}</span>
          <ChevronDown size={14} strokeWidth={2} className="text-muted" />
        </button>

        {/* Local number */}
        <input
          inputMode="numeric"
          value={local}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
            setLocal(digits);
            emit(country, digits);
          }}
          placeholder={placeholder}
          className="h-full w-full min-w-0 bg-transparent px-3 text-[14px] text-ink outline-none placeholder:text-muted"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg">
          <div className="flex h-10 items-center gap-2 border-b border-hairline px-3">
            <Search size={14} strokeWidth={1.75} className="shrink-0 text-muted" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code"
              className="h-full w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-muted">No match.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={`${c.code}-${c.dial}`}
                  type="button"
                  onClick={() => {
                    setCountry(c);
                    setOpen(false);
                    setSearch("");
                    emit(c, local);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] transition hover:bg-mist ${
                    c.code === country.code && c.dial === country.dial ? "bg-brand-green/5" : ""
                  }`}
                >
                  <span className={`fi fi-${c.code} rounded-[2px]`} style={{ width: 20, height: 14 }} />
                  <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                  <span className="tabular shrink-0 text-muted">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function splitValue(value: string): { country: Country; local: string } {
  const v = (value || "").trim();
  if (v.startsWith("+")) {
    const c = findByDial(v);
    if (c) return { country: c, local: v.slice(c.dial.length).replace(/\D/g, "") };
  }
  // Bare digits (legacy local numbers) — keep as local under the default country.
  return { country: DEFAULT_COUNTRY, local: v.replace(/\D/g, "") };
}
