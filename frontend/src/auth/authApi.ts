/**
 * Typed auth API — one function per backend endpoint under /api/v1/auth/.
 * Field names and response shapes match the OAM backend exactly.
 */
import { api } from "../lib/api";
import { tokenStore, type TokenPair } from "../lib/tokens";

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  preferred_language: string;
  auth_provider: string;
  is_verified: boolean;
};

type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

type RegisterResponse = AuthResponse & {
  verification: {
    required: boolean;
    channel: string;
    destination: string;
    message: string;
  };
};

export const authApi = {
  /** Update the signed-in user's profile (first/last name, phone). Email is read-only. */
  async updateProfile(input: { first_name?: string; last_name?: string; phone?: string }): Promise<User> {
    const { data } = await api.patch<User>("/auth/me/", input);
    return data;
  },

  /**
   * Step 1 of a password reset.
   *
   * The backend deliberately returns the SAME response whether or not the
   * account exists, so this endpoint can't be used to discover which emails and
   * phone numbers are registered. The UI has to preserve that — see
   * ForgotPassword.tsx.
   */
  async requestPasswordReset(identifier: string): Promise<{ detail: string }> {
    const { data } = await api.post("/auth/password-reset/request/", { identifier });
    return data;
  },

  /**
   * Step 2. On success the backend signs every other session out and returns a
   * fresh token pair, so we store it and the person lands straight in the app —
   * anyone who had their account has just been locked out, which is the whole
   * point of resetting.
   */
  async confirmPasswordReset(input: {
    identifier: string;
    code: string;
    new_password: string;
  }): Promise<{ detail: string; user: User; tokens?: TokenPair }> {
    const { data } = await api.post("/auth/password-reset/confirm/", input);
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  async register(input: {
    email?: string;
    phone?: string;
    password: string;
    first_name?: string;
    last_name?: string;
    preferred_language?: string;
    referral_code?: string;
  }): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>("/auth/register/", input);
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  async verifyOtp(input: { identifier: string; code: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/verify-otp/", input);
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  async resendOtp(input: { identifier: string }): Promise<{ detail: string }> {
    const { data } = await api.post("/auth/resend-otp/", input);
    return data;
  },

  async login(input: { identifier: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login/", input);
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  async social(
    provider: "google" | "facebook" | "apple",
    input: { token: string; first_name?: string; last_name?: string; email?: string }
  ): Promise<AuthResponse & { created: boolean }> {
    const { data } = await api.post(`/auth/social/${provider}/`, input);
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me/");
    return data;
  },

  async logout(): Promise<void> {
    const refresh = tokenStore.refresh;
    try {
      if (refresh) await api.post("/auth/logout/", { refresh });
    } finally {
      tokenStore.clear();
    }
  },
};
