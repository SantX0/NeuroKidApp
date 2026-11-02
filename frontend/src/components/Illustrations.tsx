import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/src/theme/ThemeContext";

type KidProps = {
  x: number;
  y: number;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  scale?: number;
  armUp?: "left" | "right" | "both" | "none";
};

/** Criança em vetor plano. (x, y) = centro dos pés. */
function Kid({ x, y, skin, hair, shirt, pants, scale = 1, armUp = "none" }: KidProps) {
  const left = armUp === "left" || armUp === "both" ? "M-14 -64 L-30 -92" : "M-14 -64 L-24 -40";
  const right = armUp === "right" || armUp === "both" ? "M14 -64 L30 -92" : "M14 -64 L24 -40";
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect x={-13} y={-36} width={11} height={34} rx={5.5} fill={pants} />
      <Rect x={2} y={-36} width={11} height={34} rx={5.5} fill={pants} />
      <Ellipse cx={-9} cy={-1} rx={10} ry={4.5} fill="#2B3A35" />
      <Ellipse cx={9} cy={-1} rx={10} ry={4.5} fill="#2B3A35" />
      <Path d={left} stroke={skin} strokeWidth={9} strokeLinecap="round" />
      <Path d={right} stroke={skin} strokeWidth={9} strokeLinecap="round" />
      <Rect x={-17} y={-74} width={34} height={44} rx={15} fill={shirt} />
      <Circle cx={0} cy={-92} r={16} fill={skin} />
      <Path d="M-16 -92 C-17 -112 17 -112 16 -92 C10 -100 -10 -100 -16 -92 Z" fill={hair} />
      <Circle cx={-5.5} cy={-90} r={1.8} fill="#2B3A35" />
      <Circle cx={5.5} cy={-90} r={1.8} fill="#2B3A35" />
      <Path d="M-4.5 -84 Q0 -80 4.5 -84" stroke="#2B3A35" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** Cena: três crianças brincando fora da tela (bola, pipa e blocos), com cores do tema atual. */
export function KidsPlayingScene({ width = 320, testID }: { width?: number; testID?: string }) {
  const { colors } = useTheme();
  const height = (width * 200) / 320;
  const ground = 168;

  return (
    <Svg testID={testID} width={width} height={height} viewBox="0 0 320 200">
      {/* sol e nuvem */}
      <Circle cx={272} cy={34} r={24} fill={colors.accentModerate} opacity={0.25} />
      <Circle cx={272} cy={34} r={15} fill={colors.accentModerate} />
      <Ellipse cx={62} cy={36} rx={22} ry={9} fill={colors.divider} />
      <Ellipse cx={78} cy={30} rx={14} ry={9} fill={colors.divider} />

      {/* colinas */}
      <Path d="M0 160 Q80 128 160 154 T320 146 L320 200 L0 200 Z" fill={colors.brandSecondary} opacity={0.18} />
      <Path d="M0 178 Q100 156 200 176 T320 170 L320 200 L0 200 Z" fill={colors.brandSecondary} opacity={0.32} />

      {/* pipa: pelo fio da criança do meio */}
      <Path d="M176 78 Q198 76 216 62" stroke={colors.textMuted} strokeWidth={1.4} fill="none" />
      <Path d="M216 14 L232 38 L216 62 L200 38 Z" fill="#F08A5D" />
      <Path d="M216 14 L216 62 M200 38 L232 38" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.8} />
      <Path d="M216 62 Q224 72 216 80 Q208 88 216 96" stroke={colors.accentModerate} strokeWidth={2.4} strokeLinecap="round" fill="none" />

      {/* blocos empilhados */}
      <Rect x={212} y={ground - 18} width={18} height={18} rx={3} fill={colors.accentModerate} />
      <Rect x={231} y={ground - 18} width={18} height={18} rx={3} fill="#F08A5D" />
      <Rect x={221} y={ground - 36} width={18} height={18} rx={3} fill={colors.brandSecondary} />

      {/* bola */}
      <Circle cx={112} cy={ground - 9} r={10} fill="#FFFFFF" stroke={colors.brandPrimary} strokeWidth={1.6} />
      <Circle cx={112} cy={ground - 9} r={3.6} fill={colors.brandPrimary} />

      {/* crianças */}
      <Kid x={64} y={ground} skin="#F1C27D" hair="#3B2A20" shirt={colors.accentModerate} pants="#2F4B7C" armUp="both" />
      <Kid x={150} y={ground} skin="#C68642" hair="#1F1A17" shirt={colors.brandSecondary} pants="#4A5568" armUp="right" />
      <Kid x={272} y={ground} skin="#8D5524" hair="#1F1A17" shirt="#F08A5D" pants="#2B6E55" scale={0.85} armUp="left" />

      {/* chão */}
      <Line x1={0} y1={ground + 1} x2={320} y2={ground + 1} stroke={colors.brandSecondary} strokeWidth={2} opacity={0.5} />
    </Svg>
  );
}
