/** "24 Sep 2026, 1:52 AM" — the format used on OAM receipts. */
export function formatReceiptDate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${day} ${month} ${year}, ${h}:${m} ${ampm}`;
}
