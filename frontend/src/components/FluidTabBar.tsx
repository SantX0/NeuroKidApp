import Feather from "@react-native-vector-icons/feather";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Txt } from "@/src/components/Base";
import { useTheme } from "@/src/theme/ThemeContext";
import { radius, spacing } from "@/src/theme/tokens";

type IconName = React.ComponentProps<typeof Feather>["name"];
const ICONS: Record<string, IconName> = {
  index: "home",
  alerts: "bell",
  library: "feather",
  report: "activity",
  settings: "sliders",
};

/** Barra inferior com indicador que desliza em spring entre as abas e ícone que "salta" ao ativar. */
export function FluidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(state.index * slot, { damping: 17, stiffness: 190, mass: 0.8 });
  }, [state.index, slot, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const active = isDark ? colors.accentActive : colors.brandPrimary;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 0 : spacing.sm),
        },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.slot, { width: slot }, indicator]}>
        <View style={[styles.pill, { backgroundColor: `${colors.accentActive}2E` }]} />
      </Animated.View>

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <TabItem
            key={route.key}
            testID={`tab-${route.name}`}
            icon={ICONS[route.name] ?? "circle"}
            label={label}
            focused={focused}
            color={focused ? active : colors.textMuted}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  icon, label, focused, color, onPress, testID,
}: {
  icon: IconName; label: string; focused: boolean; color: string; onPress: () => void; testID: string;
}) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 11, stiffness: 220 });
  }, [focused, lift]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * lift.value }, { scale: 1 + 0.14 * lift.value }],
  }));

  return (
    <Pressable testID={testID} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityState={{ selected: focused }}>
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Feather name={icon} size={20} color={color} />
      </Animated.View>
      <Txt variant="caption" color={color} style={{ fontSize: 11, marginTop: 2 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: spacing.sm },
  slot: { position: "absolute", top: spacing.sm, left: 0, alignItems: "center" },
  pill: { width: 56, height: 32, borderRadius: radius.pill },
  item: { flex: 1, alignItems: "center", paddingVertical: 2 },
  iconWrap: { height: 32, alignItems: "center", justifyContent: "center" },
});
