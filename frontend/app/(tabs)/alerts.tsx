import Feather from "@react-native-vector-icons/feather";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlertFeed, AlertItem, api } from "@/src/api/client";
import { Card, Pill, Txt } from "@/src/components/Base";
import { ChildSwitcher } from "@/src/components/ChildSwitcher";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

const severityMeta = (severity: string) => {
  if (severity === "critical") {
    return { bg: `${colors.accentCritical}1F`, color: colors.accentCritical, icon: "pause-circle" as const };
  }
  if (severity === "moderate") {
    return { bg: `${colors.accentModerate}33`, color: "#8A6A16", icon: "sunset" as const };
  }
  return { bg: `${colors.brandSecondary}1F`, color: colors.brandPrimary, icon: "moon" as const };
};

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { children: kids, activeChild, setActiveChildId } = useAuth();

  const [feed, setFeed] = useState<AlertFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeChild) return;
    const res = await api.get<AlertFeed>(`/children/${activeChild.id}/alerts`);
    setFeed(res);
    setLoading(false);
  }, [activeChild]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const clearAll = async () => {
    if (!activeChild) return;
    await api.post(`/children/${activeChild.id}/alerts/clear`);
    toast.show("Feed limpo. Tudo continua no relatório semanal.", "calm");
    load();
  };

  const isEmpty = !loading && (feed?.total ?? 0) === 0;

  return (
    <View style={styles.root} testID="alerts-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Txt variant="h1">Alertas e intervenções gentis</Txt>
            <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              {`${feed?.critical ?? 0} críticos • ${feed?.total ?? 0} no feed`}
            </Txt>
          </View>
          <Pressable testID="clear-all-alerts-button" onPress={clearAll} style={styles.clearBtn}>
            <Txt variant="caption" color={colors.brandPrimary}>
              Limpar tudo
            </Txt>
          </Pressable>
        </View>
        <ChildSwitcher childrenList={kids} activeId={activeChild?.id} onSelect={setActiveChildId} />
      </View>

      {loading ? (
        <View style={styles.center} testID="alerts-loading">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center} testID="alerts-empty">
          <View style={styles.emptyBubble}>
            <Feather name="feather" size={30} color={colors.brandSecondary} />
          </View>
          <Txt variant="h1" style={{ marginTop: spacing.lg, textAlign: "center" }}>
            Tudo calmo hoje
          </Txt>
          <Txt
            variant="body"
            color={colors.textMuted}
            style={{ marginTop: spacing.sm, textAlign: "center" }}
          >
            Nenhuma intervenção necessária. Vamos juntar o que for leve no Resumo de Descanso
            desta noite.
          </Txt>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.brandPrimary}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          {feed?.groups.map((group) => (
            <View key={group.label} style={{ gap: spacing.md }}>
              <Txt variant="caption" color={colors.textMuted}>
                {`[ ${group.label} ]`}
              </Txt>
              {group.items.map((item, i) => (
                <AlertCard key={item.id} item={item} index={i} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function AlertCard({ item, index }: { item: AlertItem; index: number }) {
  const meta = severityMeta(item.severity);
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
      <Card testID={`alert-card-${item.id}`}>
        <View style={styles.cardHead}>
          <Pill label={item.title} bg={meta.bg} color={meta.color} />
          <Txt variant="caption" color={colors.textMuted}>
            {timeLabel(item.at)}
          </Txt>
        </View>
        <Txt variant="bodyMedium" style={{ marginTop: spacing.md }}>
          {item.message}
        </Txt>
        <View style={styles.actionRow}>
          <Feather name={meta.icon} size={15} color={meta.color} />
          <Txt variant="body" color={colors.textMuted} style={{ flex: 1 }}>
            {item.action}
          </Txt>
        </View>
      </Card>
    </Animated.View>
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
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  clearBtn: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  emptyBubble: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
});
