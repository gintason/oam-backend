import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2, ArrowLeft } from "lucide-react";
import { Receipt, type ReceiptData } from "./Receipt";

/** Full success screen: the shareable receipt + Share + Back-to-dashboard. */
export default function ReceiptSuccess({ data, onBack }: { data: ReceiptData; onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "oam-receipt.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "OAM Receipt", text: "Transaction receipt" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = "oam-receipt.png"; a.click();
      }
    } catch (e) {
      console.error("share receipt failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex justify-center">
        <Receipt ref={ref} data={data} />
      </div>
      <div className="mx-auto mt-5 flex max-w-[460px] flex-col gap-2.5">
        <button onClick={share} disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-brand-green text-[14.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60">
          <Share2 size={18} /> {busy ? "Preparing…" : "Share receipt"}
        </button>
        <button onClick={onBack}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-hairline bg-paper text-[13.5px] font-medium text-ink transition hover:bg-mist">
          <ArrowLeft size={16} /> Back to dashboard
        </button>
      </div>
    </div>
  );
}
