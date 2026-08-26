import { api } from "@/shared/api";
import type { Verification, ServiceImage } from "@/entities/homeservices";

export type AttachInput = {
  purpose: "artisan_service_image" | "artisan_work_video" | "artisan_id_document";
  public_id: string;
  url?: string;
  caption?: string;
};

export const verificationApi = {
  get: () => api.get<Verification>("/homeservices/artisans/verification/").then((r) => r.data),

  attach: (input: AttachInput) =>
    api.post<{ document: ServiceImage | null; verification: Verification }>("/homeservices/artisans/verification/attach/", input).then((r) => r.data),

  removeImage: (id: string) =>
    api.delete(`/homeservices/artisans/verification/images/${id}/`).then(() => undefined),

  submit: () =>
    api.post<{ detail: string; verification: Verification }>("/homeservices/artisans/verification/submit/", {}).then((r) => r.data),
};
