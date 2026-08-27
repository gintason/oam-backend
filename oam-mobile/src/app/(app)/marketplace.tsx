import { View, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Store, Search, Plus, Tag, ChevronRight, ShieldCheck, MessageCircle, Crown } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useAuthStore } from "@/features/auth";
import { marketplaceApi } from "@/features/marketplace/api/marketplace-api";
import { categoryLabel, type ListingListItem } from "@/entities/marketplace";

export default function Marketplace() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const categories = useQuery({ queryKey: ["marketplace", "categories"], queryFn: marketplaceApi.categories });
  const oam = useQuery({ queryKey: ["marketplace", "browse", "oam-motors"], queryFn: () => marketplaceApi.browse({ category: "oam-motors" }) });
  const recent = useQuery({ queryKey: ["marketplace", "browse", "recent"], queryFn: () => marketplaceApi.browse({}) });

  const cats = (categories.data ?? [])
    .map((c) => ({ slug: c.slug, label: categoryLabel(c.slug, c.name) }))
    .sort((a, b) => (a.slug === "oam-motors" ? -1 : b.slug === "oam-motors" ? 1 : 0));

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Store size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}><Text variant="heading">{t("marketplace.hub.title")}</Text><Text variant="caption" color="muted">{t("marketplace.home.subtitle")}</Text></View>
          <Pressable onPress={() => router.push("/messages")} hitSlop={8} style={{ height: 42, width: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={19} strokeWidth={1.75} color={colors.ink} />
          </Pressable>
        </View>

        {/* Primary actions */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={() => router.push("/market-browse")} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
            <View style={{ height: 38, width: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
              <Search size={18} strokeWidth={1.75} color={colors.brand.green} />
            </View>
            <Text variant="label" color="ink" style={{ marginTop: 10 }}>{t("marketplace.hub.browseTitle")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("marketplace.home.browseDesc")}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/post-listing")} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
            <View style={{ height: 38, width: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(227,16,18,0.10)" }}>
              <Plus size={18} strokeWidth={1.75} color={colors.brand.red} />
            </View>
            <Text variant="label" color="ink" style={{ marginTop: 10 }}>{t("marketplace.home.sellTitle")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("marketplace.home.sellDesc")}</Text>
          </Pressable>
        </View>

        {/* Seller plans — bold call-to-action so it reads as a tappable button */}
        <Pressable onPress={() => router.push("/upgrade")} style={{ marginTop: 12, borderRadius: 16, backgroundColor: colors.brand.green, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ height: 42, width: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" }}>
            <Crown size={20} strokeWidth={1.75} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" color="paper">{t("marketplace.upgrade.hubTitle", "Upgrade to Pro")}</Text>
            <Text variant="caption" color="paper" style={{ marginTop: 2, opacity: 0.85 }}>{t("marketplace.upgrade.hubDesc", "List more items and get seen first.")}</Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </Pressable>

        {/* Categories */}
        {cats.length > 0 ? (
          <>
            <Text variant="title" style={{ marginTop: 24, marginBottom: 12 }}>{t("marketplace.home.categories")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {cats.map((c) => (
                <Pressable key={c.slug} onPress={() => router.push({ pathname: "/market-browse", params: { category: c.slug } })} style={{ paddingHorizontal: 16, height: 40, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                  <Tag size={13} color={colors.brand.green} />
                  <Text variant="label" color="ink">{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* O.A.M Motors */}
        <ListingRow title="O.A.M Motors" data={oam.data?.results} loading={oam.isLoading} onSeeAll={() => router.push({ pathname: "/market-browse", params: { category: "oam-motors" } })} onOpen={(id) => router.push({ pathname: "/listing", params: { id } })} />

        {/* Recent */}
        <ListingRow title={t("marketplace.home.recent")} data={recent.data?.results} loading={recent.isLoading} onSeeAll={() => router.push("/market-browse")} onOpen={(id) => router.push({ pathname: "/listing", params: { id } })} />

        {/* Safety note */}
        <View style={{ marginTop: 20, borderRadius: 14, backgroundColor: colors.mist, padding: 14, flexDirection: "row", gap: 8 }}>
          <ShieldCheck size={16} strokeWidth={1.75} color={colors.brand.green} style={{ marginTop: 1 }} />
          <Text variant="caption" color="muted" style={{ flex: 1, lineHeight: 18 }}>
            {t("marketplace.home.safety")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ListingRow({ title, data, loading, onSeeAll, onOpen }: { title: string; data?: ListingListItem[]; loading: boolean; onSeeAll: () => void; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  if (!loading && (!data || data.length === 0)) return null;
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 }}>
        <Text variant="title">{title}</Text>
        <Pressable onPress={onSeeAll} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text variant="caption" color="green">{t("marketplace.home.seeAll")}</Text><ChevronRight size={14} color={colors.brand.green} />
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.brand.green} style={{ alignSelf: "flex-start" }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {data?.slice(0, 8).map((l) => (
            <Pressable key={l.id} onPress={() => onOpen(l.id)} style={{ width: 150, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, overflow: "hidden" }}>
              <View style={{ height: 110, backgroundColor: colors.mist }}>
                {l.primary_image ? <Image source={{ uri: l.primary_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
              </View>
              <View style={{ padding: 10 }}>
                <Text variant="label" color="ink" numberOfLines={1}>{l.title}</Text>
                <Text variant="label" color="red" style={{ marginTop: 2 }}>{naira(l.price)}</Text>
                {l.location ? <Text variant="caption" color="muted" numberOfLines={1} style={{ marginTop: 2 }}>{l.location}</Text> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </>
  );
}
