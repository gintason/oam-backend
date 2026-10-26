import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AIRPORTS, REGIONS, airportByCode, airportName, searchAirports, type Airport } from "../services/affiliates";

const LIMIT = 120;

/**
 * Searchable airport picker. Type a city, airport name, country or code to
 * search every airport with scheduled flights worldwide, so domestic flights
 * in any country can be booked. With nothing typed it shows our curated list,
 * Nigerian domestic airports first. Any 3-letter IATA code that isn't in our
 * list can still be used — our flights partner understands all of them.
 */
export default function AirportPicker({ value, onChange, label }: {
  value: string; onChange: (code: string) => void; label?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    setTimeout(() => input.current?.focus(), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = airportByCode(value);
  const display = selected ? `${airportName(selected.code, selected.city)} (${selected.code}) — ${selected.country}` : value;

  const s = q.trim().toLowerCase();
  const matches = useMemo(() => (s ? searchAirports(s, LIMIT) : AIRPORTS), [s]);
  const custom = /^[a-z]{3}$/i.test(q.trim()) && !airportByCode(q.trim().toUpperCase())
    ? q.trim().toUpperCase() : null;

  function pick(code: string) { onChange(code); setOpen(false); setQ(""); }

  const Row = ({ a }: { a: Airport }) => (
    <button
      type="button"
      role="option"
      aria-selected={a.code === value}
      onClick={() => pick(a.code)}
      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13.5px] hover:bg-mist ${a.code === value ? "text-brand-green" : "text-ink"}`}
    >
      <span>
        {airportName(a.code, a.city)} <span className="text-muted">({a.code})</span>
        <span className="block text-[12px] text-muted">{a.city}, {a.country}</span>
      </span>
      {a.code === value && <Check size={15} className="shrink-0" />}
    </button>
  );

  return (
    <div ref={box} className="relative w-full min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-hairline bg-paper px-3 text-left text-[14px] text-ink outline-none focus:border-brand-green"
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-hairline bg-paper shadow-[0_12px_32px_rgba(10,10,10,0.14)]">
          <div className="flex items-center gap-2 border-b border-hairline px-3">
            <Search size={15} className="text-muted" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") { e.preventDefault(); if (matches[0]) pick(matches[0].code); else if (custom) pick(custom); }
              }}
              placeholder={t("travel.flights.searchAirport", "City, airport or code (e.g. Owerri, QOW)")}
              className="h-11 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            />
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
            {custom && (
              <li>
                <button type="button" onClick={() => pick(custom)} className="w-full px-3 py-2.5 text-left text-[13.5px] font-medium text-brand-green hover:bg-mist">
                  {t("travel.flights.useCode", "Use airport code {{code}}", { code: custom })}
                </button>
              </li>
            )}
            {s ? matches.map((a) => <Row key={a.code} a={a} />) : REGIONS.map((r) => {
              const rows = matches.filter((a) => a.region === r);
              if (!rows.length) return null;
              return (
                <li key={r}>
                  <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {r === "Nigeria" ? t("travel.flights.domestic", "Nigeria (domestic)") : r}
                  </p>
                  {rows.map((a) => <Row key={a.code} a={a} />)}
                </li>
              );
            })}
            {s && matches.length === LIMIT && (
              <li className="px-3 py-2.5 text-[12px] text-muted">
                {t("travel.flights.keepTyping", "Showing the top {{count}} matches — keep typing to narrow down.", { count: LIMIT })}
              </li>
            )}
            {!s && (
              <li className="px-3 py-2.5 text-[12px] text-muted">
                {t("travel.flights.searchHint", "Can't see your airport? Type a city, airport or country — local airports in every country are included.")}
              </li>
            )}
            {!matches.length && !custom && (
              <li className="px-3 py-3 text-[13px] text-muted">
                {t("travel.flights.noAirport", "No airport matches. Try a city name, or type the 3-letter airport code.")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
