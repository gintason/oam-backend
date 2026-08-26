import { api } from "@/shared/api";

export type ConversationKind = "listing" | "artisan";
export type ConversationStatus = "open" | "accepted" | "declined" | "closed";
export type Contacts = { name: string; phone: string; whatsapp: string };

export type Conversation = {
  id: string; kind: ConversationKind; status: ConversationStatus;
  subject: { title: string; id?: string; price?: string; currency?: string; category?: string };
  other_party_name: string; role: "customer" | "provider";
  contacts: Contacts | null; unread: number;
  last_message: { body: string; created_at: string } | null;
  accepted_at: string | null; last_message_at: string; created_at: string;
};

export type ChatMessage = {
  id: string; body: string; sender_name: string; is_mine: boolean; read_at: string | null; created_at: string;
};

export const messagingApi = {
  list: (role?: "customer" | "provider") =>
    api.get<{ count: number; unread: number; results: Conversation[] }>("/messaging/conversations/", { params: role ? { role } : undefined }).then((r) => r.data),

  start: (input: { kind: ConversationKind; id: string; body: string }) =>
    api.post<Conversation>("/messaging/conversations/", input).then((r) => r.data),

  get: (id: string) =>
    api.get<{ conversation: Conversation; messages: ChatMessage[] }>(`/messaging/conversations/${id}/`).then((r) => r.data),

  send: (id: string, body: string) =>
    api.post<ChatMessage>(`/messaging/conversations/${id}/messages/`, { body }).then((r) => r.data),

  act: (id: string, action: "accept" | "decline" | "close") =>
    api.post<Conversation>(`/messaging/conversations/${id}/${action}/`, {}).then((r) => r.data),

  unread: () => api.get<{ unread: number }>("/messaging/unread/").then((r) => r.data.unread ?? 0),
};
