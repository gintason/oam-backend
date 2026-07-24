import { useRef, useState } from "react";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import {
  formatBytes, precheck, upload,
  type UploadPurpose, type UploadResult, type UploadRule,
} from "../services/uploads";

/**
 * One upload control: pick or drop a file, watch it upload, see it fail clearly.
 *
 * Progress is shown because on a Nigerian mobile connection a 40MB video can
 * take a minute or more, and an upload with no visible progress is
 * indistinguishable from a frozen app. People close the tab, then try again,
 * then assume the service is broken.
 */
export default function FileDrop({
  purpose,
  rule,
  onUploaded,
  disabled,
  compact,
}: {
  purpose: UploadPurpose;
  rule?: UploadRule;
  onUploaded: (result: UploadResult) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  const busy = progress !== null;
  const accept = rule
    ? rule.allowed_formats.map((f) => `.${f}`).join(",")
    : undefined;

  async function handle(file: File) {
    setError(undefined);

    if (rule) {
      const problem = precheck(file, rule);
      if (problem) return setError(problem);
    }

    setProgress(0);
    try {
      const result = await upload(file, purpose, setProgress);
      await onUploaded(result);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "That upload didn't complete.");
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled || busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handle(file);
        }}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        role="button"
        tabIndex={disabled || busy ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
          compact ? "p-4" : "p-6"
        } ${
          disabled || busy
            ? "cursor-not-allowed border-hairline bg-mist"
            : dragging
            ? "border-brand-green bg-brand-green/5"
            : "border-hairline bg-paper hover:border-brand-green/50 hover:bg-mist"
        }`}
      >
        {busy ? (
          <>
            <Loader2 size={20} className="animate-spin text-brand-green" />
            <p className="mt-2 text-[13px] font-medium text-ink">Uploading… {progress}%</p>
            <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-brand-green transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Keep this page open.</p>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <Upload size={17} strokeWidth={1.75} />
            </span>
            <p className="mt-2 text-[13px] font-medium text-ink">
              {rule?.label ?? "Choose a file"}
            </p>
            {rule?.hint && !compact && (
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{rule.hint}</p>
            )}
            {rule && (
              <p className="mt-1 text-[11px] text-muted">
                {rule.allowed_formats.slice(0, 3).join(", ").toUpperCase()} · up to{" "}
                {formatBytes(rule.max_bytes)}
                {rule.max_duration > 0 && ` · ${Math.round(rule.max_duration / 60)} min max`}
              </p>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handle(file);
            e.target.value = "";   // so the same file can be retried
          }}
        />
      </div>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-danger">
          <AlertCircle size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Thumbnail with a remove button, for already-uploaded images. */
export function UploadedThumb({
  url,
  onRemove,
  label,
}: {
  url: string;
  onRemove?: () => void;
  label?: string;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-hairline bg-mist">
      <img src={url} alt={label ?? ""} className="h-full w-full object-cover" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white transition hover:bg-ink"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
