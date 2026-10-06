import { Link } from "react-router-dom";
import { SEOHead } from "../../seo";
import { PublicLayout } from "./PublicLayout";

/** Real "not found" page (noindex) instead of serving the home page for every unknown URL. */
export default function NotFound() {
  return (
    <PublicLayout>
      <SEOHead title="Page not found | O.A.M" description="This page doesn't exist." robots="noindex,follow" />
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-4xl font-medium text-ink">Page not found</h1>
        <p className="mt-3 text-muted">The link may be old or mistyped.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="h-11 rounded-lg bg-brand-red px-5 text-sm font-medium leading-[44px] text-white">Go to the home page</Link>
          <Link to="/marketplace" className="h-11 rounded-lg border border-hairline px-5 text-sm font-medium leading-[44px] text-ink">Browse the marketplace</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
