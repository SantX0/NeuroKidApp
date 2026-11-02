import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { ReactNode, useMemo } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { Card, PrimaryButton, Txt } from "@/src/components/Base";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/theme/ThemeContext";
import type { Palette } from "@/src/theme/tokens";
import { radius, spacing } from "@/src/theme/tokens";

export default function SettingsScreen() {
  const { colors, isDark, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { parent, activeChild, refreshChildren, signOut } = useAuth();

  const toggleShield = async (next: boolean) => {
    if (!activeChild) return;
    await api.patch(`/children/${activeChild.id}/shield`, { shield_active: next });
    await refreshChildren();
    toast.show(next ? "Escudo ativo." : "Escudo pausado por enquanto.", next ? "calm" : "moderate");
  };

  return (
    <View style={styles.root} testID="settings-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Txt variant="h1">Controles dos pais</Txt>
        <Txt variant="caption" color={colors.textMuted}>
          {parent?.name ?? "Sua conta"}
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card testID="appearance-card">
          <Txt variant="h2" style={{ marginBottom: spacing.sm }}>Aparência</Txt>
          <Row
            icon={isDark ? "moon" : "sun"}
            title="Modo escuro"
            hint={preference === "system" ? "Seguindo o tema do aparelho" : isDark ? "Fundo azul-acinzentado" : "Fundo branco"}
            right={
              <Switch
                testID="theme-toggle-switch"
                value={isDark}
                onValueChange={(v) => setPreference(v ? "dark" : "light")}
                trackColor={{ false: colors.borderStrong, true: colors.accentActive }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <Row
            icon="smartphone"
            title="Usar tema do aparelho"
            right={
              <Switch
                testID="theme-system-switch"
                value={preference === "system"}
                onValueChange={(v) => setPreference(v ? "system" : isDark ? "dark" : "light")}
                trackColor={{ false: colors.borderStrong, true: colors.accentActive }}
                thumbColor="#FFFFFF"
              />
            }
            last
          />
        </Card>

        <Card testID="protection-card">
          <Txt variant="h2" style={{ marginBottom: spacing.sm }}>Proteção</Txt>
          <Row
            icon="shield"
            title="Escudo ativo"
            hint={activeChild ? `Protegendo ${activeChild.name}` : "Adicione uma criança para começar"}
            right={
              <Switch
                testID="shield-switch"
                disabled={!activeChild}
                value={activeChild?.shield_active ?? false}
                onValueChange={toggleShield}
                trackColor={{ false: colors.borderStrong, true: colors.accentActive }}
                thumbColor="#FFFFFF"
              />
            }
            last
          />
        </Card>

        <PrimaryButton testID="add-child-button" tone="soft" label="Adicionar criança" onPress={() => router.push("/add-child")} />
        <PrimaryButton testID="settings-sign-out" tone="outline" label="Sair da conta" onPress={signOut} />
      </ScrollView>
    </View>
  );

  function Row({ icon, title, hint, right, last }: { icon: React.ComponentProps<typeof Feather>["name"]; title: string; hint?: string; right: ReactNode; last?: boolean }) {
    return (
      <View style={[styles.row, !last && styles.rowDivider]}>
        <View style={styles.rowIcon}>
          <Feather name={icon} size={18} color={isDark ? colors.accentActive : colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyMedium">{title}</Txt>
          {hint ? <Txt variant="caption" color={colors.textMuted}>{hint}</Txt> : null}
        </View>
        {right}
      </View>
    );
  }
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  });
