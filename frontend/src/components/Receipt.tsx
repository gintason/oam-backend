import { forwardRef } from "react";
import logo from "../assets/logo.png";

export type ReceiptData = {
  amount: string;            // e.g. "2,000.00"
  currency?: string;         // default ₦
  statusLabel?: string;      // "Successful Transaction"
  date: string;              // formatted date/time
  recipientName: string;
  recipientSub: string;      // "OAM Wallet · email"  OR  "Access Bank · 1789209934"
  senderName: string;
  senderSub?: string;        // "OAM Wallet"
  type: string;              // "Wallet Transfer" / "Bank Transfer" / "Withdrawal"
  note?: string;
  feeLine?: string;          // e.g. "₦25"
  reference: string;
  transactionId?: string;
};

const S = "1.5px dashed #d7dde5";

/** The shareable OAM receipt. Rendered off-screen and captured to an image. */
export const Receipt = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const cur = data.currency ?? "₦";
  return (
    <div ref={ref} style={{ width: 460, background: "#fff", borderRadius: 22, overflow: "hidden",
      fontFamily: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", position: "relative", padding: "34px 30px 30px" }}>
      {/* watermark */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.05,
        backgroundImage: `url(${logo})`, backgroundRepeat: "repeat", backgroundSize: "150px auto",
        transform: "rotate(-18deg) scale(1.6)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <img src={logo} alt="OAM" style={{ height: 32, display: "block", marginBottom: 20 }} />
        <div style={{ textAlign: "center", fontSize: 38, fontWeight: 800, color: "#0B7327", letterSpacing: -1 }}>{cur} {data.amount}</div>
        <div style={{ textAlign: "center", fontSize: 17, color: "#1a1a1a", marginTop: 6, fontWeight: 600 }}>{data.statusLabel ?? "Successful Transaction"}</div>
        <div style={{ textAlign: "center", fontSize: 13, color: "#98a1ad", marginTop: 6 }}>{data.date}</div>

        <hr style={{ border: "none", borderTop: S, margin: "20px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 500 }}>Recipient</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#111" }}>{data.recipientName}</div>
            <div style={{ fontSize: 13, color: "#9aa2ad", marginTop: 4 }}>{data.recipientSub}</div>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: S, margin: "20px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 500 }}>Sender</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#111" }}>{data.senderName}</div>
            {data.senderSub && <div style={{ fontSize: 13, color: "#9aa2ad", marginTop: 4 }}>{data.senderSub}</div>}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: S, margin: "20px 0" }} />
        <div style={{ fontSize: 16, color: "#111", fontWeight: 600, marginBottom: 14 }}>Transaction Info</div>
        {[
          ["Transaction Type", data.type],
          ...(data.note ? [["Note", data.note]] : []),
          ...(data.feeLine ? [["Fee", data.feeLine]] : []),
          ...(data.transactionId ? [["Transaction ID", data.transactionId]] : []),
          ["Reference", data.reference],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 13 }}>
            <div style={{ fontSize: 13.5, color: "#9aa2ad" }}>{k}</div>
            <div style={{ fontSize: 13.5, color: "#1a1a1a", textAlign: "right", fontWeight: 500, maxWidth: 250, wordBreak: "break-word" }}>{v}</div>
          </div>
        ))}
        <hr style={{ border: "none", borderTop: S, margin: "20px 0" }} />
        <div style={{ fontSize: 13, color: "#98a1ad", lineHeight: "20px" }}>
          All services. One app. Endless possibilities.<br />Sent securely with <b style={{ color: "#0B7327" }}>O.A.M</b>.
          <br />info@oam-app.com &middot; oam-app.com
        </div>
      </div>
    </div>
  );
});
Receipt.displayName = "Receipt";
