import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { Receipt, type ReceiptData } from "../components/Receipt";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8080/api/v1";

type ApiReceipt = {
  type: string; status?: string; amount: string; currency?: string; date: string;
  recipient_name: string; recipient_sub: string; sender_name: string; sender_sub?: string;
  note?: string; reference: string;
};

/** Public page that renders a shared receipt from its reference. No login needed. */
export default function PublicReceipt() {
  const { reference } = useParams();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery<ApiReceipt>({
    queryKey: ["public-receipt", reference],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/receipts/${reference}/`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    retry: false,
  });

  async function download() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = "oam-receipt.png"; a.click();
    } finally { setBusy(false); }
  }

  const data: ReceiptData | null = q.data ? {
    amount: q.data.amount, currency: q.data.currency,
    statusLabel: q.data.status, date: new Date(q.data.date).toLocaleString(),
    recipientName: q.data.recipient_name, recipientSub: q.data.recipient_sub,
    senderName: q.data.sender_name, senderSub: q.data.sender_sub,
    type: q.data.type, note: q.data.note || undefined, reference: q.data.reference,
  } : null;

  return (
    <div className="min-h-screen bg-mist flex flex-col items-center justify-center px-4 py-10">
      {q.isLoading ? (
        <Loader2 className="animate-spin text-brand-green" size={30} />
      ) : q.isError || !data ? (
        <div className="text-center">
          <p className="text-[15px] font-semibold text-ink">Receipt not found</p>
          <p className="mt-1 text-[13px] text-muted">This receipt link is invalid or has expired.</p>
        </div>
      ) : (
        <div className="w-full max-w-[460px]">
          <div className="flex justify-center"><Receipt ref={ref} data={data} /></div>
          <button onClick={download} disabled={busy}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-brand-green text-[14.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60">
            <Download size={18} /> {busy ? "Preparing…" : "Download receipt"}
          </button>
          <p className="mt-4 text-center text-[12px] text-muted">Sent securely with O.A.M · oam-app.com</p>
        </div>
      )}
    </div>
  );
}
