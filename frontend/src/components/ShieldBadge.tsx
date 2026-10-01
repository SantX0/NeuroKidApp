import Feather from "@react-native-vector-icons/feather";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Txt } from "@/src/components/Base";
import { colors, radius, spacing } from "@/src/theme/tokens";

/** Ambient protection badge — slow 4s breathing pulse. */
export function ShieldBadge({
  active,
  device,
  testID,
}: {
  active: boolean;
  device: string;
  testID?: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [active, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
    transform: [{ scale: 0.85 + pulse.value * 0.5 }],
  }));

  return (
    <View testID={testID} style={styles.wrap}>
      <View style={styles.dotWrap}>
        <Animated.View
          style={[
            styles.halo,
            dotStyle,
            { backgroundColor: active ? colors.brandSecondary : colors.textMuted },
          ]}
        />
        <View
          style={[
            styles.dot,
            { backgroundColor: active ? colors.brandSecondary : colors.textMuted },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="h2" color={colors.brandPrimary}>
          {active ? "NeuroKid ativo em segundo plano" : "Escudo pausado"}
        </Txt>
        <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
          {active
            ? `Protegendo o ${device} • menos de 1% de bateria`
            : "Toque no escudo para retomar"}
        </Txt>
      </View>
      <Feather
        name={active ? "shield" : "shield-off"}
        size={18}
        color={active ? colors.brandSecondary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  dotWrap: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 26, height: 26, borderRadius: radius.pill },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
});
