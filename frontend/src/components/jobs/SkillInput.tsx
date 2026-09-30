import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

/** Tag-style input: type a skill, Enter or comma adds it, Backspace removes the last. */
export default function SkillInput({
  value, onChange, placeholder = "Add a skill and press Enter", max = 30, id,
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; id?: string }) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (!lower.has(p.toLowerCase()) && next.length < max) {
        next.push(p);
        lower.add(p.toLowerCase());
      }
    }
    onChange(next);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-hairline bg-paper px-2 py-1.5 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/15">
      {value.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-1 text-[12.5px] font-medium text-ink">
          {s}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== s))}
            className="text-muted hover:text-ink"
            aria-label={`Remove ${s}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent px-1 text-[14px] outline-none placeholder:text-muted/70"
      />
    </div>
  );
}
