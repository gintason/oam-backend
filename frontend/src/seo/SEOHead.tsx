import { useLayoutEffect } from "react";
import { applyHead, type HeadMeta } from "./head";

/**
 * Sets the page's title, description, keywords, robots, canonical, Open Graph,
 * Twitter card and JSON-LD.
 *
 *   <SEOHead title="…" description="…" path="/marketplace/123" image={photo}
 *            jsonLd={[productSchema(listing)]} />
 */
export function SEOHead(props: HeadMeta) {
  const key = JSON.stringify(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every prop
  useLayoutEffect(() => applyHead(props), [key]);
  return null;
}
