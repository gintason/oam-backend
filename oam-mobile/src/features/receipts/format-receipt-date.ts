/** "24 Sep 2026, 1:52 AM" — OAM receipt date format. */
export function formatReceiptDate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const month = date.toLocaleString("en-GB", { month: "short" });
  let h = date.getHours(); const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM"; h = h % 12; if (h === 0) h = 12;
  return `${date.getDate()} ${month} ${date.getFullYear()}, ${h}:${m} ${ampm}`;
}
