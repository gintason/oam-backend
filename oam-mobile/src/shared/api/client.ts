/**
 * Axios client for the OAM backend — mirrors the web client exactly:
 *  - request interceptor attaches the Bearer access token (from SecureStore)
 *  - response interceptor refreshes on 401 via POST /auth/token/refresh/,
 *    then retries the original request once; concurrent 401s share one refresh
 *  - on refresh failure: clears tokens and emits a session-expired event
 *
 * Backend contract:  base /api/v1  ·  refresh: POST /auth/token/refresh/ {refresh} -> {access}
 */
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/shared/config/env";
import { tokenVault } from "@/shared/auth/token-store";
import { sessionEvents } from "./session-events";

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

/** Bare client (no interceptors) for the refresh call itself — avoids loops. */
const bare = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

// ---- attach access token ---------------------------------------------------
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenVault.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- refresh on 401 --------------------------------------------------------
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenVault.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await bare.post<{ access: string }>("/auth/token/refresh/", { refresh });
    await tokenVault.setAccess(data.access);
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
    const url = original?.url ?? "";
    const isAuthCall =
      url.includes("/auth/token/refresh/") ||
      url.includes("/auth/login/") ||
      url.includes("/auth/register/");

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;

      refreshing = refreshing ?? refreshAccessToken();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return api(original);
      }

      await tokenVault.clear();
      sessionEvents.emitExpired();
    }

    return Promise.reject(error);
  },
);

/** Normalize a DRF error into a readable message for the UI. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  const e = err as AxiosError<Record<string, unknown>>;
  const data = e?.response?.data;
  if (!data) return e?.message || fallback;

  if (typeof data === "string") {
    const status = e?.response?.status;
    if (status && status >= 500)
      return "The server had a problem completing that. Please try again in a moment.";
    return fallback;
  }
  if (typeof data.detail === "string") return data.detail;

  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const v = (data as Record<string, unknown>)[firstKey];
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    if (typeof v === "string") return v;
  }
  return fallback;
}
