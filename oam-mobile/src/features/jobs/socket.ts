/**
 * One shared WebSocket to /ws/jobs/ for the whole app (React Native).
 *
 * Same protocol as the web client: chat messages, typing, read receipts,
 * pipeline changes and notifications arrive on this one socket. Screens
 * subscribe with `useJobsSocket(handler)`; the socket opens with the first
 * subscriber and closes shortly after the last leaves.
 *
 * Reconnects with backoff, re-opens when the app returns to the foreground,
 * and on a 4401 close (expired token) makes one authenticated API call so the
 * axios interceptor refreshes the token before reconnecting.
 */
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api } from "@/shared/api";
import { env } from "@/shared/config/env";
import { tokenVault } from "@/shared/auth/token-store";

export type JobsEvent = { type: string; data: Record<string, unknown> };
type Listener = (e: JobsEvent) => void;
export type SocketState = "connecting" | "open" | "closed";

function socketUrl(): string {
  const override = process.env.EXPO_PUBLIC_WS_URL;
  if (override) return override;
  const m = /^(https?):\/\/([^/]+)/.exec(env.apiUrl);
  const proto = m?.[1] === "http" ? "ws" : "wss";
  return `${proto}://${m?.[2] ?? "api.oam-app.com"}/ws/jobs/`;
}

const listeners = new Set<Listener>();
const stateListeners = new Set<(s: SocketState) => void>();
let ws: WebSocket | null = null;
let connecting = false;
let state: SocketState = "closed";
let retry = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let pingTimer: ReturnType<typeof setInterval> | undefined;
const outbox: string[] = [];

function setState(s: SocketState) {
  state = s;
  stateListeners.forEach((l) => l(s));
}

async function connect() {
  if (ws || connecting) return;
  connecting = true;
  const token = await tokenVault.getAccess();
  connecting = false;
  if (!token || ws || !listeners.size) return;
  setState("connecting");
  const sock = new WebSocket(`${socketUrl()}?token=${encodeURIComponent(token)}`);
  ws = sock;

  sock.onopen = () => {
    retry = 0;
    setState("open");
    while (outbox.length) sock.send(outbox.shift()!);
    pingTimer = setInterval(() => {
      if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "ping" }));
    }, 25_000);
  };

  sock.onmessage = (msg) => {
    try {
      const evt = JSON.parse(String(msg.data)) as JobsEvent;
      if (evt.type !== "pong") listeners.forEach((l) => l(evt));
    } catch {
      /* ignore malformed frames */
    }
  };

  sock.onclose = async (e) => {
    if (pingTimer) clearInterval(pingTimer);
    ws = null;
    setState("closed");
    if (!listeners.size) return;
    if (e.code === 4401) {
      // any authenticated call: a 401 makes the axios interceptor refresh the token
      await api.get("/notifications/unread/").catch(() => undefined);
    }
    const delay = Math.min(30_000, 1000 * 2 ** retry++);
    reconnectTimer = setTimeout(connect, delay);
  };
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pingTimer) clearInterval(pingTimer);
  if (ws) {
    ws.onclose = null;
    ws.close(1000);
    ws = null;
  }
  setState("closed");
}

/** Send a frame. Queued (and a connect started) if the socket isn't open yet. */
export function sendJobsEvent(payload: Record<string, unknown>): boolean {
  const frame = JSON.stringify(payload);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(frame);
    return true;
  }
  outbox.push(frame);
  connect();
  return false;
}

// Reconnect promptly when the app comes back to the foreground.
AppState.addEventListener("change", (s) => {
  if (s === "active" && listeners.size && !ws) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    retry = 0;
    connect();
  }
});

/** Close the socket (call on sign-out). */
export function closeJobsSocket() {
  listeners.clear();
  disconnect();
}

/** Subscribe to socket events for the lifetime of a screen. */
export function useJobsSocket(handler: Listener, enabled = true): SocketState {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const [s, setS] = useState<SocketState>(state);

  useEffect(() => {
    if (!enabled) return;
    const l: Listener = (e) => ref.current(e);
    listeners.add(l);
    stateListeners.add(setS);
    if (idleTimer) clearTimeout(idleTimer);
    connect();
    return () => {
      listeners.delete(l);
      stateListeners.delete(setS);
      if (!listeners.size) idleTimer = setTimeout(disconnect, 15_000);
    };
  }, [enabled]);

  return s;
}
