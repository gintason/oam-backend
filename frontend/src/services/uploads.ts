import { api } from "../lib/api";

/**
 * Direct-to-Cloudinary uploads.
 *
 * The file goes straight from the browser to Cloudinary using a signed ticket
 * from our backend — it never passes through Django. A 100MB work video routed
 * through the server would occupy one request for the whole upload, and Render
 * terminates long requests, so proxying would fail on exactly the files that
 * matter most.
 *
 * The ticket's signature covers the destination folder, so a ticket issued for
 * work photos can't be redirected into the identity folder.
 */

export type UploadPurpose =
  | "artisan_service_image"
  | "artisan_work_video"
  | "artisan_id_document"
  | "artisan_profile_photo"
  | "listing_image"
  | "listing_video"
  | "oam_motors_image";

export type UploadTicket = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  resource_type: "image" | "video" | "raw";
  type: "upload" | "authenticated";
  upload_url: string;
  max_bytes: number;
  allowed_formats: string[];
};

export type UploadRule = {
  label: string;
  hint: string;
  resource_type: "image" | "video" | "raw";
  max_bytes: number;
  allowed_formats: string[];
  min_width: number;
  min_height: number;
  min_duration: number;
  max_duration: number;
  admin_only: boolean;
};

export type UploadResult = {
  public_id: string;
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
};

export const uploadsApi = {
  async rules(): Promise<Record<UploadPurpose, UploadRule>> {
    const { data } = await api.get("/uploads/rules/");
    return data;
  },

  async ticket(purpose: UploadPurpose): Promise<UploadTicket> {
    const { data } = await api.post("/uploads/ticket/", { purpose });
    return data;
  },
};

/** Human-readable size, for error messages people can act on. */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${Math.round(n / (1024 * 1024))}MB`;
  return `${Math.round(n / 1024)}KB`;
}

/**
 * Check a file BEFORE uploading it.
 *
 * The server re-checks everything afterwards — that's the authority. This is
 * purely a kindness: telling someone their 200MB video is too large after
 * they've spent four minutes uploading it on a mobile connection is a genuinely
 * bad experience, and entirely avoidable.
 */
export function precheck(file: File, rule: UploadRule): string | null {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (rule.allowed_formats.length && !rule.allowed_formats.includes(ext)) {
    return `That file type isn't supported. Use ${rule.allowed_formats.slice(0, 4).join(", ")}.`;
  }
  if (file.size > rule.max_bytes) {
    return `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(rule.max_bytes)}.`;
  }
  if (file.size < 8 * 1024) {
    return "That file looks empty or corrupted.";
  }
  return null;
}

/**
 * Upload one file, reporting progress.
 *
 * XMLHttpRequest rather than fetch, because fetch still can't report upload
 * progress. On a slow connection a video upload with no progress bar looks
 * indistinguishable from a frozen app, and people close the tab.
 */
export function uploadToCloudinary(
  file: File,
  ticket: UploadTicket,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", ticket.api_key);
    form.append("timestamp", String(ticket.timestamp));
    form.append("signature", ticket.signature);
    form.append("folder", ticket.folder);
    if (ticket.type !== "upload") form.append("type", ticket.type);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.upload_url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
          resolve({
            public_id: data.public_id,
            url: data.secure_url,
            format: data.format,
            bytes: data.bytes,
            width: data.width,
            height: data.height,
            duration: data.duration,
          });
        } else {
          reject(new Error(data?.error?.message || "That upload didn't complete."));
        }
      } catch {
        reject(new Error("That upload didn't complete."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(form);
  });
}

/** Get a ticket and upload, in one call. */
export async function upload(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const ticket = await uploadsApi.ticket(purpose);
  return uploadToCloudinary(file, ticket, onProgress);
}
