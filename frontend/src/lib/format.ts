/** Shared display helpers for money, phones, names and transactions. */

export const NAIRA = "₦";

export function money(v: string | number, currency = "NGN") {
  const symbol = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" }[currency.toUpperCase()] ?? "";
  return `${symbol}${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

/** Whole naira, no decimals — for amount buttons and confirmations. */
export function naira(v: string | number) {
  return `₦${Number(v || 0).toLocaleString()}`;
}

/**
 * Provider names arrive from the biller in BLOCK CAPS. Title case is easier to
 * scan, so we soften it for display only — the underlying value is untouched.
 */
export function titleCase(s: string) {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Nigerian mobile numbers                                             */
/* ------------------------------------------------------------------ */

/** Display a local number as 0803 123 4567 while keeping digits only in state. */
export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

/**
 * Network prefixes as allocated by the NCC. Numbers get ported between
 * networks, so this is a HELPFUL GUESS to preselect the operator — never a
 * silent override. The customer can always change it.
 */
const PREFIXES: Record<string, string[]> = {
  mtn: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916", "0704"],
  airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912", "0911"],
  glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
};

/** Returns 'mtn' | 'airtel' | 'glo' | '9mobile' | undefined. */
export function detectNetwork(digits: string): string | undefined {
  const d = digits.replace(/\D/g, "");
  if (d.length < 4) return undefined;
  const p = d.slice(0, 4);
  for (const [network, list] of Object.entries(PREFIXES)) {
    if (list.includes(p)) return network;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export type TxnKind = "airtime" | "data" | "electricity" | "cable" | "funding" | "withdrawal" | "transfer" | "other";

/**
 * Ledger descriptions are written for accounting ("Bill hold BILL-48a0…"),
 * not for people. This turns them into something a customer understands,
 * keeping the reference available separately.
 */
export function describeTransaction(description: string): { label: string; kind: TxnKind; reference?: string } {
  const d = (description || "").trim();
  const refMatch = d.match(/\b((?:BILL|FUND|WD|TRF)-[A-Za-z0-9]+)\b/);
  const reference = refMatch?.[1];
  const lower = d.toLowerCase();

  const kind: TxnKind =
    lower.includes("airtime") ? "airtime"
    : lower.includes("data") ? "data"
    : lower.includes("electric") || lower.includes("meter") ? "electricity"
    : lower.includes("cable") || lower.includes("tv") ? "cable"
    : lower.includes("funding") || lower.includes("fund") ? "funding"
    : lower.includes("withdraw") ? "withdrawal"
    : lower.includes("transfer") || lower.includes("sweep") ? "transfer"
    : lower.includes("bill") ? "other"
    : "other";

  let label = d;
  if (lower.includes("wallet funding")) label = "Wallet funding";
  else if (lower.includes("withdrawal refund")) label = "Withdrawal refunded";
  else if (lower.includes("withdrawal hold")) label = "Withdrawal";
  else if (lower.includes("revenue sweep")) label = "Earnings moved to wallet";
  else if (lower.includes("bill hold") || lower.includes("bill capture")) {
    label = {
      airtime: "Airtime purchase",
      data: "Data purchase",
      electricity: "Electricity payment",
      cable: "TV subscription",
      other: "Bill payment",
    }[kind] ?? "Bill payment";
  } else if (lower.includes("transfer to")) label = d.replace(/^Transfer to /i, "Sent to ");
  else if (lower.includes("transfer from")) label = d.replace(/^Transfer from /i, "Received from ");
  else if (reference) label = d.replace(reference, "").trim() || "Transaction";

  return { label, kind, reference };
}

/** "Today · 10:42", "Yesterday · 18:05", "20 Jul · 15:18". */
export function friendlyTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, now)) return `Today · ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday · ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString(undefined, {
    day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${date} · ${time}`;
}
