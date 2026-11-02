import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, Palette } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

export type ThemePreference = "light" | "dark" | "system";
const THEME_KEY = "neurokid_theme_preference";

type ThemeValue = {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    storage.getItem<string>(THEME_KEY, "system").then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") setPref(saved);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    storage.setItem(THEME_KEY, p);
  }, []);

  const isDark = preference === "system" ? system === "dark" : preference === "dark";

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      preference,
      setPreference,
      toggle: () => setPreference(isDark ? "light" : "dark"),
    }),
    [isDark, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
