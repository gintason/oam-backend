import { api } from "../lib/api";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const assistantApi = {
  async status(): Promise<{
    available: boolean;
    mode: "ai" | "knowledge-base";
    greeting: string;
    suggestions: string[];
  }> {
    const { data } = await api.get("/assistant/status/");
    return data;
  },

  async ask(question: string, history: ChatTurn[]): Promise<{
    reply: string; mode: "ai" | "knowledge-base";
  }> {
    const { data } = await api.post("/assistant/chat/", {
      question,
      // Only the recent turns — enough for context, without sending an
      // ever-growing transcript on every message.
      history: history.slice(-10),
    });
    return data;
  },
};
