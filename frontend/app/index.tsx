import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme/tokens";

export default function Gate() {
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});
