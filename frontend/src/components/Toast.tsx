import Feather from "@react-native-vector-icons/feather";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Txt } from "@/src/components/Base";
import { colors, radius, softShadow, spacing } from "@/src/theme/tokens";

type Tone = "calm" | "moderate" | "critical";
type ToastValue = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = "calm") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const accent =
    toast?.tone === "critical"
      ? colors.accentCritical
      : toast?.tone === "moderate"
        ? colors.accentModerate
        : colors.brandSecondary;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          testID="app-toast"
          entering={FadeInDown.duration(350)}
          exiting={FadeOutUp.duration(350)}
          pointerEvents="none"
          style={[styles.wrap, softShadow, { top: insets.top + spacing.sm }]}
        >
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Feather name="check-circle" size={16} color={accent} />
          <Txt variant="bodyMedium" style={{ flex: 1 }}>
            {toast.message}
          </Txt>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: { width: 4, height: 24, borderRadius: radius.pill },
});
