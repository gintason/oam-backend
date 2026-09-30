/**
 * Small building blocks shared by the jobs screens. Styled with the app's own
 * tokens (colors, fonts, Text variants) so the section looks like the rest of OAM.
 */
import { useState, type ReactNode } from "react";
import {
  View, Pressable, ScrollView, ActivityIndicator, TextInput, Switch, Image, Modal, Platform, ActionSheetIOS,
  type TextInputProps, type ViewStyle,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { ArrowLeft, Building2 } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import {
  STATUS_LABEL, JOB_STATUS_LABEL, type ApplicationStatus, type JobStatus,
} from "../api";

/* ------------------------------------------------------------------ */
/* Screen scaffold                                                     */
/* ------------------------------------------------------------------ */

type Section = { href: string; label: string };

export const SEEKER_SECTIONS: Section[] = [
  { href: "/jobs-search", label: "Find jobs" },
  { href: "/jobs-applications", label: "Applications" },
  { href: "/jobs-saved", label: "Saved & alerts" },
  { href: "/jobs-messages", label: "Messages" },
  { href: "/jobs-profile", label: "My CV" },
];

export const EMPLOYER_SECTIONS: Section[] = [
  { href: "/jobs-employer", label: "Hiring overview" },
  { href: "/jobs-post", label: "Post a job" },
  { href: "/jobs-candidates", label: "Candidates" },
  { href: "/jobs-messages", label: "Messages" },
  { href: "/jobs-plans", label: "Plans" },
];

/** "← Back to Dashboard" — on every jobs screen, always to the home tab. */
export function BackToDashboard() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.replace("/home")}
      hitSlop={8}
      accessibilityRole="link"
      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
    >
      <ArrowLeft size={16} color={colors.brand.green} strokeWidth={2} />
      <Text variant="label" color="green">Back to Dashboard</Text>
    </Pressable>
  );
}

function SectionTabs({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      {sections.map((s) => {
        const active = path === s.href;
        return (
          <Pressable
            key={s.href}
            onPress={() => !active && router.push(s.href as never)}
            style={{
              height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center",
              backgroundColor: active ? colors.ink : colors.paper,
              borderWidth: 1, borderColor: active ? colors.ink : colors.hairline,
            }}
          >
            <Text variant="label" color={active ? "paper" : "ink"} style={{ fontSize: 13 }}>{s.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Standard jobs screen: Back to Dashboard, title, optional section tabs, then
 * scrollable content. Pass `scroll={false}` for screens that manage their own list.
 */
export function JobsScreen({
  title, subtitle, side, right, children, scroll = true, footer,
}: {
  title: string;
  subtitle?: string;
  side?: "seeker" | "employer";
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const header = (
    <View style={{ paddingTop: 16, paddingBottom: 12, gap: 12, borderBottomWidth: side ? 1 : 0, borderBottomColor: colors.hairline }}>
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <BackToDashboard />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{title}</Text>
            {subtitle ? <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      </View>
      {side ? <SectionTabs sections={side === "employer" ? EMPLOYER_SECTIONS : SEEKER_SECTIONS} /> : null}
    </View>
  );
  return (
    <Screen edges={["top"]}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }} showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const base: ViewStyle = { borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 };
  if (onPress) return <Pressable onPress={onPress} style={[base, style]}>{children}</Pressable>;
  return <View style={[base, style]}>{children}</View>;
}

export function Loading() {
  return <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 30 }} />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", padding: 28, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.paper }}>
      <View style={{ height: 48, width: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.mist }}>{icon}</View>
      <Text variant="title" style={{ marginTop: 10, textAlign: "center" }}>{title}</Text>
      {body ? <Text variant="caption" color="muted" style={{ marginTop: 4, textAlign: "center", lineHeight: 18 }}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 14, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function ErrorNote({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(159,18,57,0.2)", backgroundColor: "rgba(159,18,57,0.05)", padding: 10 }}>
      <Text variant="caption" color="danger">{children}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: active }}
      style={{
        height: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: "center",
        borderWidth: 1, borderColor: active ? colors.ink : colors.hairline,
        backgroundColor: active ? colors.ink : colors.paper,
      }}
    >
      <Text variant="label" color={active ? "paper" : "ink"} style={{ fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function PillButton({
  label, onPress, tone = "green", icon, disabled, loading, style,
}: {
  label: string; onPress: () => void; tone?: "green" | "red" | "outline" | "dark";
  icon?: ReactNode; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const bg = tone === "green" ? colors.brand.green : tone === "red" ? colors.brand.red : tone === "dark" ? colors.ink : colors.paper;
  const fg = tone === "outline" ? "ink" : "paper";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[{
        height: 42, paddingHorizontal: 16, borderRadius: 12, flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 6, backgroundColor: bg, opacity: disabled || loading ? 0.55 : 1,
        borderWidth: tone === "outline" ? 1 : 0, borderColor: colors.hairline,
      }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={tone === "outline" ? colors.brand.green : "#FFF"} /> : icon}
      <Text variant="label" color={fg}>{label}</Text>
    </Pressable>
  );
}

const APP_TONE: Record<ApplicationStatus, { bg: string; fg: string }> = {
  applied: { bg: colors.mist, fg: colors.ink },
  under_review: { bg: colors.mist, fg: colors.ink },
  shortlisted: { bg: "rgba(11,115,39,0.10)", fg: colors.brand.green },
  interview: { bg: "rgba(11,115,39,0.10)", fg: colors.brand.green },
  offer: { bg: "rgba(11,115,39,0.16)", fg: colors.brand.green },
  hired: { bg: colors.brand.green, fg: "#FFFFFF" },
  rejected: { bg: "rgba(159,18,57,0.06)", fg: colors.danger },
  withdrawn: { bg: colors.mist, fg: colors.muted },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const t = APP_TONE[status];
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: t.bg, alignSelf: "flex-start" }}>
      <Text variant="caption" style={{ color: t.fg, fontFamily: fonts.bold, fontSize: 11.5 }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const JOB_TONE: Record<JobStatus, { bg: string; fg: string }> = {
  draft: { bg: colors.mist, fg: colors.muted },
  pending_review: { bg: "rgba(180,83,9,0.10)", fg: colors.warn },
  active: { bg: "rgba(11,115,39,0.10)", fg: colors.brand.green },
  paused: { bg: colors.mist, fg: colors.ink },
  closed: { bg: colors.mist, fg: colors.muted },
  expired: { bg: "rgba(180,83,9,0.10)", fg: colors.warn },
  rejected: { bg: "rgba(159,18,57,0.06)", fg: colors.danger },
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  const t = JOB_TONE[status];
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: t.bg, alignSelf: "flex-start" }}>
      <Text variant="caption" style={{ color: t.fg, fontFamily: fonts.bold, fontSize: 11.5 }}>{JOB_STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function MatchBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const label = score >= 80 ? "Great match" : score >= 60 ? "Good match" : score >= 40 ? "Fair match" : "Low match";
  const good = score >= 60;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: good ? "rgba(11,115,39,0.10)" : colors.mist, alignSelf: "flex-start" }}>
      <Text variant="caption" style={{ color: good ? colors.brand.green : colors.muted, fontFamily: fonts.bold, fontSize: 11.5 }}>
        {score}%{compact ? " match" : ` · ${label}`}
      </Text>
    </View>
  );
}

export function CompanyLogo({ url, name, size = 44 }: { url?: string; name: string; size?: number }) {
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }} resizeMode="contain" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
      {name ? <Text variant="title" color="green" style={{ fontSize: size * 0.38 }}>{name[0].toUpperCase()}</Text> : <Building2 size={size * 0.45} color={colors.brand.green} />}
    </View>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink }}>
      <Text variant="label" color="paper" style={{ fontSize: size * 0.36 }}>{initials || "?"}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      {children}
      {error ? <Text variant="caption" color="danger">{error}</Text> : hint ? <Text variant="caption" color="muted">{hint}</Text> : null}
    </View>
  );
}

export function TextBox({ multiline, style, ...rest }: TextInputProps) {
  return (
    <TextInput
      {...rest}
      multiline={multiline}
      placeholderTextColor={colors.muted}
      style={[{
        minHeight: multiline ? 96 : 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline,
        backgroundColor: colors.mist, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0,
        fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlignVertical: multiline ? "top" : "center",
      }, style]}
    />
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text variant="body" style={{ flex: 1, paddingRight: 10 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand.green, false: colors.hairline }} thumbColor="#FFFFFF" />
    </View>
  );
}

export function ChipGroup<T extends string>({
  options, value, onToggle,
}: { options: { value: T; label: string }[]; value: T[] | T | undefined; onToggle: (v: T) => void }) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} active={selected.includes(o.value)} onPress={() => onToggle(o.value)} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Action sheet                                                        */
/* ------------------------------------------------------------------ */

export type SheetAction = { label: string; run: () => void; destructive?: boolean };

/**
 * Menu of actions. Uses the native sheet on iOS and a bottom sheet elsewhere:
 * Android's Alert only shows three buttons, which is too few for job menus.
 * Render `sheet` somewhere in the screen and call `show(title, actions)`.
 */
export function useActionSheet() {
  const [open, setOpen] = useState<{ title: string; actions: SheetAction[] } | null>(null);

  function show(title: string, actions: SheetAction[]) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...actions.map((a) => a.label), "Cancel"], cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0) },
        (i) => { if (i < actions.length) actions[i].run(); });
      return;
    }
    setOpen({ title, actions });
  }

  const close = () => setOpen(null);
  const sheet = (
    <Modal visible={!!open} transparent animationType="slide" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} accessibilityLabel="Close menu" />
      <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 }}>
        <Text variant="label" color="muted" numberOfLines={2} style={{ textAlign: "center", marginBottom: 6 }}>{open?.title}</Text>
        {open?.actions.map((a) => (
          <Pressable key={a.label} accessibilityRole="button" onPress={() => { close(); a.run(); }}
                     style={({ pressed }) => ({ paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.hairline, opacity: pressed ? 0.6 : 1 })}>
            <Text variant="body" color={a.destructive ? "red" : undefined} style={{ textAlign: "center" }}>{a.label}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={close}
                   style={{ marginTop: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline }}>
          <Text variant="label" style={{ textAlign: "center" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );

  return { show, sheet };
}
