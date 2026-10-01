import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Analysis, api, ContentItem } from "@/src/api/client";
import { Card, Pill, PrimaryButton, ProgressBar, Txt } from "@/src/components/Base";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme/tokens";

const verdictMeta = (verdict: string) => {
  if (verdict === "blocked") {
    return { label: "Não aprovado", bg: `${colors.accentCritical}1F`, color: colors.accentCritical };
  }
  if (verdict === "caution") {
    return { label: "Assistir junto com um adulto", bg: `${colors.accentModerate}33`, color: "#8A6A16" };
  }
  return { label: "Estímulo cognitivo verificado", bg: `${colors.brandSecondary}1F`, color: colors.brandPrimary };
};

export default function ContentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { activeChild, refreshChildren } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const query = activeChild ? `?child_id=${activeChild.id}` : "";
      const res = await api.get<ContentItem>(`/content/${id}${query}`);
      setItem(res);
    } catch {
      setError("Não foi possível carregar os detalhes.");
    } finally {
      setLoading(false);
    }
  }, [id, activeChild]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = async () => {
    if (!id) return;
    setAnalysing(true);
    try {
      const res = await api.post<Analysis>(`/content/${id}/classify`, {
        child_id: activeChild?.id,
      });
      setAnalysis(res);
      toast.show("Nova leitura cognitiva pronta.", "calm");
    } finally {
      setAnalysing(false);
    }
  };

  const toggleAllow = async () => {
    if (!item || !activeChild) return;
    await api.post(`/content/${item.id}/allow`, {
      child_id: activeChild.id,
      allowed: !item.allowed,
    });
    toast.show(
      item.allowed ? "Removido da lista permitida." : "Adicionado à lista permitida.",
      "calm",
    );
    await refreshChildren();
    load();
  };

  if (loading) {
    return (
      <View style={styles.center} testID="content-loading">
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center} testID="content-error">
        <Txt variant="h2">{error || "Conteúdo não encontrado"}</Txt>
        <PrimaryButton
          testID="content-retry-button"
          tone="soft"
          label="Tentar de novo"
          onPress={load}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    );
  }

  const badges = analysis?.stimulus_badges ?? item.stimulus_badges;
  const why = analysis?.why ?? item.ai_reason;
  const verdict = verdictMeta(analysis?.verdict ?? item.ai_verdict);
  const loadScore = analysis?.sensory_load_score ?? Math.round(item.cuts_per_minute * 9);

  return (
    <View style={styles.root} testID="content-detail-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.hero}
            contentFit="cover"
            transition={350}
          />
          <Pressable
            testID="content-back-button"
            onPress={() => router.back()}
            style={[styles.back, { top: insets.top + spacing.sm }]}
          >
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Txt variant="caption" color={colors.textMuted}>
            PROPÓSITO DO CONTEÚDO E IMPACTO COGNITIVO
          </Txt>
          <Txt variant="display" style={{ marginTop: spacing.sm }}>
            {item.title}
          </Txt>
          <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            {item.subtitle}
          </Txt>

          <View style={styles.metaRow}>
            <Pill
              label={`${item.duration_minutes} min`}
              bg={colors.surfaceSecondary}
              color={colors.textMuted}
            />
            <Pill
              label={`Ritmo: ${item.pacing}`}
              bg={colors.surfaceSecondary}
              color={colors.textMuted}
            />
            <Pill
              label={`${item.cuts_per_minute} cortes/min`}
              bg={colors.surfaceSecondary}
              color={colors.textMuted}
            />
          </View>

          <Animated.View entering={FadeInDown.duration(350)} style={{ marginTop: spacing.xl }}>
            <Card testID="cognitive-verdict-card">
              <Pill testID="verdict-pill" label={verdict.label} bg={verdict.bg} color={verdict.color} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.badgeRow}
                contentContainerStyle={styles.badgeContent}
              >
                {badges.map((badge) => (
                  <View key={badge} style={styles.badge}>
                    <Feather name="check-circle" size={13} color={colors.brandSecondary} />
                    <Txt variant="caption" color={colors.brandPrimary}>
                      {badge}
                    </Txt>
                  </View>
                ))}
              </ScrollView>

              <Txt variant="h2" style={{ marginTop: spacing.md }}>
                Por que a IA aprovou isto
              </Txt>
              <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                {why}
              </Txt>

              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <View style={styles.rowBetween}>
                  <Txt variant="caption" color={colors.textMuted}>
                    Carga sensorial
                  </Txt>
                  <Txt variant="caption" color={colors.textPrimary}>
                    {`${loadScore} / 100`}
                  </Txt>
                </View>
                <ProgressBar
                  testID="sensory-load-bar"
                  ratio={loadScore / 100}
                  color={
                    loadScore >= 70
                      ? colors.accentCritical
                      : loadScore >= 45
                        ? colors.accentModerateDeep
                        : colors.brandSecondary
                  }
                />
              </View>

              {analysis?.parent_tip ? (
                <View style={styles.tip} testID="parent-tip">
                  <Feather name="heart" size={14} color={colors.brandPrimary} />
                  <Txt variant="body" color={colors.brandPrimary} style={{ flex: 1 }}>
                    {analysis.parent_tip}
                  </Txt>
                </View>
              ) : null}

              <Txt variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
                {`Analisado por ${analysis?.source ?? "analisador de ritmo no aparelho"} • retenção zero`}
              </Txt>
            </Card>
          </Animated.View>

          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <PrimaryButton
              testID="run-ai-analysis-button"
              label="Rever leitura cognitiva com IA"
              tone="soft"
              loading={analysing}
              onPress={runAnalysis}
            />
            <PrimaryButton
              testID="content-detail-allow-button"
              label={item.allowed ? "Remover da lista permitida" : "+ Adicionar à lista permitida"}
              tone={item.allowed ? "outline" : "primary"}
              onPress={toggleAllow}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    backgroundColor: colors.surface,
  },
  hero: { width: "100%", height: 260, backgroundColor: colors.divider },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  badgeRow: { marginTop: spacing.md, flexGrow: 0 },
  badgeContent: { gap: spacing.sm },
  badge: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.brandSecondary}14`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
});
