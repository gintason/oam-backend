import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyHead } from "./head";
import { FALLBACK_META, ROUTE_META, type RouteMetaEntry } from "./config";

function lookup(pathname: string): RouteMetaEntry {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (ROUTE_META[path]) return ROUTE_META[path];
  const prefix = Object.keys(ROUTE_META).filter((p) => p !== "/" && path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? ROUTE_META[prefix] : FALLBACK_META;
}

/**
 * Baseline tags for every route. Render it BEFORE <Routes>: React runs this
 * layout effect first, and any page's own <SEOHead> (inside <Routes>) runs
 * after it and wins. Pages without one (company pages, sign-in, the signed-in
 * app) get the entry from ROUTE_META, or a noindex fallback.
 */
export function RouteMeta() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const m = lookup(pathname);
    applyHead({ title: m.title, description: m.description, keywords: m.keywords, robots: m.robots });
  }, [pathname]);
  return null;
}
