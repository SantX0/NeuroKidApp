import { ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { useTheme } from "@/src/theme/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anel de progresso do tempo de tela: gradiente verde-escuro→verde; amarelo a partir de 70% e vermelho a partir de 90%. */
export function ProgressRing({
  ratio,
  size = 184,
  stroke = 14,
  children,
  testID,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, ratio)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const stroked =
    ratio >= 0.9 ? colors.accentCritical : ratio >= 0.7 ? colors.accentModerate : "url(#ringGradient)";

  return (
    <View testID={testID} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brandSecondary} />
            <Stop offset="1" stopColor={colors.accentActive} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.divider} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroked}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}
