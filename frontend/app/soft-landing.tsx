import Feather from "@react-native-vector-icons/feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { PrimaryButton, ProgressBar, Txt } from "@/src/components/Base";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

const TOTAL = 12;

/**
 * Soft-Landing Protocol — the child-facing 12s interruption.
 * Audio fades, saturation cools, a 4s breathing circle invites the pause.
 */
export default function SoftLanding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeChild } = useAuth();

  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState("Esfriando a tela");
  const logged = useRef(false);
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [breathe]);

  useEffect(() => {
    if (activeChild && !logged.current) {
      logged.current = true;
      api
        .post(`/children/${activeChild.id}/soft-landing`, {
          trigger: "manual_demo",
          cuts_per_minute: 9.5,
        })
        .catch(() => undefined);
    }
  }, [activeChild]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next === 4) setPhase("Baixando o áudio com calma");
        if (next === 8) setPhase("Convidando a uma respiração lenta");
        if (next >= TOTAL) {
          clearInterval(timer);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setPhase("Pronto para algo mais lento");
        }
        return Math.min(next, TOTAL);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.82 + breathe.value * 0.26 }],
    opacity: 0.5 + breathe.value * 0.5,
  }));

  const done = seconds >= TOTAL;
  const cool = seconds / TOTAL;

  return (
    <View style={styles.root} testID="soft-landing-screen">
      <LinearGradient
        colors={[
          `rgba(20, 92, 104, ${0.86 + cool * 0.1})`,
          `rgba(42, 157, 143, ${0.5 - cool * 0.32})`,
          "rgba(20, 92, 104, 0.96)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeIn.duration(350)} style={{ alignItems: "center" }}>
          <Txt variant="caption" color="rgba(255,255,255,0.72)">
            PROTOCOLO SOFT LANDING
          </Txt>
          <Txt variant="h1" color={colors.onBrand} style={{ marginTop: spacing.sm }}>
            {`Vamos desacelerar juntos`}
          </Txt>
        </Animated.View>

        <View style={styles.breathWrap}>
          <Animated.View style={[styles.halo, circleStyle]} />
          <View style={styles.core}>
            <Txt variant="display" color={colors.onBrand}>
              {String(Math.max(0, TOTAL - seconds))}
            </Txt>
            <Txt variant="caption" color="rgba(255,255,255,0.75)">
              segundos
            </Txt>
          </View>
        </View>

        <View style={{ width: "100%", gap: spacing.md }}>
          <Txt variant="h2" color={colors.onBrand} style={{ textAlign: "center" }}>
            {phase}
          </Txt>
          <ProgressBar testID="soft-landing-progress" ratio={cool} color={colors.brandTertiary} />
          <View style={styles.stepRow}>
            {["Saturação esfria", "Áudio diminui", "Pausa de respiração"].map((label, i) => (
              <View key={label} style={styles.step}>
                <Feather
                  name={seconds >= i * 4 ? "check-circle" : "circle"}
                  size={13}
                  color={seconds >= i * 4 ? colors.brandTertiary : "rgba(255,255,255,0.4)"}
                />
                <Txt variant="caption" color="rgba(255,255,255,0.75)">
                  {label}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <View style={{ width: "100%", gap: spacing.md }}>
          <PrimaryButton
            testID="soft-landing-slow-content-button"
            label="Trocar por Slow Content"
            tone="primary"
            disabled={!done}
            onPress={() => router.replace("/(tabs)/library")}
            style={{ backgroundColor: colors.brandSecondary }}
          />
          <Pressable
            testID="soft-landing-close-button"
            onPress={() => router.back()}
            style={styles.close}
          >
            <Txt variant="caption" color="rgba(255,255,255,0.8)">
              {done ? "Voltar ao painel" : "Pular a aterrissagem"}
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandPrimary },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "space-between",
  },
  breathWrap: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  halo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  core: {
    width: 130,
    height: 130,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  close: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
