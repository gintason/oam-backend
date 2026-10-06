/**
 * A tiny head manager. Every call sets the WHOLE set of SEO tags (falling back
 * to site defaults), updating the tags already in index.html — or the ones the
 * server rendered — in place, so there's never a duplicate title, description
 * or canonical. JSON-LD blocks are replaced wholesale.
 *
 * Why not react-helmet-async: it doesn't support React 19 (peer range stops at
 * 18), and React 19's built-in <title>/<meta> hoisting doesn't de-duplicate
 * against index.html. This does exactly what we need in ~60 lines.
 */
import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_TITLE, OG_IMAGE, TWITTER, absoluteUrl } from "./config";

export type HeadMeta = {
  title?: string;
  description?: string;
  keywords?: string;
  /** Path for the canonical URL. Defaults to the current path, without query string. */
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "product" | "profile";
  robots?: string;
  jsonLd?: object[];
};

function setMeta(attr: "name" | "property", key: string, content: string | null) {
  const found = Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`));
  found.slice(1).forEach((el) => el.remove());
  let el = found[0];
  if (content == null || content === "") { el?.remove(); return; }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  const found = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
  found.slice(1).forEach((el) => el.remove());
  let el = found[0];
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(blocks: object[]) {
  document.head.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach((el) => el.remove());
  for (const data of blocks) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.dataset.seo = "jsonld";
    s.text = JSON.stringify(data);
    document.head.appendChild(s);
  }
}

export function applyHead(m: HeadMeta) {
  if (typeof document === "undefined") return;
  const title = m.title || DEFAULT_TITLE;
  const description = m.description || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(m.path ?? window.location.pathname);
  const image = absoluteUrl(m.image || OG_IMAGE);

  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "keywords", m.keywords ?? DEFAULT_KEYWORDS);
  setMeta("name", "robots", m.robots || "index,follow");
  setCanonical(url);

  setMeta("property", "og:site_name", BRAND);
  setMeta("property", "og:type", m.type || "website");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:image", image);
  setMeta("property", "og:locale", "en_NG");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:site", TWITTER);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);

  setJsonLd(m.jsonLd ?? []);
}
