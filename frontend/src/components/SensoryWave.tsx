import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors } from "@/src/theme/tokens";

/** Smooth minimal wave chart of today's sensory load samples. */
export function SensoryWave({
  points,
  width,
  height = 96,
  testID,
}: {
  points: number[];
  width: number;
  height?: number;
  testID?: string;
}) {
  const { line, area } = useMemo(() => {
    const data = points.length >= 2 ? points : [22, 30, 26, 34, 28, 38, 30];
    const max = 100;
    const stepX = width / (data.length - 1);
    const coords = data.map((v, i) => ({
      x: i * stepX,
      y: height - (Math.max(4, Math.min(max, v)) / max) * (height - 8) - 4,
    }));

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const cur = coords[i];
      const next = coords[i + 1];
      const midX = (cur.x + next.x) / 2;
      d += ` C ${midX} ${cur.y} ${midX} ${next.y} ${next.x} ${next.y}`;
    }
    return {
      line: d,
      area: `${d} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`,
    };
  }, [points, width, height]);

  return (
    <View testID={testID}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brandTertiary} stopOpacity="0.28" />
            <Stop offset="1" stopColor={colors.brandTertiary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#waveFill)" />
        <Path
          d={line}
          stroke={colors.brandPrimaryLight}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
