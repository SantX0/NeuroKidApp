import * as Haptics from "expo-haptics";
import { ReactNode, useMemo } from "react";
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

import { useTheme } from "@/src/theme/ThemeContext";
import type { Palette } from "@/src/theme/tokens";
import { radius, softShadow, spacing, toneColor, type } from "@/src/theme/tokens";

type Variant = "display" | "h1" | "h2" | "body" | "bodyMedium" | "caption";

export function Txt({
  variant = "body",
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const { colors } = useTheme();
  return <Text {...rest} style={[type[variant], { color: color ?? colors.textPrimary }, style]} />;
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View testID={testID} style={[styles.card, softShadow, style]}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  bg: bgProp,
  color: colorProp,
  testID,
}: {
  label: string;
  bg?: string;
  color?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bg = bgProp ?? colors.surfaceSecondary;
  const color = colorProp ?? colors.textPrimary;
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: bg }]}>
      <Txt variant="caption" color={color}>
        {label}
      </Txt>
    </View>
  );
}

/** Selo de status em três tons: verde-escuro (calmo), amarelo (moderado) e vermelho (crítico). */
export function StatusBadge({
  tone,
  label,
  testID,
}: {
  tone: "calm" | "moderate" | "critical";
  label: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const c = toneColor(tone, colors);
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: `${c}26`,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
      <Txt variant="caption">{label}</Txt>
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  color: colorProp,
  testID,
}: {
  ratio: number;
  color?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const color = colorProp ?? colors.brandSecondary;
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
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
