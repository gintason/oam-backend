import { useState } from "react";
import { View, ScrollView, Pressable, Modal, TextInput } from "react-native";
import { Clock, Pencil } from "lucide-react-native";
import { Text, Button } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { colors, fonts } from "@/shared/theme";
import { formatPhone } from "@/shared/lib/format";
import {
  useRecents,
  renameRecent,
  removeRecent,
  type RecentItem,
} from "@/shared/lib/recent-beneficiaries";

export function RecentBeneficiaries({
  type,
  enabled = true,
  onPick,
}: {
  type: string;
  enabled?: boolean;
  onPick: (item: RecentItem) => void;
}) {
  const { t } = useTranslation();
  const items = useRecents(type);
  const [editing, setEditing] = useState<RecentItem | null>(null);
  const [draft, setDraft] = useState("");

  if (!enabled) return null;

  const isPhoneType = type === "airtime" || type === "data";
  const heading =
    type === "electricity" ? t("beneficiaries.savedMeters") : type === "cable" ? t("beneficiaries.savedCards") : t("beneficiaries.recentNumbers");
  const emptyHint =
    type === "electricity"
      ? t("beneficiaries.emptyMeters")
      : type === "cable"
      ? t("beneficiaries.emptyCards")
      : t("beneficiaries.emptyNumbers");

  const primary = (it: RecentItem) =>
    it.label || (isPhoneType ? formatPhone(it.account_identifier) : it.account_identifier);

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Clock size={13} color={colors.muted} />
        <Text variant="label" color="muted">
          {heading}
        </Text>
      </View>

      {items.length === 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.hairline,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "rgba(248,250,252,0.6)",
          }}
        >
          <Text variant="caption" color="muted">
            {emptyHint}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {items.map((it) => (
            <View
              key={it.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.hairline,
                borderRadius: 999,
                backgroundColor: colors.mist,
                paddingLeft: 14,
                paddingRight: 6,
                height: 40,
              }}
            >
              <Pressable onPress={() => onPick(it)} style={{ paddingRight: 8 }}>
                <Text variant="label" color="ink">
                  {primary(it)}
                </Text>
                {it.label ? (
                  <Text variant="caption" color="muted" style={{ fontSize: 10, marginTop: -2 }}>
                    {isPhoneType ? formatPhone(it.account_identifier) : it.account_identifier}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditing(it);
                  setDraft(it.label ?? "");
                }}
                hitSlop={6}
                style={{
                  height: 28,
                  width: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: it.label ? "transparent" : "rgba(11,115,39,0.12)",
                }}
              >
                <Pencil size={13} color={it.label ? colors.muted : colors.brand.green} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable
          onPress={() => setEditing(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderRadius: 18, padding: 20 }}>
            <Text variant="title">{isPhoneType ? t("beneficiaries.nameThisNumber") : t("beneficiaries.nameThisAccount")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              {editing ? (isPhoneType ? formatPhone(editing.account_identifier) : editing.account_identifier) : ""}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("beneficiaries.namePlaceholder")}
              placeholderTextColor={colors.muted}
              autoFocus
              style={{
                marginTop: 14,
                height: 48,
                borderWidth: 1,
                borderColor: colors.hairline,
                borderRadius: 12,
                backgroundColor: colors.mist,
                paddingHorizontal: 14,
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.ink,
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Button
                title={t("beneficiaries.remove")}
                variant="secondary"
                onPress={() => {
                  if (editing) removeRecent(type, editing.id);
                  setEditing(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title={t("beneficiaries.save")}
                onPress={() => {
                  if (editing) renameRecent(type, editing.id, draft);
                  setEditing(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
