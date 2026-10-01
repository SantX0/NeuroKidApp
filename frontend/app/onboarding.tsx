import Feather from "@react-native-vector-icons/feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton, Txt } from "@/src/components/Base";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, softShadow, spacing } from "@/src/theme/tokens";

const { width } = Dimensions.get("window");

const STEPS = [
  {
    icon: "filter" as const,
    tint: colors.brandPrimary,
    title: "Filtro Cognitivo",
    body:
      "O NeuroKid lê o ritmo do que aparece na tela — cortes de cena, picos de áudio, intensidade de cor. Não é vigilância: nada do que sua criança assiste é gravado.",
    footnote: "Lê o ritmo, não as pessoas",
  },
  {
    icon: "lock" as const,
    tint: colors.brandSecondary,
    title: "Cofre de Privacidade",
    body:
      "Todos os modelos de vídeo rodam no próprio aparelho. O que sai do dispositivo são hashes sem retenção: nunca imagens, nunca rostos, nunca áudio.",
    footnote: "Modelos locais • retenção zero",
  },
  {
    icon: "battery-charging" as const,
    tint: colors.accentModerateDeep,
    title: "Guardião de Bateria",
    body:
      "O motor de proteção dorme entre as verificações sensoriais, mantendo um consumo abaixo de 1% por dia para o tablet durar a tarde inteira.",
    footnote: "Menos de 1% de bateria por dia",
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const advance = async () => {
    if (index < STEPS.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
      return;
    }
    await completeOnboarding();
    router.replace("/auth");
  };

  return (
    <View style={styles.root} testID="onboarding-screen">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xxl }}
      >
        {STEPS.map((step, i) => (
          <View key={step.title} style={[styles.page, { width }]}>
            <Animated.View entering={FadeIn.duration(400)} style={styles.artWrap}>
              <LinearGradient
                colors={[`${step.tint}22`, `${step.tint}05`]}
                style={styles.art}
              >
                <View style={[styles.iconBubble, softShadow]}>
                  <Feather name={step.icon} size={34} color={step.tint} />
                </View>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Txt variant="caption" color={step.tint}>
                {`ETAPA ${i + 1} DE ${STEPS.length}  •  TOUR DO ESCUDO COGNITIVO`}
              </Txt>
              <Txt variant="display" style={{ marginTop: spacing.md }}>
                {step.title}
              </Txt>
              <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.md }}>
                {step.body}
              </Txt>
              <View style={styles.footnote}>
                <Feather name="check" size={14} color={colors.brandSecondary} />
                <Txt variant="caption" color={colors.brandPrimary}>
                  {step.footnote}
                </Txt>
              </View>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                {
                  width: i === index ? 22 : 8,
                  backgroundColor: i === index ? colors.brandPrimary : colors.borderStrong,
                },
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          testID="onboarding-next-button"
          label={index === STEPS.length - 1 ? "Ativar o escudo" : "Continuar"}
          onPress={advance}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  page: { paddingHorizontal: spacing.xl },
  artWrap: { marginBottom: spacing.xxl },
  art: {
    height: 220,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubble: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingTop: spacing.lg },
  dots: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  dot: { height: 8, borderRadius: radius.pill },
});
