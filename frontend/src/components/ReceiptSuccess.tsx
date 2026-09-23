import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, ArrowLeft, Mail } from "lucide-react";
import { Receipt, type ReceiptData } from "./Receipt";

/** Full success screen: shareable receipt + Download / WhatsApp / Email / native share + Back. */
export default function ReceiptSuccess({ data, onBack }: { data: ReceiptData; onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canNativeShareFiles = (() => {
    try {
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      // Rough: file-sharing to apps is really only useful on mobile.
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      return Boolean(nav.canShare) && isMobile;
    } catch { return false; }
  })();

  async function toImage(): Promise<{ dataUrl: string; file: File }> {
    const dataUrl = await toPng(ref.current as HTMLDivElement, { pixelRatio: 2, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "oam-receipt.png", { type: "image/png" });
    return { dataUrl, file };
  }

  function download(dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl; a.download = "oam-receipt.png"; a.click();
  }

  const shareText =
    `OAM receipt — ${data.currency ?? "₦"} ${data.amount} to ${data.recipientName}` +
    (data.reference ? ` (Ref: ${data.reference})` : "");

  async function onNativeShare() {
    setBusy("share");
    try {
      const { file } = await toImage();
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "OAM Receipt", text: shareText });
      }
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }

  async function onDownload() {
    setBusy("download");
    try { const { dataUrl } = await toImage(); download(dataUrl); }
    catch (e) { console.error(e); } finally { setBusy(null); }
  }

  // WhatsApp/email can't attach an image via URL, so: download the image, then open
  // the app prefilled with the message for the user to attach the saved receipt.
  async function onWhatsApp() {
    setBusy("wa");
    try {
      const { dataUrl } = await toImage();
      download(dataUrl);
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n(Receipt image downloaded — attach it here.)")}`, "_blank");
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }

  async function onEmail() {
    setBusy("email");
    try {
      const { dataUrl } = await toImage();
      download(dataUrl);
      const subject = encodeURIComponent("OAM Transaction Receipt");
      const body = encodeURIComponent(shareText + "\n\n(The receipt image was downloaded to your device — please attach it to this email.)");
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (e) { console.error(e); } finally { setBusy(null); }
  }

  const btn = "flex h-11 items-center justify-center gap-2 rounded-[11px] text-[13.5px] font-semibold transition disabled:opacity-60";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex justify-center">
        <Receipt ref={ref} data={data} />
      </div>

      <div className="mx-auto mt-5 max-w-[460px]">
        {canNativeShareFiles ? (
          <button onClick={onNativeShare} disabled={busy !== null}
            className={`${btn} w-full bg-brand-green text-white hover:brightness-95 mb-2.5`}>
            <Share2 size={17} /> {busy === "share" ? "Preparing…" : "Share receipt"}
          </button>
        ) : null}

        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={onDownload} disabled={busy !== null}
            className={`${btn} border border-hairline bg-paper text-ink hover:bg-mist`}>
            <Download size={16} /> {busy === "download" ? "…" : "Download"}
          </button>
          <button onClick={onWhatsApp} disabled={busy !== null}
            className={`${btn} text-white`} style={{ backgroundColor: "#25D366" }}>
            {/* WhatsApp glyph */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3zM12 2.2C6.6 2.2 2.2 6.6 2.2 12c0 1.7.4 3.3 1.3 4.8L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.4 0 9.8-4.4 9.8-9.8S17.4 2.2 12 2.2z"/></svg>
            {busy === "wa" ? "…" : "WhatsApp"}
          </button>
          <button onClick={onEmail} disabled={busy !== null}
            className={`${btn} border border-hairline bg-paper text-ink hover:bg-mist`}>
            <Mail size={16} /> {busy === "email" ? "…" : "Email"}
          </button>
        </div>

        <button onClick={onBack}
          className={`${btn} mt-2.5 w-full border border-hairline bg-paper text-ink hover:bg-mist`}>
          <ArrowLeft size={16} /> Back to dashboard
        </button>
      </div>
    </div>
  );
}
