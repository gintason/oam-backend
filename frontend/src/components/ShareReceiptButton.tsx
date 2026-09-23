import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2 } from "lucide-react";
import { Receipt, type ReceiptData } from "./Receipt";

/** Renders the receipt off-screen; on click, captures it and shares (or downloads). */
export default function ShareReceiptButton({ data, label = "Share receipt" }: { data: ReceiptData; label?: string }) {
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
    <>
      {/* off-screen render target */}
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        <Receipt ref={ref} data={data} />
      </div>
      <button onClick={share} disabled={busy}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-brand-green bg-brand-green/5 text-[14px] font-semibold text-brand-green transition hover:bg-brand-green/10 disabled:opacity-60">
        <Share2 size={17} /> {busy ? "Preparing…" : label}
      </button>
    </>
  );
}
