import { api } from "@/shared/api";

export type UploadTicket = {
  cloud_name: string; api_key: string; timestamp: number; signature: string;
  folder: string; resource_type: "image" | "video" | "raw"; type: "upload" | "authenticated";
  upload_url: string; max_bytes: number; allowed_formats: string[];
};

export type PickedMedia = { uri: string; fileName?: string | null; mimeType?: string | null };

export const uploadsApi = {
  ticket: (purpose: string) => api.post<UploadTicket>("/uploads/ticket/", { purpose }).then((r) => r.data),
};

/**
 * Upload a multipart FormData via XMLHttpRequest. React Native's XHR handles the
 * { uri, name, type } file part correctly; the newer global fetch throws
 * "Unsupported FormDataPart implementation" for it, which is the marketplace
 * upload error. Returns the parsed JSON response.
 */
function xhrUpload(url: string, form: FormData): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        const err = (data.error as { message?: string } | undefined)?.message;
        reject(new Error(err ?? "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please check your connection and try again."));
    xhr.send(form as unknown as Document);
  });
}

/** Signed direct-to-Cloudinary upload for any purpose. Returns the hosted URL. */
export async function uploadMedia(purpose: string, media: PickedMedia): Promise<string> {
  const ticket = await uploadsApi.ticket(purpose);
  const isVideo = ticket.resource_type === "video";
  const form = new FormData();
  form.append("file", {
    uri: media.uri,
    name: media.fileName ?? `${purpose}_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
    type: media.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"),
  } as unknown as Blob);
  form.append("api_key", ticket.api_key);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("folder", ticket.folder);
  if (ticket.type !== "upload") form.append("type", ticket.type);

  const data = (await xhrUpload(ticket.upload_url, form)) as { secure_url?: string; url?: string };
  if (!(data.secure_url || data.url)) throw new Error("Upload failed. Please try again.");
  return (data.secure_url || data.url) as string;
}

export const uploadListingImage = (img: PickedMedia) => uploadMedia("listing_image", img);
export const uploadListingVideo = (vid: PickedMedia) => uploadMedia("listing_video", vid);

/** Like uploadMedia, but returns Cloudinary's public_id too (needed by verification attach). */
export async function uploadMediaDetailed(purpose: string, media: PickedMedia): Promise<{ public_id: string; url: string }> {
  const ticket = await uploadsApi.ticket(purpose);
  const isVideo = ticket.resource_type === "video";
  const form = new FormData();
  form.append("file", {
    uri: media.uri,
    name: media.fileName ?? `${purpose}_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
    type: media.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"),
  } as unknown as Blob);
  form.append("api_key", ticket.api_key);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("folder", ticket.folder);
  if (ticket.type !== "upload") form.append("type", ticket.type);

  const data = (await xhrUpload(ticket.upload_url, form)) as { public_id?: string; secure_url?: string; url?: string };
  if (!data.public_id) throw new Error("Upload failed. Please try again.");
  return { public_id: data.public_id, url: (data.secure_url || data.url) as string };
}
