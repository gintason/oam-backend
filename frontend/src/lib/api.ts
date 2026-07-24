/**
 * Axios API client for the OAM backend.
 *
 *  - Base URL from VITE_API_URL (defaults to the local dev backend on :8080).
 *  - Request interceptor attaches the access token as a Bearer header.
 *  - Response interceptor catches 401s and transparently refreshes the access
 *    token using the refresh token (POST /auth/token/refresh/), then retries the
 *    original request once. Concurrent 401s share a single refresh.
 *  - If refresh fails, tokens are cleared and an "oam:logout" event fires so the
 *    auth context can react (redirect to sign-in).
 *
 * Matches the backend exactly:
 *   base: /api/v1
 *   refresh: POST /auth/token/refresh/  body {refresh} -> {access}
 */
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStore } from "./tokens";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://127.0.0.1:8080/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/** A bare client (no interceptors) for the refresh call itself, to avoid loops. */
const bare = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ---- attach access token ---------------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- refresh on 401 --------------------------------------------------------
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await bare.post<{ access: string }>("/auth/token/refresh/", {
      refresh,
    });
    tokenStore.setAccess(data.access);
    return data.access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    // Only try refresh on a 401 for a request we haven't already retried,
    // and never for the refresh/login endpoints themselves.
    const url = original?.url ?? "";
    const isAuthCall =
      url.includes("/auth/token/refresh/") ||
      url.includes("/auth/login/") ||
      url.includes("/auth/register/");

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;

      // Share a single in-flight refresh across concurrent 401s.
      refreshing = refreshing ?? refreshAccessToken();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return api(original);
      }

      // Refresh failed — session is dead. Clear and notify.
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("oam:logout"));
    }

    return Promise.reject(error);
  }
);

/** Normalize a DRF error into a readable message for the UI. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  const e = err as AxiosError<Record<string, unknown>>;
  const data = e?.response?.data;
  if (!data) return e?.message || fallback;

  // A string body is almost always an HTML error page (Django's 500 debug page,
  // a proxy error, an outage splash). Indexing into it yields "<" — the first
  // character — which is how a raw "<" ended up on screen as an error. Never
  // show markup to a customer; say something true and useful instead.
  if (typeof data === "string") {
    const status = e?.response?.status;
    if (status && status >= 500) return "The server had a problem completing that. Please try again in a moment.";
    return fallback;
  }

  // DRF commonly returns {detail: "..."} or field errors {field: ["msg"]}.
  if (typeof data.detail === "string") return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    if (Array.isArray(val) && typeof val[0] === "string") return val[0] as string;
    if (typeof val === "string") return val;
  }
  return fallback;
}
