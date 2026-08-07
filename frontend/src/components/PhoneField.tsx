import { useMemo } from "react";

/**
 * Phone / WhatsApp input with a country dial-code selector.
 *
 * Stores one combined international string in the form field, e.g. "+2348031234567".
 * Nigeria (+234) is the default. Existing local-format numbers ("08031234567",
 * "2348031234567") are parsed on load so editing an old profile Just Works.
 */
const DIAL_CODES: { code: string; flag: string; name: string }[] = [
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+1", flag: "🇺🇸", name: "US / Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+86", flag: "🇨🇳", name: "China" },
];

const DEFAULT_DIAL = "+234";
// Longest codes first, so "+234" is matched before "+2".
const CODES_BY_LEN = [...DIAL_CODES].map((d) => d.code).sort((a, b) => b.length - a.length);

function parse(value: string): { dial: string; local: string } {
  const v = (value || "").trim();
  if (!v) return { dial: DEFAULT_DIAL, local: "" };
  if (v.startsWith("+")) {
    const dial = CODES_BY_LEN.find((c) => v.startsWith(c)) || DEFAULT_DIAL;
    return { dial, local: v.slice(dial.length).replace(/\D/g, "") };
  }
  // Legacy digit-only numbers.
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("234")) return { dial: "+234", local: digits.slice(3) };
  if (digits.startsWith("0")) digits = digits.slice(1); // trunk zero
  return { dial: DEFAULT_DIAL, local: digits };
}

export default function PhoneField({
  value,
  onChange,
  placeholder,
  maxLocal = 14,
}: {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  maxLocal?: number;
}) {
  const { dial, local } = useMemo(() => parse(value), [value]);

  const emit = (nextDial: string, nextLocal: string) => {
    const digits = nextLocal.replace(/\D/g, "").slice(0, maxLocal);
    onChange(digits ? `${nextDial}${digits}` : "");
  };

  return (
    <div className="flex gap-2">
      <select
        value={dial}
        onChange={(e) => emit(e.target.value, local)}
        aria-label="Country code"
        className="h-11 w-[104px] shrink-0 rounded-xl border border-hairline bg-paper px-2 text-[14px] text-ink outline-none focus:border-brand-green"
      >
        {DIAL_CODES.map((d) => (
          <option key={d.code} value={d.code}>
            {d.flag} {d.code} · {d.name}
          </option>
        ))}
      </select>
      <input
        value={local}
        inputMode="numeric"
        onChange={(e) => emit(dial, e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full min-w-0 rounded-xl border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
      />
    </div>
  );
}
