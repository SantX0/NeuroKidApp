import Feather from "@react-native-vector-icons/feather";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, WeeklyReport } from "@/src/api/client";
import { Card, Pill, PrimaryButton, Txt } from "@/src/components/Base";
import { ChildSwitcher } from "@/src/components/ChildSwitcher";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { colors, formatMinutes, radius, spacing, weekdayPt } from "@/src/theme/tokens";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { children: kids, activeChild, setActiveChildId } = useAuth();

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeChild) return;
    const res = await api.get<WeeklyReport>(`/children/${activeChild.id}/weekly-report`);
    setReport(res);
    setSelected(res.activities[0]?.title ?? null);
    setLoading(false);
  }, [activeChild]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const schedule = async () => {
    if (!activeChild || !selected) return;
    await api.post(`/children/${activeChild.id}/offline-reminder`, {
      activity_title: selected,
      at_hour: 17,
    });
    toast.show(`${selected} agendada para as 17:00 de hoje.`, "calm");
  };

  const maxMinutes = Math.max(1, ...(report?.days ?? []).map((d) => d.minutes));
  const down = (report?.delta_pct ?? 0) <= 0;

  return (
    <View style={styles.root} testID="report-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Txt variant="h1">Saúde cognitiva semanal</Txt>
          <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            Últimos 7 dias • apoio, nunca boletim
          </Txt>
        </View>
        <ChildSwitcher childrenList={kids} activeId={activeChild?.id} onSelect={setActiveChildId} />
      </View>

      {loading ? (
        <View style={styles.center} testID="report-loading">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card testID="weekly-summary-card">
              <Txt variant="caption" color={colors.textMuted}>
                TOTAL DE HORAS DE TELA
              </Txt>
              <View style={styles.metricRow}>
                <Txt variant="display" color={colors.brandPrimary}>
                  {formatMinutes(report?.total_minutes ?? 0)}
                </Txt>
                <View
                  style={[
                    styles.deltaPill,
                    { backgroundColor: down ? `${colors.brandSecondary}1F` : `${colors.accentModerate}33` },
                  ]}
                >
                  <Feather
                    name={down ? "trending-down" : "trending-up"}
                    size={13}
                    color={down ? colors.brandPrimary : "#8A6A16"}
                  />
                  <Txt variant="caption" color={down ? colors.brandPrimary : "#8A6A16"}>
                    {`${Math.abs(report?.delta_pct ?? 0)}% vs semana passada`}
                  </Txt>
                </View>
              </View>

              <View style={styles.rowStats}>
                <View style={{ flex: 1 }}>
                  <Txt variant="h1" color={colors.accentCritical}>
                    {report?.spikes_intercepted ?? 0}
                  </Txt>
                  <Txt variant="caption" color={colors.textMuted}>
                    Picos sensoriais interceptados
                  </Txt>
                </View>
                <View style={styles.vDivider} />
                <View style={{ flex: 1 }}>
                  <Txt variant="h1" color={colors.brandSecondary}>
                    {`${report?.balance_score ?? 0} / 100`}
                  </Txt>
                  <Txt variant="caption" color={colors.textMuted}>
                    {`Equilíbrio cognitivo • ${report?.balance_label ?? "—"}`}
                  </Txt>
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Card testID="weekly-bars-card">
              <Txt variant="h2">Ritmo diário</Txt>
              <View style={styles.bars}>
                {(report?.days ?? []).map((day) => (
                  <View key={day.date} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(6, (day.minutes / maxMinutes) * 100)}%`,
                            backgroundColor:
                              day.avg_load >= 65
                                ? colors.accentModerateDeep
                                : colors.brandTertiary,
                          },
                        ]}
                      />
                    </View>
                    <Txt variant="caption" color={colors.textMuted}>
                      {weekdayPt(day.date)}
                    </Txt>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(350)} style={{ gap: spacing.md }}>
            <Txt variant="h1">Atividades offline recomendadas</Txt>
            {(report?.activities ?? []).map((activity) => {
              const active = activity.title === selected;
              return (
                <Pressable
                  key={activity.title}
                  testID={`activity-${activity.title.replace(/\s+/g, "-").toLowerCase()}`}
                  onPress={() => setSelected(activity.title)}
                  style={[
                    styles.activity,
                    {
                      borderColor: active ? colors.brandSecondary : colors.border,
                      backgroundColor: active ? `${colors.brandSecondary}0F` : colors.surface,
                    },
                  ]}
                >
                  <View style={styles.activityIcon}>
                    <Feather
                      name={activity.icon as React.ComponentProps<typeof Feather>["name"]}
                      size={16}
                      color={colors.brandPrimary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h2">{activity.title}</Txt>
                    <Txt variant="caption" color={colors.textMuted}>
                      {activity.why}
                    </Txt>
                  </View>
                  <Pill label={`${activity.minutes}m`} bg={colors.surfaceSecondary} color={colors.textMuted} />
                </Pressable>
              );
            })}
            <PrimaryButton
              testID="schedule-reminder-button"
              label="Agendar lembrete offline"
              onPress={schedule}
            />
          </Animated.View>
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  rowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  vDivider: { width: 1, height: 40, backgroundColor: colors.divider },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  barCol: { flex: 1, alignItems: "center", gap: spacing.sm },
  barTrack: {
    width: "100%",
    height: 96,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: radius.sm },
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
