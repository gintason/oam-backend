import { useState, useRef, useEffect } from "react";
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Send, Sparkles } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { assistantApi, type ChatTurn } from "@/features/assistant";

export default function AssistantScreen() {
  const router = useRouter();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const status = useQuery({ queryKey: ["assistant-status"], queryFn: assistantApi.status });

  const ask = useMutation({
    mutationFn: (q: string) => assistantApi.ask(q, turns),
    onSuccess: (data) => {
      setTurns((t) => [...t, { role: "assistant", content: data.reply }]);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err, "I couldn't answer that just now. Please try again.")),
  });

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [turns, ask.isPending]);

  function submit(q?: string) {
    const question = (q ?? input).trim();
    if (!question || ask.isPending) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", content: question }]);
    ask.mutate(question);
  }

  const greeting = status.data?.greeting || "Hi, I'm O.A.M Assistant. How can I help you with OAM today?";
  const suggestions = status.data?.suggestions ?? [];

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <Pressable onPress={() => router.back()} hitSlop={8}><ArrowLeft size={20} color={colors.ink} /></Pressable>
          <View style={{ height: 38, width: 38, borderRadius: 19, backgroundColor: "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} strokeWidth={2} color={colors.brand.green} />
          </View>
          <View>
            <Text variant="title">O.A.M Assistant</Text>
            <Text variant="caption" color="muted">{status.data?.mode === "ai" ? "Online" : "Support"}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* greeting */}
          <Bubble role="assistant">{greeting}</Bubble>

          {/* suggestion chips (before any conversation) */}
          {turns.length === 0 && suggestions.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
              {suggestions.slice(0, 4).map((sug) => (
                <Pressable key={sug} onPress={() => submit(sug)} style={{ borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text variant="caption" color="green">{sug}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {turns.map((t, i) => <Bubble key={i} role={t.role}>{t.content}</Bubble>)}

          {ask.isPending ? (
            <View style={{ alignSelf: "flex-start", backgroundColor: colors.mist, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
              <ActivityIndicator color={colors.brand.green} />
            </View>
          ) : null}

          {error ? <Text variant="caption" color="danger">{error}</Text> : null}
        </ScrollView>

        {/* composer */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 14 : 12, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask O.A.M Assistant…"
            placeholderTextColor={colors.muted}
            multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
            onSubmitEditing={() => submit()}
          />
          <Pressable onPress={() => submit()} disabled={!input.trim() || ask.isPending} style={{ height: 46, width: 46, borderRadius: 23, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center", opacity: !input.trim() || ask.isPending ? 0.5 : 1 }}>
            <Send size={19} strokeWidth={2} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", backgroundColor: mine ? colors.brand.green : colors.mist, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }}>
      <Text variant="body" color={mine ? "paper" : "ink"} style={{ lineHeight: 21 }}>{children}</Text>
    </View>
  );
}
