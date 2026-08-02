/**
 * Translate a marketplace category label.
 *
 * Categories are defined by the backend (seeded via `seed_categories`), so the
 * frontend only ever sees their English `name` at runtime. We can't enumerate
 * their slugs here with certainty, and the one field every render site shares
 * is the name (the listing detail chip only has `category_name`, no slug), so
 * we key the translation off a normalised form of the English name:
 *
 *     "Household Appliances"  ->  marketplace.categories.householdappliances
 *
 * The English name is passed as the i18n `defaultValue`, so any category we
 * don't have a translation for simply renders in English — never blank, never
 * a raw key. That keeps this safe as the backend adds categories: new ones show
 * in English until a translation is added, exactly as they do today.
 *
 * Brand categories (e.g. "O.A.M Motors") are intentionally left without a key,
 * so they fall through to the untranslated brand name in every language.
 */
export function categoryKey(name: string): string {
  return "marketplace.categories." + name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function categoryLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  name?: string | null,
): string {
  if (!name) return name ?? "";
  return t(categoryKey(name), { defaultValue: name });
}
