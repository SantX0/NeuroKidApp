import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ContentItem } from "@/src/api/client";
import { Card, Pill, PrimaryButton, Txt } from "@/src/components/Base";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { BRACKETS, colors, radius, spacing } from "@/src/theme/tokens";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { activeChild, refreshChildren } = useAuth();

  const [bracket, setBracket] = useState<string>("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (key: string) => {
      const query = new URLSearchParams({ bracket: key });
      if (activeChild) query.append("child_id", activeChild.id);
      const res = await api.get<ContentItem[]>(`/content?${query.toString()}`);
      setItems(res);
      setLoading(false);
    },
    [activeChild],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(bracket);
    }, [load, bracket]),
  );

  const toggleAllow = async (item: ContentItem) => {
    if (!activeChild) return;
    await api.post(`/content/${item.id}/allow`, {
      child_id: activeChild.id,
      allowed: !item.allowed,
    });
    toast.show(
      item.allowed
        ? `${item.title} saiu da lista de ${activeChild.name}.`
        : `${item.title} entrou na lista permitida de ${activeChild.name}.`,
      "calm",
    );
    await refreshChildren();
    load(bracket);
  };

  return (
    <View style={styles.root} testID="library-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Txt variant="h1">Acervo Slow Content</Txt>
          <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            Mídia de baixo estímulo e alto enriquecimento, curada por IA
          </Txt>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipContent}
          testID="age-filter-row"
        >
          {BRACKETS.map((b) => {
            const active = b.key === bracket;
            return (
              <Pressable
                key={b.key}
                testID={`age-filter-${b.key}`}
                onPress={() => {
                  setBracket(b.key);
                  setLoading(true);
                }}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Txt variant="caption" color={active ? colors.onBrand : colors.textPrimary}>
                  {b.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center} testID="library-loading">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center} testID="library-empty">
          <Feather name="book-open" size={28} color={colors.textMuted} />
          <Txt variant="h2" style={{ marginTop: spacing.md }}>
            Nenhum conteúdo para este filtro
          </Txt>
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
          <Txt variant="h2" color={colors.textMuted}>
            Recomendado para transição
          </Txt>
          {items.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(i * 50).duration(350)}>
              <Card testID={`content-card-${item.id}`} style={{ padding: spacing.md }}>
                <Pressable
                  testID={`content-open-${item.id}`}
                  onPress={() => router.push(`/content/${item.id}`)}
                >
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={350}
                  />
                  <View style={{ padding: spacing.sm, gap: spacing.xs }}>
                    <View style={styles.rowBetween}>
                      <Txt variant="h2" style={{ flex: 1 }}>
                        {item.title}
                      </Txt>
                      {item.allowed ? (
                        <Pill
                          label="Permitido"
                          bg={`${colors.brandSecondary}1F`}
                          color={colors.brandPrimary}
                        />
                      ) : null}
                    </View>
                    <Txt variant="body" color={colors.textMuted}>
                      {item.subtitle}
                    </Txt>
                    <View style={styles.metaRow}>
                      <Meta icon="scissors" label={`${item.cuts_per_minute} cortes / min`} />
                      <Meta icon="clock" label={`${item.duration_minutes} min`} />
                    </View>
                    <View style={styles.metaRow}>
                      <Meta icon="volume-1" label={item.audio_note} />
                    </View>
                  </View>
                </Pressable>
                <PrimaryButton
                  testID={`content-allow-${item.id}`}
                  tone={item.allowed ? "soft" : "primary"}
                  label={item.allowed ? "Remover da lista permitida" : "+ Adicionar à lista permitida"}
                  onPress={() => toggleAllow(item)}
                  style={{ marginTop: spacing.sm }}
                />
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Meta({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <View style={styles.meta}>
      <Feather name={icon} size={13} color={colors.brandTertiary} />
      <Txt variant="caption" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
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
  },
  chipRow: { height: 56, flexGrow: 0 },
  chipContent: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center" },
  chip: {
    height: 36,
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl },
  thumb: { width: "100%", height: 150, borderRadius: radius.sm, backgroundColor: colors.divider },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1 },
});
