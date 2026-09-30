import { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, Image, Alert, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, FileText, AlertCircle, WifiOff } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useAuthStore } from "@/features/auth";
import { jobsApi, uploadJobsFile, sendJobsEvent, useJobsSocket, type Attachment, type JobChatMessage } from "@/features/jobs";
import { pickImage, pickDocument } from "@/features/jobs/pickers";
import { Avatar, CompanyLogo, StatusPill, BackToDashboard } from "@/features/jobs/ui/kit";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Live recruitment chat. Sends over the WebSocket when it's open (instant, with
 * an ack) and falls back to REST otherwise; each message carries a client_id so
 * the optimistic bubble is replaced exactly once and retries never duplicate.
 */
export default function JobsChat() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const myId = String(me?.id ?? "");
  const [msgs, setMsgs] = useState<JobChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTyping = useRef(0);

  const thread = useQuery({ queryKey: ["jobs", "thread", id], queryFn: () => jobsApi.thread(id), enabled: Boolean(id) });
  const t = thread.data;
  const otherReadAt = readAt ?? (t ? (t.my_side === "employer" ? t.candidate_last_read_at : t.employer_last_read_at) : null);

  useEffect(() => {
    let active = true;
    jobsApi.messages(id).then((r) => { if (active) { setMsgs(r.results); setHasMore(r.has_more); } })
      .catch((e) => setError(apiErrorMessage(e, "Couldn't load messages.")));
    return () => { active = false; };
  }, [id]);

  const markRead = useCallback(() => {
    if (!sendJobsEvent({ type: "chat.read", thread: id })) jobsApi.markRead(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["jobs", "threads"] });
  }, [id, qc]);
  useEffect(() => { markRead(); }, [markRead]);

  const merge = useCallback((m: JobChatMessage) => {
    setMsgs((cur) => {
      if (cur.some((x) => x.id === m.id)) return cur;
      const i = m.client_id ? cur.findIndex((x) => x.pending && x.client_id === m.client_id) : -1;
      if (i >= 0) { const n = [...cur]; n[i] = m; return n; }
      return [...cur, m];
    });
  }, []);

  const socket = useJobsSocket((e) => {
    const d = e.data as Record<string, unknown>;
    if (e.type === "chat.message" && d.thread === id) {
      merge(d as unknown as JobChatMessage);
      if (String(d.sender_id) !== myId) { setTyping(false); if (AppState.currentState === "active") markRead(); }
    } else if (e.type === "chat.typing" && d.thread === id) {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 4000);
    } else if (e.type === "chat.read" && d.thread === id && d.side !== t?.my_side) {
      setReadAt(String(d.at));
    } else if (e.type === "error" && d.client_id) {
      setMsgs((cur) => cur.map((x) => (x.client_id === d.client_id && x.pending ? { ...x, pending: false, failed: true } : x)));
      setError(String(d.detail ?? "Message not sent."));
    }
  });

  async function deliver(m: JobChatMessage) {
    const attachment: Attachment | undefined = m.attachment_url
      ? { url: m.attachment_url, name: m.attachment_name, type: m.attachment_type, size: m.attachment_size ?? 0 } : undefined;
    if (socket === "open" && sendJobsEvent({ type: "chat.send", thread: id, body: m.body, attachment, client_id: m.client_id })) return;
    try {
      merge(await jobsApi.sendMessage(id, { body: m.body, attachment, client_id: m.client_id }));
    } catch (err) {
      setMsgs((cur) => cur.map((x) => (x.client_id === m.client_id ? { ...x, pending: false, failed: true } : x)));
      setError(apiErrorMessage(err, "Message not sent."));
    }
  }

  function queue(body: string, att?: Attachment) {
    setError(null);
    const m: JobChatMessage = {
      id: `local-${uid()}`, thread_id: id, sender_id: myId, sender_name: "You", kind: att ? "attachment" : "text", body,
      attachment_url: att?.url ?? "", attachment_name: att?.name ?? "", attachment_type: att?.type ?? "",
      attachment_size: att?.size ?? null, client_id: uid(), created_at: new Date().toISOString(), pending: true,
    };
    setMsgs((cur) => [...cur, m]);
    deliver(m);
  }

  function onType(v: string) {
    setDraft(v);
    const now = Date.now();
    if (v && now - lastTyping.current > 3000) { lastTyping.current = now; sendJobsEvent({ type: "chat.typing", thread: id }); }
  }

  function attach() {
    Alert.alert("Attach", undefined, [
      { text: "Photo", onPress: () => upload("image") },
      { text: "Document (PDF, Word)", onPress: () => upload("doc") },
      { text: "Cancel", style: "cancel" },
    ]);
  }
  async function upload(kind: "image" | "doc") {
    const f = kind === "image" ? await pickImage() : await pickDocument(["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);
    if (!f) return;
    if ((f.size ?? 0) > 15 * 1024 * 1024) { setError("Files can be up to 15MB."); return; }
    setUploading(true);
    try {
      const url = await uploadJobsFile("job_chat_attachment", f);
      queue("", { url, name: f.fileName ?? "Attachment", type: f.mimeType ?? "", size: f.size ?? 0 });
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }

  async function loadOlder() {
    const first = msgs.find((m) => !m.pending);
    if (!first) return;
    const r = await jobsApi.messages(id, first.created_at);
    setMsgs((cur) => [...r.results, ...cur]);
    setHasMore(r.has_more);
  }

  const lastMine = [...msgs].reverse().find((m) => m.sender_id === myId && !m.pending);
  const seen = Boolean(lastMine && otherReadAt && new Date(otherReadAt) >= new Date(lastMine.created_at));
  const other = t ? (t.my_side === "employer" ? t.candidate.display_name : t.employer.company_name) : "";

  return (
    <Screen edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline, gap: 10 }}>
        <BackToDashboard />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/jobs-messages" as never))} hitSlop={8} accessibilityLabel="Back to messages">
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          {t ? (t.my_side === "employer" ? <Avatar name={other} url={t.candidate.photo_url} size={38} /> : <CompanyLogo url={t.employer.logo_url} name={other} size={38} />) : null}
          <View style={{ flex: 1 }}>
            <Text variant="label" numberOfLines={1}>{other}</Text>
            <Text variant="caption" color={typing ? "green" : "muted"} numberOfLines={1}>{typing ? "typing…" : t?.job?.title ?? ""}</Text>
          </View>
          {t?.application_status ? <StatusPill status={t.application_status} /> : null}
        </View>
      </View>
      {socket !== "open" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: "rgba(180,83,9,0.10)" }}>
          <WifiOff size={13} color={colors.warn} /><Text variant="caption" color="warn">Reconnecting — messages will still send.</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 14, gap: 8 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {hasMore ? <Pressable onPress={loadOlder} style={{ alignSelf: "center", padding: 6 }}><Text variant="caption" color="muted">Load earlier messages</Text></Pressable> : null}
          {msgs.map((m) => {
            if (m.kind === "system") return <Text key={m.id} variant="caption" color="muted" style={{ textAlign: "center", paddingVertical: 4 }}>{m.body}</Text>;
            const mine = m.sender_id === myId;
            return (
              <View key={m.id} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                <View style={{ maxWidth: "82%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: mine ? colors.brand.green : colors.mist,
                               borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, opacity: m.pending ? 0.7 : 1 }}>
                  {m.attachment_url ? (
                    m.attachment_type.startsWith("image/") ? (
                      <Pressable onPress={() => Linking.openURL(m.attachment_url)}><Image source={{ uri: m.attachment_url }} style={{ width: 200, height: 150, borderRadius: 10, marginBottom: 4 }} /></Pressable>
                    ) : (
                      <Pressable onPress={() => Linking.openURL(m.attachment_url)} style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 10, marginBottom: 4, backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.paper }}>
                        <FileText size={16} color={mine ? "#FFF" : colors.ink} />
                        <Text variant="caption" color={mine ? "paper" : "ink"} numberOfLines={1} style={{ maxWidth: 180 }}>{m.attachment_name || "Attachment"}</Text>
                      </Pressable>
                    )
                  ) : null}
                  {m.body ? <Text variant="body" color={mine ? "paper" : "ink"} style={{ lineHeight: 20 }}>{m.body}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
                    {m.pending ? <ActivityIndicator size="small" color={mine ? "#FFF" : colors.muted} style={{ transform: [{ scale: 0.6 }] }} /> : null}
                    <Text variant="caption" style={{ fontSize: 10.5, color: mine ? "rgba(255,255,255,0.7)" : colors.muted }}>{time(m.created_at)}</Text>
                  </View>
                  {m.failed ? (
                    <Pressable onPress={() => { setMsgs((c) => c.map((x) => (x.client_id === m.client_id ? { ...x, failed: false, pending: true } : x))); deliver(m); }}
                               style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <AlertCircle size={12} color="#FFF" /><Text variant="caption" color="paper" style={{ fontFamily: fonts.bold }}>Not sent — tap to retry</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
          {seen ? <Text variant="caption" color="muted" style={{ textAlign: "right", fontSize: 11 }}>Seen</Text> : null}
        </ScrollView>

        {error ? <Text variant="caption" color="danger" style={{ paddingHorizontal: 16 }}>{error}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
          <Pressable onPress={attach} disabled={uploading} accessibilityLabel="Attach a file"
                     style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.mist }}>
            {uploading ? <ActivityIndicator color={colors.brand.green} /> : <Paperclip size={19} color={colors.ink} />}
          </Pressable>
          <TextInput value={draft} onChangeText={onType} multiline editable={!t?.is_closed}
                     placeholder={t?.is_closed ? "This conversation is closed" : "Write a message"} placeholderTextColor={colors.muted}
                     style={{ flex: 1, maxHeight: 110, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist,
                              paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }} />
          <Pressable onPress={() => { const b = draft.trim(); if (!b) return; setDraft(""); queue(b); }} disabled={!draft.trim()} accessibilityLabel="Send"
                     style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand.green, opacity: draft.trim() ? 1 : 0.45 }}>
            <Send size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
