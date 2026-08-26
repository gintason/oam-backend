import { View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Home as HomeIcon, Wallet as WalletIcon, Store as StoreIcon, User as UserIcon, type LucideIcon } from "lucide-react-native";
import { useAuthStore } from "@/features/auth";
import { colors, fonts } from "@/shared/theme";

const BAR_BG = "#0a0a0a";
const INACTIVE = "rgba(255,255,255,0.55)";

function TabBarBackground() {
  return (
    <View style={{ flex: 1, backgroundColor: BAR_BG }}>
      <View style={{ flexDirection: "row", height: 4 }}>
        <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
      </View>
    </View>
  );
}

function TabIcon({ Icon, color, focused }: { Icon: LucideIcon; color: string; focused: boolean }) {
  return (
    <View
      style={{
        height: 30,
        width: 48,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(11,115,39,0.28)" : "transparent",
      }}
    >
      <Icon color={color} size={20} strokeWidth={focused ? 2.1 : 1.75} />
    </View>
  );
}

export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  if (status !== "authenticated") return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: INACTIVE,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          elevation: 0,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <TabIcon Icon={HomeIcon} color={color} focused={focused} /> }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet", tabBarIcon: ({ color, focused }) => <TabIcon Icon={WalletIcon} color={color} focused={focused} /> }} />
      <Tabs.Screen name="marketplace" options={{ title: "Market", tabBarIcon: ({ color, focused }) => <TabIcon Icon={StoreIcon} color={color} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, focused }) => <TabIcon Icon={UserIcon} color={color} focused={focused} /> }} />

      {/* Service screens — navigable, hidden from the tab bar, tab bar hidden while open. */}
      <Tabs.Screen name="airtime" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="data" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="electricity" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="cable" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="fund" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="transfer" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="withdraw" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="giftcards" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="flights" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="hotels" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="carhire" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="pickup" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="market-browse" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="listing" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="post-listing" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="messages" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="thread" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="artisans" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="artisans-find" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="artisan" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="artisan-register" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="artisan-verify" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="ecommerce" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="ecommerce-company" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="upgrade" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="boost" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
