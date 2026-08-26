import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Lock, Check, X, Phone, MessageCircle, Send } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors, fonts } from "@/shared/theme";
import { naira, shortDate } from "@/shared/lib/format";
import { messagingApi } from "@/features/messaging/api/messaging-api";

export default function Thread() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const thread = useQuery({ queryKey: ["messaging", "thread", id], queryFn: () => messagingApi.get(id), enabled: !!id, refetchInterval: 8000 });

  const send = useMutation({
    mutationFn: (body: string) => messagingApi.send(id, body),
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["messaging", "thread", id] }); qc.invalidateQueries({ queryKey: ["messaging", "list"] }); },
    onError: (err) => setError(apiErrorMessage(err, t("messages.chat.errSend"))),
  });

  const act = useMutation({
    mutationFn: (action: "accept" | "decline" | "close") => messagingApi.act(id, action),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["messaging", "thread", id] }); qc.invalidateQueries({ queryKey: ["messaging", "list"] }); },
    onError: (err) => setError(apiErrorMessage(err, t("messages.chat.errUpdate"))),
  });

  const convo = thread.data?.conversation;
  const messages = thread.data?.messages ?? [];

  function submit() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    send.mutate(body);
  }

  return (
    <Screen edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("messages.chat.back")}</Text>
        </Pressable>
        {convo ? (
          <>
            <Text variant="caption" color="muted" style={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11 }}>
              {convo.kind === "listing" ? t("messages.chat.kindListing") : t("messages.chat.kindArtisan")}
            </Text>
            <Text variant="title" numberOfLines={1}>{convo.subject.title}</Text>
            <Text variant="caption" color="muted">
              {t("messages.chat.with", { name: convo.other_party_name })}{convo.subject.price ? ` · ${naira(convo.subject.price)}` : ""}
            </Text>
          </>
        ) : null}
      </View>

      {thread.isLoading ? (
        <ActivityIndicator color={colors.brand.green} style={{ marginTop: 40 }} />
      ) : !convo ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text variant="title">{t("messages.chat.unavailable")}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          {/* Contact gate */}
          {convo.contacts ? (
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "rgba(11,115,39,0.05)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={13} strokeWidth={2.25} color={colors.brand.green} />
                <Text variant="label" color="green">{t("messages.chat.contactShared")}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {convo.contacts.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${convo.contacts!.phone}`)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, paddingHorizontal: 12, height: 38 }}>
                    <Phone size={13} strokeWidth={1.75} color={colors.ink} /><Text variant="label" color="ink">{convo.contacts.phone}</Text>
                  </Pressable>
                ) : null}
                {convo.contacts.whatsapp ? (
                  <Pressable onPress={() => Linking.openURL(`https://wa.me/${convo.contacts!.whatsapp.replace(/\D/g, "")}`)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, paddingHorizontal: 12, height: 38 }}>
                    <MessageCircle size={13} strokeWidth={1.75} color={colors.ink} /><Text variant="label" color="ink">WhatsApp</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : convo.status === "open" ? (
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.mist }}>
              {convo.role === "provider" ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Lock size={13} strokeWidth={1.75} color={colors.ink} /><Text variant="label" color="ink">{t("messages.chat.providerGateTitle")}</Text>
                  </View>
                  <Text variant="caption" color="muted" style={{ marginTop: 4, lineHeight: 18 }}>
                    {t("messages.chat.providerGateBody")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Pressable onPress={() => act.mutate("accept")} disabled={act.isPending} style={{ height: 38, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.brand.green, flexDirection: "row", alignItems: "center", gap: 6, opacity: act.isPending ? 0.6 : 1 }}>
                      <Check size={14} strokeWidth={2.5} color="#FFF" /><Text variant="label" color="paper">{t("messages.chat.accept")}</Text>
                    </Pressable>
                    <Pressable onPress={() => act.mutate("decline")} disabled={act.isPending} style={{ height: 38, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 6, opacity: act.isPending ? 0.6 : 1 }}>
                      <X size={14} strokeWidth={2} color={colors.muted} /><Text variant="label" color="muted">{t("messages.chat.decline")}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Lock size={13} strokeWidth={1.75} color={colors.muted} style={{ marginTop: 1 }} />
                  <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
                    {t("messages.chat.customerGate", { name: convo.other_party_name })}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.mist }}>
              <Text variant="caption" color="muted">{t("messages.chat.wasStatus", { status: t(`messages.chat.status.${convo.status}`) })}</Text>
            </View>
          )}

          {/* Messages */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <Text variant="caption" color="muted" style={{ textAlign: "center", paddingVertical: 30 }}>{t("messages.chat.noMessages")}</Text>
            ) : messages.map((m) => (
              <View key={m.id} style={{ alignItems: m.is_mine ? "flex-end" : "flex-start" }}>
                <View style={{ maxWidth: "80%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: m.is_mine ? colors.brand.green : colors.mist, borderBottomRightRadius: m.is_mine ? 4 : 16, borderBottomLeftRadius: m.is_mine ? 16 : 4 }}>
                  <Text variant="body" color={m.is_mine ? "paper" : "ink"} style={{ lineHeight: 20 }}>{m.body}</Text>
                  <Text variant="caption" style={{ marginTop: 3, fontSize: 10.5, color: m.is_mine ? "rgba(255,255,255,0.6)" : colors.muted }}>{shortDate(m.created_at)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Composer */}
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
            {error ? <Text variant="caption" color="danger" style={{ marginBottom: 6, marginLeft: 4 }}>{error}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                multiline
                editable={convo.status !== "closed"}
                placeholder={convo.status === "closed" ? t("messages.chat.closedPlaceholder") : t("messages.chat.placeholder")}
                placeholderTextColor={colors.muted}
                style={{ flex: 1, maxHeight: 110, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
              />
              <Pressable onPress={submit} disabled={!draft.trim() || send.isPending || convo.status === "closed"} style={{ height: 46, width: 46, borderRadius: 12, backgroundColor: colors.brand.red, alignItems: "center", justifyContent: "center", opacity: !draft.trim() || send.isPending || convo.status === "closed" ? 0.4 : 1 }}>
                {send.isPending ? <ActivityIndicator color="#FFF" /> : <Send size={17} strokeWidth={1.75} color="#FFF" />}
              </Pressable>
            </View>
            <Text variant="caption" color="muted" style={{ marginTop: 6, marginLeft: 4, fontSize: 11 }}>{t("messages.chat.safetyNote")}</Text>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
