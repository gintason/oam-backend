/**
 * Schema.org JSON-LD builders (mirrors apps/seo/schema.py on the server).
 * Only facts we actually have: no invented ratings, addresses or prices.
 */
import { BRAND, LOGO, SITE_URL, absoluteUrl } from "./config";

const SOCIALS = [
  "https://x.com/oamplatform", "https://facebook.com/oamplatform",
  "https://instagram.com/oamplatform", "https://tiktok.com/@oamplatform",
];

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND,
    legalName: "O.A.M Motors Limited",
    url: `${SITE_URL}/`,
    logo: absoluteUrl(LOGO),
    sameAs: SOCIALS,
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "info@oam-app.com", availableLanguage: ["English"] }],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND,
    url: `${SITE_URL}/`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absoluteUrl(path) })),
  };
}

const CONDITION: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  used: "https://schema.org/UsedCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
};

export type ProductInput = {
  id: string; title: string; description?: string; price: string | number; currency?: string;
  condition?: string; location?: string; category_name?: string; seller_name?: string;
  images?: { url: string }[]; expires_at?: string | null;
};

export function productSchema(l: ProductInput, path: string) {
  const url = absoluteUrl(path);
  const images = (l.images ?? []).map((i) => i.url).filter(Boolean);
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url,
    price: String(l.price),
    priceCurrency: l.currency || "NGN",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Person", name: l.seller_name || "O.A.M seller" },
  };
  if (l.condition && CONDITION[l.condition]) offer.itemCondition = CONDITION[l.condition];
  if (l.location) offer.areaServed = l.location;
  if (l.expires_at) offer.priceValidUntil = l.expires_at.slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: (l.description || l.title).slice(0, 5000),
    url,
    sku: l.id,
    category: l.category_name || "",
    ...(images.length ? { image: images } : {}),
    offers: offer,
  };
}

export type ArtisanInput = {
  id: string; business_name: string; description?: string | null; category_name?: string | null;
  city?: string | null; state?: string | null; profile_photo?: string | null; is_verified?: boolean;
};

export function artisanSchema(a: ArtisanInput, path: string) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: a.business_name,
    url: absoluteUrl(path),
    description: (a.description || `${a.category_name || "Artisan"} services on O.A.M`).slice(0, 5000),
    knowsAbout: a.category_name || "",
  };
  if (a.profile_photo) data.image = a.profile_photo;
  if (a.city || a.state) {
    data.address = { "@type": "PostalAddress", addressLocality: a.city || "", addressRegion: a.state || "" };
    data.areaServed = { "@type": "City", name: a.city || a.state };
  }
  return data;
}

export function serviceSchema(name: string, description: string, path: string, serviceType: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name, description, serviceType,
    url: absoluteUrl(path),
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Nigeria" },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function itemListSchema(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
  };
}
