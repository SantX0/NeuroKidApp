import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Dashboard } from "@/src/api/client";
import { Card, Pill, PrimaryButton, ProgressBar, Txt } from "@/src/components/Base";
import { ChildSwitcher } from "@/src/components/ChildSwitcher";
import { SensoryWave } from "@/src/components/SensoryWave";
import { ShieldBadge } from "@/src/components/ShieldBadge";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { colors, formatMinutes, radius, spacing, toneColor } from "@/src/theme/tokens";

const CARD_WIDTH = Dimensions.get("window").width - spacing.xl * 2 - spacing.lg * 2;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { children: kids, activeChild, setActiveChildId, refreshChildren, signOut, parent } =
    useAuth();

  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeChild) return;
    try {
      setError("");
      const res = await api.get<Dashboard>(`/children/${activeChild.id}/dashboard`);
      setData(res);
    } catch {
      setError("Não conseguimos falar com o motor de proteção agora.");
    }
  }, [activeChild]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshChildren()]);
    setRefreshing(false);
  };

  const toggleShield = async () => {
    if (!activeChild) return;
    const next = !(data?.shield_active ?? activeChild.shield_active);
    await api.patch(`/children/${activeChild.id}/shield`, { shield_active: next });
    await Promise.all([load(), refreshChildren()]);
    toast.show(
      next ? "Escudo retomado silenciosamente." : "Escudo pausado por enquanto.",
      next ? "calm" : "moderate",
    );
  };

  const takeBreak = async () => {
    if (!activeChild) return;
    const res = await api.post<{ break_minutes: number }>(
      `/children/${activeChild.id}/screen-break`,
    );
    toast.show(`Pausa gentil de ${res.break_minutes} minutos iniciada.`, "calm");
    load();
  };

  const shieldOn = data?.shield_active ?? activeChild?.shield_active ?? true;
  const tone = data?.sensory.status_tone ?? "calm";

  return (
    <View style={styles.root} testID="dashboard-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" color={colors.textMuted}>
              QUE BOM TE VER
            </Txt>
            <Txt variant="h1">{activeChild ? `Dia de ${activeChild.name}` : "NeuroKid"}</Txt>
          </View>
          <Pressable
            testID="shield-toggle-button"
            onPress={toggleShield}
            style={[
              styles.statusChip,
              {
                backgroundColor: shieldOn ? "#2A9D8F1A" : colors.surfaceSecondary,
                borderColor: shieldOn ? colors.brandSecondary : colors.border,
              },
            ]}
          >
            <Feather
              name={shieldOn ? "shield" : "shield-off"}
              size={14}
              color={shieldOn ? colors.brandSecondary : colors.textMuted}
            />
            <Txt variant="caption" color={shieldOn ? colors.brandPrimary : colors.textMuted}>
              {shieldOn ? "Escudo ativo" : "Pausado"}
            </Txt>
          </Pressable>
          {parent?.picture ? (
            <Image
              testID="parent-avatar"
              source={{ uri: parent.picture }}
              style={styles.avatar}
              contentFit="cover"
              transition={350}
            />
          ) : null}
          <Pressable testID="sign-out-button" onPress={signOut} hitSlop={10} style={styles.iconBtn}>
            <Feather name="log-out" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        <ChildSwitcher
          childrenList={kids}
          activeId={activeChild?.id}
          onSelect={setActiveChildId}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandPrimary}
          />
        }
      >
        <ShieldBadge
          testID="ambient-shield-badge"
          active={shieldOn}
          device={data?.protected_device ?? activeChild?.device ?? "Tablet"}
        />

        {error ? (
          <Card testID="dashboard-error">
            <Txt variant="h2">Nada para se preocupar</Txt>
            <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              {error}
            </Txt>
            <PrimaryButton
              testID="dashboard-retry-button"
              tone="soft"
              label="Tentar de novo"
              onPress={load}
              style={{ marginTop: spacing.lg }}
            />
          </Card>
        ) : null}

        <Animated.View entering={FadeInDown.duration(350)}>
          <Card testID="screen-time-card">
            <View style={styles.cardHead}>
              <Txt variant="h2">Tempo de tela hoje</Txt>
              <Pill
                label={activeChild ? `${activeChild.bracket_label} ${activeChild.bracket_range}` : "—"}
                bg={colors.surfaceSecondary}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.metricRow}>
              <Txt variant="display" color={colors.brandPrimary}>
                {formatMinutes(data?.screen_time.minutes ?? 0)}
              </Txt>
              <Txt variant="body" color={colors.textMuted}>
                {` / máx ${formatMinutes(data?.screen_time.limit_minutes ?? 120)}`}
              </Txt>
            </View>
            <ProgressBar
              testID="screen-time-progress"
              ratio={data?.screen_time.ratio ?? 0}
              color={
                (data?.screen_time.ratio ?? 0) > 0.85
                  ? colors.accentModerateDeep
                  : colors.brandSecondary
              }
            />
            <Txt variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
              {`${data?.interventions_today ?? 0} intervenções suaves hoje • ritmo, não punição`}
            </Txt>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <Card testID="sensory-index-card">
            <View style={styles.cardHead}>
              <Txt variant="h2">Índice de carga sensorial</Txt>
              <Pill
                testID="sensory-status-pill"
                label={data?.sensory.status_label ?? "Equilibrado"}
                bg={`${toneColor(tone)}1F`}
                color={colors.textPrimary}
              />
            </View>
            <View style={styles.splitRow}>
              <Stat label="Baixo estímulo" value={`${data?.sensory.low_pct ?? 0}%`} color={colors.brandSecondary} />
              <View style={styles.divider} />
              <Stat label="Moderado" value={`${data?.sensory.moderate_pct ?? 0}%`} color={colors.accentModerateDeep} />
              <View style={styles.divider} />
              <Stat label="Alto" value={`${data?.sensory.high_pct ?? 0}%`} color={colors.accentCritical} />
            </View>
            <View style={{ marginTop: spacing.lg, overflow: "hidden" }}>
              <SensoryWave
                testID="sensory-wave-chart"
                points={(data?.sensory.wave ?? []).map((p) => p.load)}
                width={CARD_WIDTH}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(350)} style={{ gap: spacing.md }}>
          <Txt variant="h1">Ações rápidas</Txt>
          <View style={styles.actionRow}>
            <PrimaryButton
              testID="take-screen-break-button"
              label="Dar uma pausa"
              onPress={takeBreak}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              testID="soft-landing-demo-button"
              tone="outline"
              label="Demo Soft Landing"
              onPress={() => router.push("/soft-landing")}
              style={{ flex: 1 }}
            />
          </View>
          <Pressable
            testID="view-live-activity-button"
            onPress={() => router.push("/(tabs)/alerts")}
            style={styles.liveRow}
          >
            <Feather name="activity" size={18} color={colors.brandPrimary} />
            <View style={{ flex: 1 }}>
              <Txt variant="h2">Ver atividade ao vivo</Txt>
              <Txt variant="caption" color={colors.textMuted}>
                Intervenções, transições e o resumo de hoje
              </Txt>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="h1" color={color}>
        {value}
      </Txt>
      <Txt variant="caption" color={colors.textMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.xs,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metricRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.md },
  splitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  divider: { width: 1, height: 32, backgroundColor: colors.divider },
  actionRow: { flexDirection: "row", gap: spacing.md },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
