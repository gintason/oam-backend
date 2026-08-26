import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store, Wrench, ShieldCheck, Lock, MessagesSquare } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { shortDate } from "@/shared/lib/format";
import { messagingApi, type Conversation } from "@/features/messaging/api/messaging-api";

type Tab = "all" | "customer" | "provider";
const TABS: { key: Tab; labelKey: string }[] = [
  { key: "all", labelKey: "messages.inbox.tabAll" },
  { key: "customer", labelKey: "messages.inbox.tabMine" },
  { key: "provider", labelKey: "messages.inbox.tabToMe" },
];

export default function Messages() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("all");

  const query = useQuery({
    queryKey: ["messaging", "list", tab],
    queryFn: () => messagingApi.list(tab === "all" ? undefined : tab),
  });
  const conversations = query.data?.results ?? [];

  return (
    <Screen edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("messages.inbox.back")}</Text>
        </Pressable>
        <Text variant="heading">{t("messages.inbox.title")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("messages.inbox.subtitle")}</Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {TABS.map((tabItem) => {
            const sel = tab === tabItem.key;
            return (
              <Pressable key={tabItem.key} onPress={() => setTab(tabItem.key)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.ink : colors.paper, borderWidth: sel ? 0 : 1, borderColor: colors.hairline }}>
                <Text variant="caption" color={sel ? "paper" : "muted"}>{t(tabItem.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {query.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 40 }} />
        ) : conversations.length === 0 ? (
          <View style={{ marginTop: 30, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, paddingVertical: 40, alignItems: "center", gap: 8 }}>
            <MessagesSquare size={30} strokeWidth={1.5} color={colors.muted} />
            <Text variant="label" color="ink">{t("messages.inbox.emptyTitle")}</Text>
            <Text variant="caption" color="muted" style={{ textAlign: "center", maxWidth: 260, lineHeight: 18 }}>
              {t("messages.inbox.emptyBody")}
            </Text>
          </View>
        ) : (
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
            {conversations.map((c, i) => <Row key={c.id} convo={c} first={i === 0} onPress={() => router.push({ pathname: "/thread", params: { id: c.id } })} />)}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ convo, first, onPress }: { convo: Conversation; first: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const isListing = convo.kind === "listing";
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.hairline }}>
      <View style={{ height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: isListing ? "rgba(227,16,18,0.10)" : "rgba(11,115,39,0.10)" }}>
        {isListing ? <Store size={17} strokeWidth={1.75} color={colors.brand.red} /> : <Wrench size={17} strokeWidth={1.75} color={colors.brand.green} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="label" color="ink" numberOfLines={1} style={{ flexShrink: 1 }}>{convo.subject.title}</Text>
          {convo.contacts ? <ShieldCheck size={12} strokeWidth={2.25} color={colors.brand.green} /> : <Lock size={11} strokeWidth={2} color={colors.muted} />}
        </View>
        <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 1 }}>
          {convo.other_party_name}{convo.last_message ? ` · ${convo.last_message.body}` : ""}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: 1, fontSize: 11 }}>
          {shortDate(convo.last_message_at)}
          {convo.role === "provider" && convo.status === "open" ? <Text variant="caption" color="warn" style={{ fontSize: 11 }}>  {t("messages.inbox.needsReply")}</Text> : null}
        </Text>
      </View>
      {convo.unread > 0 ? (
        <View style={{ height: 20, minWidth: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.brand.red, alignItems: "center", justifyContent: "center" }}>
          <Text variant="caption" color="paper" style={{ fontSize: 11 }}>{convo.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
