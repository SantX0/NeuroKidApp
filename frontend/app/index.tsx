import { useMemo } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";
import type { Palette } from "@/src/theme/tokens";
import { useAuth } from "@/src/context/AuthContext";

export default function Gate() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { ready, parent, onboarded } = useAuth();

  if (!ready) {
    return (
      <View testID="boot-loader" style={styles.center}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!parent) return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)" />;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});
