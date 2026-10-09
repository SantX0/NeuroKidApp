import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Child } from "@/src/api/client";
import { PrimaryButton, Txt } from "@/src/components/Base";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

const DEVICES = ["Tablet", "Celular", "TV"] as const;
const AVATAR_COLORS = ["#1B7A82", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"] as const;

const bracketHint = (age: number): string => {
  if (age <= 4) return "Bebês 2-4 • limite sugerido de 1h por dia";
  if (age <= 8) return "Exploradores 5-8 • limite sugerido de 2h por dia";
  return "Pré-adolescentes 9-12 • limite sugerido de 3h por dia";
};

export default function AddChild() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { refreshChildren, setActiveChildId } = useAuth();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [device, setDevice] = useState<string>("Tablet");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsedAge = Number(age);
  const validAge = Number.isInteger(parsedAge) && parsedAge >= 2 && parsedAge <= 12;

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Diga o nome da criança.");
      return;
    }
    if (!validAge) {
      setError("A idade precisa estar entre 2 e 12 anos.");
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<Child>("/children", {
        name: name.trim(),
        age: parsedAge,
        device,
        avatar_color: color,
      });
      await refreshChildren();
      setActiveChildId(created.id);
      toast.show(`Perfil de ${created.name} criado e protegido.`, "calm");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o perfil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="add-child-screen">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
        }}
        bottomOffset={spacing.xxl}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            testID="add-child-close-button"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Feather name="x" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Txt variant="display">Nova criança</Txt>
        <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          O escudo ajusta os limiares sensoriais pela faixa de idade, sem você configurar nada.
        </Txt>

        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <View style={styles.fieldRow}>
            <Feather name="user" size={18} color={colors.textMuted} />
            <TextInput
              testID="add-child-name-input"
              placeholder="Nome da criança"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>
          <View style={styles.fieldRow}>
            <Feather name="gift" size={18} color={colors.textMuted} />
            <TextInput
              testID="add-child-age-input"
              placeholder="Idade (2 a 12)"
              placeholderTextColor={colors.textMuted}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          {validAge ? (
            <View style={styles.hint} testID="add-child-bracket-hint">
              <Feather name="shield" size={14} color={colors.brandSecondary} />
              <Txt variant="caption" color={colors.brandPrimary} style={{ flex: 1 }}>
                {bracketHint(parsedAge)}
              </Txt>
            </View>
          ) : null}
        </View>

        <Txt variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          Aparelho protegido
        </Txt>
        <View style={styles.optionRow}>
          {DEVICES.map((item) => {
            const active = item === device;
            return (
              <Pressable
                key={item}
                testID={`add-child-device-${item.toLowerCase()}`}
                onPress={() => setDevice(item)}
                style={[
                  styles.option,
                  active
                    ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Txt variant="caption" color={active ? colors.onBrand : colors.textPrimary}>
                  {item}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <Txt variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          Cor do perfil
        </Txt>
        <View style={styles.optionRow}>
          {AVATAR_COLORS.map((item) => (
            <Pressable
              key={item}
              testID={`add-child-color-${item.replace("#", "").toLowerCase()}`}
              onPress={() => setColor(item)}
              style={[
                styles.swatch,
                { backgroundColor: item, borderWidth: color === item ? 3 : 0 },
              ]}
            />
          ))}
        </View>

        {error ? (
          <View testID="add-child-error" style={styles.errorBox}>
            <Feather name="info" size={15} color={colors.accentCritical} />
            <Txt variant="body" color={colors.accentCritical} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        ) : null}

        <PrimaryButton
          testID="add-child-submit-button"
          label="Criar perfil protegido"
          loading={busy}
          onPress={submit}
          style={{ marginTop: spacing.xl }}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  optionRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  option: {
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderColor: colors.textPrimary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: "#E76F5114",
    padding: spacing.md,
    borderRadius: radius.sm,
  },
});
