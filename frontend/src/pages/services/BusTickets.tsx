import { ArrowLeft, Bus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader";

/** Placeholder — the full search → seats → passengers → pay flow lands here next. */
export default function BusTickets() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
          <Bus size={30} strokeWidth={1.5} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Bus Tickets</h1>
        <p className="mt-2 text-[14px] text-muted">
          Intercity bus booking is coming soon — search trips, pick your seats and pay from your wallet, all in the app.
        </p>
      </main>
    </div>
  );
}
