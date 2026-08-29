import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Share, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { ArrowLeft, Gift, Copy, Check, Share2, Users, TrendingUp, Wallet, Pencil } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira, shortDate } from "@/shared/lib/format";
import { apiErrorMessage } from "@/shared/api";
import { referralApi } from "@/features/referrals";

export default function Referral() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const dash = useQuery({ queryKey: ["referrals", "dashboard"], queryFn: referralApi.dashboard });
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dash.data?.custom_slug && !editing) setSlug(dash.data.custom_slug);
  }, [dash.data?.custom_slug, editing]);

  const link = dash.data?.link ?? "";

  const save = useMutation({
    mutationFn: () => referralApi.generateLink(slug.trim()),
    onSuccess: () => { setEditing(false); setError(null); qc.invalidateQueries({ queryKey: ["referrals", "dashboard"] }); },
    onError: (err) => setError(apiErrorMessage(err, t("referral.errSave", "Couldn't save that name. Try another."))),
  });

  async function copy() {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    if (!link) return;
    try {
      await Share.share({
        message: t("referral.shareMessage", "Join me on OAM — pay bills, shop and more. Sign up with my link: {{link}}", { link }),
      });
    } catch { /* user dismissed */ }
  }

  const stats = dash.data?.stats;
  const rate = Math.round(Number(dash.data?.commission_rate ?? 0.05) * 100);
  const threshold = naira(Number(dash.data?.profit_threshold ?? 5000));

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.12)" }}>
            <Gift size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View><Text variant="heading">{t("referral.title", "Refer & Earn")}</Text><Text variant="caption" color="muted">{t("referral.subtitle", "Share your link, earn on every referral.")}</Text></View>
        </View>

        {dash.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} />
        ) : dash.isError ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18 }}>
            <Text variant="body" color="muted">{t("referral.loadError", "Couldn't load your referral dashboard.")}</Text>
            <Button title={t("common.retry", "Retry")} variant="secondary" onPress={() => dash.refetch()} style={{ marginTop: 12 }} />
          </View>
        ) : (
          <>
            {/* Link card */}
            <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
              <Text variant="label" color="muted">{t("referral.yourLink", "Your referral link")}</Text>
              <Text variant="body" color="ink" style={{ marginTop: 6 }} numberOfLines={2}>{link}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button title={copied ? t("referral.copied", "Copied!") : t("referral.copy", "Copy")} variant="secondary" onPress={copy} style={{ flex: 1 }} />
                <Button title={t("referral.share", "Share")} onPress={share} style={{ flex: 1 }} />
              </View>

              {/* Editable slug */}
              {editing ? (
                <View style={{ marginTop: 16 }}>
                  <Input label={t("referral.customName", "Custom name")} value={slug} onChangeText={(v) => setSlug(v.replace(/[^A-Za-z0-9-]/g, "").toLowerCase())} autoCapitalize="none" placeholder="your-name" />
                  {error ? <Text variant="caption" color="danger" style={{ marginTop: -8, marginBottom: 8 }}>{error}</Text> : null}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button title={t("common.cancel", "Cancel")} variant="secondary" onPress={() => { setEditing(false); setError(null); setSlug(dash.data?.custom_slug ?? ""); }} style={{ flex: 1 }} />
                    <Button title={t("referral.saveLink", "Save link")} onPress={() => save.mutate()} loading={save.isPending} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setEditing(true)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start" }}>
                  <Pencil size={14} color={colors.brand.green} />
                  <Text variant="label" color="green">{t("referral.customize", "Customise your link")}</Text>
                </Pressable>
              )}
            </View>

            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <StatCard Icon={Users} label={t("referral.referrals", "Referrals")} value={String(stats?.total_referrals ?? 0)} />
              <StatCard Icon={TrendingUp} label={t("referral.active", "Active")} value={String(stats?.active_referrals ?? 0)} />
              <StatCard Icon={Wallet} label={t("referral.earned", "Earned")} value={naira(Number(stats?.total_earned ?? 0))} />
            </View>

            {/* How it works */}
            <View style={{ borderRadius: 16, backgroundColor: "rgba(11,115,39,0.06)", borderWidth: 1, borderColor: "rgba(11,115,39,0.18)", padding: 16, marginTop: 14 }}>
              <Text variant="label" color="green">{t("referral.howTitle", "How it works")}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 6, lineHeight: 18 }}>
                {t("referral.howBody", "Share your link. When someone signs up and completes a transaction where OAM earns {{threshold}} or more, you get {{rate}}% of that profit — straight to your wallet.", { threshold, rate })}
              </Text>
            </View>

            {/* Recent commissions */}
            <Text variant="title" style={{ marginTop: 22, marginBottom: 10 }}>{t("referral.recent", "Recent earnings")}</Text>
            {(dash.data?.recent_commissions?.length ?? 0) === 0 ? (
              <Text variant="caption" color="muted">{t("referral.noneYet", "No referral earnings yet — share your link to get started.")}</Text>
            ) : (
              dash.data!.recent_commissions.map((c) => (
                <View key={c.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" color="ink">{c.referee_name}</Text>
                    <Text variant="caption" color="muted">{shortDate(c.created_at)}</Text>
                  </View>
                  <Text variant="label" color="green">+{naira(Number(c.commission_amount))}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ Icon, label, value }: { Icon: typeof Users; label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 12, alignItems: "center" }}>
      <Icon size={18} strokeWidth={1.75} color={colors.brand.green} />
      <Text variant="label" color="ink" style={{ marginTop: 6, textAlign: "center" }} numberOfLines={1}>{value}</Text>
      <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}
