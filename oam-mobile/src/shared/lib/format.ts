/** Whole naira, no decimals. */
export function naira(v: string | number): string {
  return `₦${Number(v || 0).toLocaleString()}`;
}

/** Money with currency (NGN uses the ₦ symbol). */
export function money(v: string | number, currency = "NGN"): string {
  return currency === "NGN" ? naira(v) : `${currency} ${Number(v || 0).toLocaleString()}`;
}

/** BLOCK CAPS biller names → Title Case for display only. */
export function titleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Display a local number as 0803 123 4567 while state stays digits-only. */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

// NCC prefixes — a helpful guess to preselect the network, never an override.
const PREFIXES: Record<string, string[]> = {
  mtn: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916", "0704"],
  airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912", "0911"],
  glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
};

/** 'mtn' | 'airtel' | 'glo' | '9mobile' | undefined */
export function detectNetwork(digits: string): string | undefined {
  const d = digits.replace(/\D/g, "");
  if (d.length < 4) return undefined;
  const p = d.slice(0, 4);
  for (const [network, list] of Object.entries(PREFIXES)) {
    if (list.includes(p)) return network;
  }
  return undefined;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Aug" — Hermes-safe. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
