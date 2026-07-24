import { api } from "../lib/api";

export type ConversationKind = "listing" | "artisan";
export type ConversationStatus = "open" | "accepted" | "declined" | "closed";

export type Contacts = {
  name: string;
  phone: string;
  whatsapp: string;
};

export type Conversation = {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  subject: { title: string; id?: string; price?: string; currency?: string; category?: string };
  other_party_name: string;
  /** "customer" if you started it, "provider" if you're the seller/artisan. */
  role: "customer" | "provider";
  /** null until the provider accepts — that's the whole point of the gate. */
  contacts: Contacts | null;
  unread: number;
  last_message: { body: string; created_at: string } | null;
  accepted_at: string | null;
  last_message_at: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  sender_name: string;
  is_mine: boolean;
  read_at: string | null;
  created_at: string;
};

export const messagingApi = {
  async list(role?: "customer" | "provider"): Promise<{
    count: number; unread: number; results: Conversation[];
  }> {
    const { data } = await api.get("/messaging/conversations/", {
      params: role ? { role } : undefined,
    });
    return data;
  },

  /** Start a thread, or add to the existing one for this item. */
  async start(input: { kind: ConversationKind; id: string; body: string }): Promise<Conversation> {
    const { data } = await api.post("/messaging/conversations/", input);
    return data;
  },

  async get(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    const { data } = await api.get(`/messaging/conversations/${id}/`);
    return data;
  },

  async send(id: string, body: string): Promise<ChatMessage> {
    const { data } = await api.post(`/messaging/conversations/${id}/messages/`, { body });
    return data;
  },

  /** Provider only. Accepting is what reveals both parties' contact details. */
  async act(id: string, action: "accept" | "decline" | "close"): Promise<Conversation> {
    const { data } = await api.post(`/messaging/conversations/${id}/${action}/`, {});
    return data;
  },

  async unread(): Promise<number> {
    const { data } = await api.get("/messaging/unread/");
    return data.unread ?? 0;
  },
};
