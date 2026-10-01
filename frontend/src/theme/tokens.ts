// NeuroKid design tokens — mirrors /app/design_guidelines.json exactly.
import { Platform, TextStyle, ViewStyle } from "react-native";

export const colors = {
  surface: "#FFFFFF",
  surfaceSecondary: "#F8F9FA",
  surfaceInverse: "#212529",
  brandPrimary: "#145C68",
  brandPrimaryLight: "#1B7A82",
  brandSecondary: "#2A9D8F",
  brandTertiary: "#48A9A6",
  accentModerate: "#E9C46A",
  accentModerateDeep: "#F4A261",
  accentCritical: "#E76F51",
  textPrimary: "#212529",
  textMuted: "#6C757D",
  onBrand: "#FFFFFF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  extrabold: "PlusJakartaSans-ExtraBold",
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 },
  h2: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
};

// 0px 8px 24px rgba(20, 92, 104, 0.06)
export const softShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#145C68",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  android: { elevation: 3, shadowColor: "#145C68" },
  default: {
    // @ts-expect-error web-only shadow string
    boxShadow: "0px 8px 24px rgba(20, 92, 104, 0.06)",
  },
}) as ViewStyle;

export const MOTION = 350;

export const toneColor = (tone: string): string => {
  if (tone === "critical") return colors.accentCritical;
  if (tone === "moderate") return colors.accentModerate;
  return colors.brandSecondary;
};

export const BRACKETS = [
  { key: "all", label: "Todas as idades" },
  { key: "toddler", label: "Bebês 2-4" },
  { key: "explorer", label: "Exploradores 5-8" },
  { key: "preteen", label: "Pré-adolescentes 9-12" },
] as const;

export const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

export const weekdayPt = (isoDate: string): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS_PT[new Date(y, m - 1, d).getDay()];
};

export const formatMinutes = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};
