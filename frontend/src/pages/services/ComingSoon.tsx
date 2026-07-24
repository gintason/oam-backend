import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import AppHeader from "../../components/AppHeader";

/**
 * Placeholder for service flows not yet built (data, cable, travel, etc.).
 * Keeps routes from dead-ending on the landing page while we build them out.
 */
export default function ComingSoon({ title = "This service" }: { title?: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <Clock size={26} strokeWidth={1.5} />
          </span>
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">{title} is coming soon</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            We're putting the finishing touches on this. It'll be live shortly.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white transition hover:brightness-95"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
