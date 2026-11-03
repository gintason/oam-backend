/**
 * Report & Block (App Store guideline 1.2).
 *
 *   <ReportBlockButton target="listing" id={listing.id} />
 *
 * Shows a small "Report · Block" link. Tapping it opens a sheet where the user
 * picks a reason, can add details, and can also block the person. Blocking
 * hides that person's listings, artisan profile, comments and chats, and stops
 * them messaging you. Reports go to the O.A.M team for review within 24 hours.
 */
import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Ban, X, CheckCircle2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { confirmDestructive } from "@/shared/lib/confirm";
import { moderationApi, type ReportTarget } from "./api";

const REASONS: { key: string; label: string }[] = [
  { key: "scam", label: "Scam or fraud" },
  { key: "spam", label: "Spam" },
  { key: "offensive", label: "Offensive or inappropriate" },
  { key: "harassment", label: "Harassment or abuse" },
  { key: "prohibited", label: "Prohibited item or service" },
  { key: "fake", label: "Fake or misleading" },
  { key: "other", label: "Something else" },
];

type Props = {
  target: ReportTarget;
  id: string;
  /** Show the Block option (hide it for things you own). Default true. */
  canBlock?: boolean;
  /** Called after the user is blocked — e.g. go back from the blocked screen. */
  onBlocked?: () => void;
  /** "link" = small grey text (default); "icon" = flag icon only, for headers. */
  look?: "link" | "icon";
};

export function ReportBlockButton({ target, id, canBlock = true, onBlocked, look = "link" }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!id) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button"
                 accessibilityLabel={t("moderation.reportOrBlock", "Report or block")}
                 style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6 }}>
        <Flag size={look === "icon" ? 18 : 13} color={colors.muted} />
        {look === "link" ? (
          <Text variant="caption" color="muted">
            {canBlock ? t("moderation.reportOrBlock", "Report or block") : t("moderation.report", "Report")}
          </Text>
        ) : null}
      </Pressable>
      <ReportBlockSheet visible={open} onClose={() => setOpen(false)} target={target} id={id}
                        canBlock={canBlock} onBlocked={onBlocked} />
    </>
  );
}

export function ReportBlockSheet({ visible, onClose, target, id, canBlock = true, onBlocked }:
  Props & { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const reset = () => { setReason(""); setDetails(""); setAlsoBlock(false); setDone(null); setError(null); setBusy(null); };
  const close = () => {
    const wasBlocked = blocked;
    reset(); setBlocked(false); onClose();
    if (wasBlocked) onBlocked?.();
  };
  const refreshFeeds = () => {
    // Hide the blocked person everywhere straight away.
    qc.invalidateQueries();
  };

  const sendReport = async () => {
    setBusy("report"); setError(null);
    try {
      const r = await moderationApi.report({ target_type: target, target_id: id, reason, details: details.trim(), block: canBlock && alsoBlock });
      if (r.blocked) { setBlocked(true); refreshFeeds(); }
      setDone(r.blocked
        ? t("moderation.reportedAndBlocked", "Thanks for reporting. This user is now blocked — you won't see their content or messages. Our team will review the report within 24 hours.")
        : t("moderation.reported", "Thanks for reporting. Our team will review it within 24 hours."));
    } catch (err) {
      setError(apiErrorMessage(err, t("moderation.reportFailed", "Couldn't send the report. Please try again.")));
    } finally { setBusy(null); }
  };

  const blockNow = () => confirmDestructive({
    title: t("moderation.blockTitle", "Block this user?"),
    message: t("moderation.blockMessage", "You won't see their listings, profile, comments or messages, and they can't message you. You can unblock them from Profile › Blocked users."),
    confirmText: t("moderation.block", "Block"),
    cancelText: t("common.cancel", "Cancel"),
    onConfirm: async () => {
      setBusy("block"); setError(null);
      try {
        await moderationApi.block(target, id);
        setBlocked(true); refreshFeeds();
        setDone(t("moderation.blocked", "User blocked. You won't see their content or messages any more."));
      } catch (err) {
        setError(apiErrorMessage(err, t("moderation.blockFailed", "Couldn't block this user. Please try again.")));
      } finally { setBusy(null); }
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                       paddingHorizontal: 18, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 16), maxHeight: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text variant="title" style={{ flex: 1 }}>
              {done ? t("moderation.done", "Done") : t("moderation.reportTitle", "Report")}
            </Text>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel={t("common.close", "Close")}>
              <X size={22} color={colors.ink} />
            </Pressable>
          </View>

          {done ? (
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <CheckCircle2 size={40} color={colors.brand.green} />
              <Text variant="body" style={{ textAlign: "center", lineHeight: 22 }}>{done}</Text>
              <SheetButton label={t("common.close", "Close")} onPress={close} />
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingBottom: 6 }}>
              <Text variant="caption" color="muted">{t("moderation.why", "Why are you reporting this?")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {REASONS.map((r) => {
                  const on = reason === r.key;
                  return (
                    <Pressable key={r.key} onPress={() => setReason(r.key)}
                               style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                                        borderColor: on ? colors.brand.red : colors.hairline,
                                        backgroundColor: on ? "#FDECEC" : colors.paper }}>
                      <Text variant="caption" color={on ? "red" : "ink"}>{t(`moderation.reasons.${r.key}`, r.label)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput value={details} onChangeText={setDetails} multiline maxLength={1000}
                         placeholder={t("moderation.detailsPlaceholder", "Add details (optional)")}
                         placeholderTextColor={colors.muted}
                         style={{ minHeight: 70, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12,
                                  padding: 12, fontFamily: fonts.regular, color: colors.ink, textAlignVertical: "top" }} />
              {canBlock ? (
                <Pressable onPress={() => setAlsoBlock(!alsoBlock)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
                           accessibilityRole="checkbox" accessibilityState={{ checked: alsoBlock }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                                 borderColor: alsoBlock ? colors.brand.red : colors.hairline,
                                 backgroundColor: alsoBlock ? colors.brand.red : colors.paper,
                                 alignItems: "center", justifyContent: "center" }}>
                    {alsoBlock ? <Text variant="caption" color="paper">✓</Text> : null}
                  </View>
                  <Text variant="label">{t("moderation.alsoBlock", "Also block this user")}</Text>
                </Pressable>
              ) : null}
              {error ? <Text variant="caption" color="danger">{error}</Text> : null}
              <SheetButton label={t("moderation.sendReport", "Send report")} onPress={sendReport}
                           disabled={!reason || busy !== null} loading={busy === "report"} tone="red" />
              {canBlock ? (
                <Pressable onPress={blockNow} disabled={busy !== null}
                           style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 }}>
                  {busy === "block" ? <ActivityIndicator color={colors.danger} /> : <Ban size={16} color={colors.danger} />}
                  <Text variant="label" color="danger">{t("moderation.blockOnly", "Block this user without reporting")}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetButton({ label, onPress, disabled, loading, tone = "dark" }:
  { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: "dark" | "red" }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
               style={{ alignSelf: "stretch", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 999,
                        backgroundColor: tone === "red" ? colors.brand.red : colors.brand.black, opacity: disabled ? 0.5 : 1 }}>
      {loading ? <ActivityIndicator color={colors.paper} /> : <Text variant="label" color="paper">{label}</Text>}
    </Pressable>
  );
}
