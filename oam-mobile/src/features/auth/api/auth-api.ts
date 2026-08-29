/**
 * Auth API — thin, typed wrappers over the OAM /auth/ endpoints.
 * Registration is dual (email OR phone); login/verify work off an identifier
 * that can be either. Everything returns exactly what the backend sends.
 */
import { api } from "@/shared/api";
import type { AuthResult, User } from "@/entities/user";

export type RegisterInput = {
  email?: string;
  phone?: string;
  password: string;
  first_name?: string;
  last_name?: string;
  preferred_language?: string;
  referral_code?: string;
};

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<AuthResult>("/auth/register/", input).then((r) => r.data),

  verifyOtp: (identifier: string, code: string) =>
    api
      .post<AuthResult & { detail: string }>("/auth/verify-otp/", { identifier, code })
      .then((r) => r.data),

  resendOtp: (identifier: string) =>
    api.post<{ detail: string }>("/auth/resend-otp/", { identifier }).then((r) => r.data),

  login: (identifier: string, password: string) =>
    api.post<AuthResult>("/auth/login/", { identifier, password }).then((r) => r.data),

  logout: (refresh: string) =>
    api.post<{ detail?: string }>("/auth/logout/", { refresh }).then((r) => r.data),

  me: () => api.get<User>("/auth/me/").then((r) => r.data),

  passwordResetRequest: (identifier: string) =>
    api
      .post<{ detail: string }>("/auth/password-reset/request/", { identifier })
      .then((r) => r.data),

  passwordResetConfirm: (identifier: string, code: string, new_password: string) =>
    api
      .post<{ detail: string }>("/auth/password-reset/confirm/", {
        identifier,
        code,
        new_password,
      })
      .then((r) => r.data),
};
