import { Redirect, Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { FluidTabBar } from "@/src/components/FluidTabBar";

const TABS = [
  { name: "index", label: "Início", icon: "home" },
  { name: "alerts", label: "Alertas", icon: "bell" },
  { name: "library", label: "Acervo", icon: "feather" },
  { name: "report", label: "Semana", icon: "activity" },
  { name: "settings", label: "Ajustes", icon: "sliders" },
] as const;

export default function TabsLayout() {
  const { ready, parent } = useAuth();
  if (!ready) return null;
  if (!parent) return <Redirect href="/auth" />;

  return (
    <Tabs
      tabBar={(props) => <FluidTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
          }}
        />
      ))}
    </Tabs>
  );
}
