import { useState } from "react";
import { View, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Pencil, RefreshCw, Trash2, Plus, Star } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { money, shortDate } from "@/shared/lib/format";
import { confirmDestructive } from "@/shared/lib/confirm";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import type { ListingListItem } from "@/entities/marketplace";

/** The seller's own listings: open, edit, renew or delete each one. */
export default function MyListings() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mine = useQuery({ queryKey: ["marketplace", "mine"], queryFn: marketplaceApi.mine });
  const listings = mine.data?.results ?? [];

  const done = () => { setError(null); qc.invalidateQueries({ queryKey: ["marketplace"] }); };
  const renew = useMutation({
    mutationFn: (id: string) => marketplaceApi.renew(id),
    onSuccess: done,
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.sell.errRenew"))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => marketplaceApi.remove(id),
    onSuccess: done,
    onError: (err) => setError(apiErrorMessage(err, t("marketplace.sell.errDelete"))),
  });

  function onDelete(l: ListingListItem) {
    confirmDestructive({
      title: t("marketplace.sell.deleteTitle"),
      message: `${l.title}\n\n${t("marketplace.sell.deleteConfirm")}`,
      confirmText: t("marketplace.detail.delete"),
      cancelText: t("common.cancel"),
      onConfirm: () => remove.mutate(l.id),
    });
  }

  const actionStyle = { height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row" as const, alignItems: "center" as const, gap: 5 };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t("marketplace.sell.myListings")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("marketplace.sell.subtitle")}</Text>
          </View>
          <Pressable onPress={() => router.push("/post-listing")} style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.brand.green, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Plus size={16} color="#FFF" /><Text variant="label" color="paper">{t("marketplace.postItem")}</Text>
          </Pressable>
        </View>

        {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

        {mine.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} />
        ) : listings.length === 0 ? (
          <View style={{ alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 24 }}>
            <Package size={26} strokeWidth={1.5} color={colors.muted} />
            <Text variant="label" color="ink" style={{ marginTop: 10 }}>{t("marketplace.sell.nothingListed")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 4, textAlign: "center", lineHeight: 18 }}>{t("marketplace.sell.nothingListedBody")}</Text>
          </View>
        ) : (
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
            {listings.map((l, i) => {
              const busy = (renew.isPending && renew.variables === l.id) || (remove.isPending && remove.variables === l.id);
              return (
                <View key={l.id} style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
                  <Pressable onPress={() => router.push({ pathname: "/listing", params: { id: l.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ height: 56, width: 56, borderRadius: 10, overflow: "hidden", backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
                      {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Package size={18} strokeWidth={1.5} color={colors.muted} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" color="ink" numberOfLines={1}>{l.title}</Text>
                      <Text variant="label" style={{ color: colors.brand.red }}>{money(l.price, l.currency)}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text variant="caption" color="muted">{shortDate(l.created_at)}</Text>
                        {l.is_featured ? <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Star size={9} color="#B45309" /><Text variant="caption" style={{ color: "#B45309", fontSize: 11 }}>{t("marketplace.sell.featuredTag")}</Text></View> : null}
                      </View>
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                    {busy ? <ActivityIndicator color={colors.brand.green} style={{ marginRight: "auto" }} /> : null}
                    <Pressable accessibilityLabel={t("marketplace.sell.editTitle")} onPress={() => router.push({ pathname: "/post-listing", params: { id: l.id } })} style={actionStyle}>
                      <Pencil size={13} color={colors.ink} /><Text variant="caption" color="ink">{t("marketplace.sell.edit")}</Text>
                    </Pressable>
                    <Pressable accessibilityLabel={t("marketplace.sell.renewTitle")} disabled={busy} onPress={() => renew.mutate(l.id)} style={actionStyle}>
                      <RefreshCw size={13} color={colors.ink} /><Text variant="caption" color="ink">{t("marketplace.sell.renew")}</Text>
                    </Pressable>
                    <Pressable accessibilityLabel={t("marketplace.sell.deleteTitle")} disabled={busy} onPress={() => onDelete(l)} style={{ ...actionStyle, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)" }}>
                      <Trash2 size={13} color={colors.danger} /><Text variant="caption" color="danger">{t("marketplace.detail.delete")}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
