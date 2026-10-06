/**
 * Site-wide SEO settings. The backend (apps/seo/site.py) holds the same titles
 * for the sitemap and server-rendered previews — keep the two in step.
 */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://www.oam-app.com").replace(/\/$/, "");
export const BRAND = "O.A.M";
export const OG_IMAGE = "/og-image.png";      // 1200×630
export const LOGO = "/logo-512.png";
export const TWITTER = "@oamplatform";

export const DEFAULT_TITLE = "O.A.M — The Everything App | Pay Bills, Hire Artisans & Shop Online in Nigeria";
export const DEFAULT_DESCRIPTION =
  "Buy airtime and data, pay electricity and DStv bills, hire verified plumbers and electricians, book cheap flights and shop the local marketplace — one O.A.M wallet.";
export const DEFAULT_KEYWORDS = [
  "OAM app", "pay electricity bill Nigeria", "buy cheap data bundle", "buy airtime online",
  "DStv renewal online", "hire electrician Lagos", "hire plumber Abuja", "cheap flights Nigeria",
  "OAM marketplace", "buy and sell Nigeria",
].join(", ");

export type RouteMetaEntry = { title: string; description?: string; keywords?: string; robots?: string };

const NOINDEX = "noindex,follow";

/**
 * Pages WITHOUT their own <SEOHead>: company pages, auth pages and the signed-in
 * app. Public content pages (home, marketplace, artisans, service landings)
 * set their own tags. Matched by exact path, then by longest prefix.
 */
export const ROUTE_META: Record<string, RouteMetaEntry> = {
  "/about": { title: "About O.A.M — All Services. One App.", description: "O.A.M is the everything app from O.A.M Motors Limited: bills, marketplace, artisans, travel, jobs and deliveries in one wallet." },
  "/contact": { title: "Contact O.A.M Support", description: "Get help from the O.A.M team by email at info@oam-app.com — payments, tokens, the wallet, the marketplace and more." },
  "/help": { title: "Help Centre | O.A.M", description: "Answers to common questions about payments, electricity tokens, the O.A.M wallet, transfers, the marketplace and artisans." },
  "/terms": { title: "Terms of Service | O.A.M", description: "The terms that apply when you use O.A.M." },
  "/privacy": { title: "Privacy Policy | O.A.M", description: "How O.A.M collects, uses and protects your information." },
  "/refund-policy": { title: "Refund Policy | O.A.M", description: "When and how O.A.M refunds payments." },
  "/sign-in": { title: "Sign in | O.A.M", robots: NOINDEX },
  "/sign-up": { title: "Create your free account | O.A.M", description: "Join O.A.M free: pay bills, shop, hire artisans and book travel from one wallet.", robots: NOINDEX },
  "/verify": { title: "Verify your account | O.A.M", robots: NOINDEX },
  "/forgot-password": { title: "Reset your password | O.A.M", robots: NOINDEX },
  "/reset-password": { title: "Reset your password | O.A.M", robots: NOINDEX },
  "/dashboard": { title: "Dashboard | O.A.M", robots: NOINDEX },
  "/wallet": { title: "Wallet | O.A.M", robots: NOINDEX },
  "/orders": { title: "Order history | O.A.M", robots: NOINDEX },
  "/messages": { title: "Messages | O.A.M", robots: NOINDEX },
  "/receipt": { title: "Receipt | O.A.M", robots: NOINDEX },
};

export const FALLBACK_META: RouteMetaEntry = { title: BRAND, robots: NOINDEX };

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return SITE_URL + (pathOrUrl.startsWith("/") ? "" : "/") + pathOrUrl;
}

export function clip(text: string, n = 158) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : cut.length) + "…";
}

/** Whole-unit price for titles (matches the server-rendered preview: "₦650,000"). */
export function priceText(v: string | number, currency = "NGN") {
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
  return `${sym[(currency || "NGN").toUpperCase()] ?? currency + " "}${Math.round(Number(v || 0)).toLocaleString("en-US")}`;
}
