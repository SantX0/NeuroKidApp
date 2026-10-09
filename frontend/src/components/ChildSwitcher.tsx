import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Txt } from "@/src/components/Base";
import { Child } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme/tokens";

/** Persistent Quick-Child pill row — instant profile switching, no deep menus. */
export function ChildSwitcher({
  childrenList,
  activeId,
  onSelect,
}: {
  childrenList: Child[];
  activeId?: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
      testID="child-switcher"
    >
      {childrenList.map((child) => {
        const active = child.id === activeId;
        return (
          <Pressable
            key={child.id}
            testID={`child-pill-${child.name.toLowerCase()}`}
            onPress={() => onSelect(child.id)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: child.avatar_color }]}>
              <Txt variant="caption" color={colors.onBrand}>
                {child.name.charAt(0)}
              </Txt>
            </View>
            <Txt variant="h2" color={active ? colors.onBrand : colors.textPrimary}>
              {`${child.name} (${child.age}y)`}
            </Txt>
            {active ? <Feather name="check" size={14} color={colors.onBrand} /> : null}
          </Pressable>
        );
      })}
      <Pressable
        testID="add-child-pill"
        onPress={() => router.push("/add-child")}
        style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
      >
        <Feather name="plus" size={14} color={colors.brandPrimary} />
        <Txt variant="caption" color={colors.brandPrimary}>
          Nova criança
        </Txt>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { height: 56, flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center" },
  chip: {
    height: 36,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
