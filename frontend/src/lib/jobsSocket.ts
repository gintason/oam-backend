import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { tokenStore } from "./tokens";

/**
 * One shared WebSocket to /ws/jobs/ for the whole tab.
 *
 * The backend pushes chat messages, typing, read receipts, pipeline changes
 * and notifications down this single socket. Components subscribe with
 * `useJobsSocket(handler)`; the socket opens with the first subscriber and
 * closes a little after the last one leaves (so navigating between two jobs
 * pages doesn't drop and re-open it).
 *
 * Reconnects with backoff. A 4401 close means the access token expired: we
 * make one authenticated API call (the axios interceptor refreshes the token)
 * and reconnect with the new one.
 */

export type JobsEvent = { type: string; data: Record<string, unknown> };
type Listener = (e: JobsEvent) => void;
export type SocketState = "connecting" | "open" | "closed";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8080/api/v1";

function socketUrl(): string {
  const override = import.meta.env.VITE_WS_URL as string | undefined;
  if (override) return override;
  const u = new URL(API_URL, window.location.origin);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${u.host}/ws/jobs/`;
}

const listeners = new Set<Listener>();
const stateListeners = new Set<(s: SocketState) => void>();
let ws: WebSocket | null = null;
let state: SocketState = "closed";
let retry = 0;
let reconnectTimer: number | undefined;
let idleTimer: number | undefined;
let pingTimer: number | undefined;
const outbox: string[] = [];

function setState(s: SocketState) {
  state = s;
  stateListeners.forEach((l) => l(s));
}

function connect() {
  const token = tokenStore.access;
  if (!token || ws) return;
  setState("connecting");
  const sock = new WebSocket(`${socketUrl()}?token=${encodeURIComponent(token)}`);
  ws = sock;

  sock.onopen = () => {
    retry = 0;
    setState("open");
    while (outbox.length) sock.send(outbox.shift()!);
    pingTimer = window.setInterval(() => {
      if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "ping" }));
    }, 25_000);
  };

  sock.onmessage = (msg) => {
    try {
      const evt = JSON.parse(msg.data) as JobsEvent;
      if (evt.type === "pong") return;
      listeners.forEach((l) => l(evt));
    } catch {
      /* ignore malformed frames */
    }
  };

  sock.onclose = async (e) => {
    window.clearInterval(pingTimer);
    ws = null;
    setState("closed");
    if (!listeners.size) return;
    if (e.code === 4401) {
      try {
        // any authenticated call: a 401 makes the axios interceptor refresh the token
        await api.get("/notifications/unread/");
      } catch {
        /* interceptor handles a dead session */
      }
    }
    const delay = Math.min(30_000, 1000 * 2 ** retry++);
    reconnectTimer = window.setTimeout(connect, delay);
  };
}

function disconnect() {
  window.clearTimeout(reconnectTimer);
  window.clearInterval(pingTimer);
  if (ws) {
    ws.onclose = null;
    ws.close(1000);
    ws = null;
  }
  setState("closed");
}

/** Send a frame. Queued if the socket isn't open yet; returns false if offline. */
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

export function jobsSocketState(): SocketState {
  return state;
}

// Reconnect promptly when the tab comes back online or into view.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { if (listeners.size && !ws) connect(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && listeners.size && !ws) {
      window.clearTimeout(reconnectTimer);
      retry = 0;
      connect();
    }
  });
  window.addEventListener("oam:logout", () => disconnect());
}

/** Subscribe to socket events for the lifetime of a component. */
export function useJobsSocket(handler: Listener, enabled = true): SocketState {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  const [s, setS] = useState<SocketState>(state);

  useEffect(() => {
    if (!enabled) return;
    const l: Listener = (e) => ref.current(e);
    listeners.add(l);
    stateListeners.add(setS);
    window.clearTimeout(idleTimer);
    connect();
    return () => {
      listeners.delete(l);
      stateListeners.delete(setS);
      if (!listeners.size) idleTimer = window.setTimeout(disconnect, 15_000);
    };
  }, [enabled]);

  return s;
}
