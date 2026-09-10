import { api } from "@/shared/api";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const assistantApi = {
  status: () =>
    api.get<{ available: boolean; mode: "ai" | "knowledge-base"; greeting: string; suggestions: string[] }>("/assistant/status/").then((r) => r.data),
  ask: (question: string, history: ChatTurn[]) =>
    api.post<{ reply: string; mode: "ai" | "knowledge-base" }>("/assistant/chat/", { question, history: history.slice(-10) }).then((r) => r.data),
};
