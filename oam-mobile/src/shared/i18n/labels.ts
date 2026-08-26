/**
 * Localized labels for data-driven marketplace categories and artisan trades.
 *
 * Categories/trades come from the backend as { slug, name } (name is English).
 * We translate by slug via keys under `marketplace.categories.*` and
 * `artisans.trades.*`, always falling back to the API name when a key is
 * missing — so a new backend category never renders blank, it just shows
 * English until a translation is added.
 */
type T = (key: string, opts?: Record<string, unknown>) => string;

/** Mirror of Django's slugify for the fixed category/trade names. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Marketplace category label, when the slug is known. */
export function catLabel(t: T, slug: string, name: string): string {
  return t(`marketplace.categories.${slug}`, { defaultValue: name });
}

/** Marketplace category label, when only the display name is available. */
export function catLabelByName(t: T, name: string): string {
  return t(`marketplace.categories.${slugify(name)}`, { defaultValue: name });
}

/** Artisan trade label, when the slug is known. */
export function tradeLabel(t: T, slug: string, name: string): string {
  return t(`artisans.trades.${slug}`, { defaultValue: name });
}

/** Artisan trade label, when only the display name is available. */
export function tradeLabelByName(t: T, name: string): string {
  return t(`artisans.trades.${slugify(name)}`, { defaultValue: name });
}
