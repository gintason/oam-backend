import { BadgeCheck } from "lucide-react";

/**
 * "Verified" trust badge shown on listings an admin has reviewed. Listings go
 * live immediately; this badge appears only after verification and is removed
 * automatically if the owner edits the listing.
 */
export default function VerifiedBadge({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <span
      title="Verified by OAM"
      className={`inline-flex items-center gap-1 rounded-md bg-brand-green/10 font-bold uppercase tracking-wide text-brand-green ${
        sm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[10.5px]"
      } ${className}`}
    >
      <BadgeCheck size={sm ? 10 : 12} strokeWidth={2.5} /> Verified
    </span>
  );
}
