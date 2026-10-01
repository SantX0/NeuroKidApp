import Feather from "@react-native-vector-icons/feather";
import { Redirect, Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, spacing } from "@/src/theme/tokens";

const TABS = [
  { name: "index", label: "Início", icon: "home" },
  { name: "alerts", label: "Alertas", icon: "bell" },
  { name: "library", label: "Acervo", icon: "feather" },
  { name: "report", label: "Semana", icon: "activity" },
] as const;

export default function TabsLayout() {
  const { ready, parent } = useAuth();
  if (!ready) return null;
  if (!parent) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 66,
          paddingTop: spacing.sm,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, focused }) => (
              <Feather name={tab.icon} size={focused ? 22 : 20} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
