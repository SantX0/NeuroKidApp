import * as Haptics from "expo-haptics";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from "react-native";

import { colors, radius, softShadow, spacing, type } from "@/src/theme/tokens";

type Variant = "display" | "h1" | "h2" | "body" | "bodyMedium" | "caption";

export function Txt({
  variant = "body",
  color = colors.textPrimary,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[type[variant], { color }, style]} />;
}

export function Card({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, softShadow, style]}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  bg = colors.surfaceSecondary,
  color = colors.textPrimary,
  testID,
}: {
  label: string;
  bg?: string;
  color?: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: bg }]}>
      <Txt variant="caption" color={color}>
        {label}
      </Txt>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  tone = "primary",
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: "primary" | "soft" | "outline";
  testID?: string;
  style?: ViewStyle;
}) {
  const bg =
    tone === "primary"
      ? colors.brandPrimary
      : tone === "soft"
        ? colors.surfaceSecondary
        : "transparent";
  const fg = tone === "primary" ? colors.onBrand : colors.brandPrimary;
  const isOff = disabled || loading;

  return (
    <Pressable
      testID={testID}
      disabled={isOff}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: tone === "outline" ? 1 : 0,
          borderColor: colors.borderStrong,
          opacity: isOff ? 0.55 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Txt variant="h2" color={fg}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ paddingHorizontal: spacing.xl, marginBottom: spacing.md }, style]}>
      <Txt variant="h1">{children}</Txt>
    </View>
  );
}

export function ProgressBar({
  ratio,
  color = colors.brandSecondary,
  testID,
}: {
  ratio: number;
  color?: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${Math.max(3, Math.min(100, ratio * 100))}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  button: {
    minHeight: 52,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
    overflow: "hidden",
  },
  fill: { height: 10, borderRadius: radius.pill },
});
