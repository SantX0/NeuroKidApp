import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton, Txt } from "@/src/components/Base";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme/tokens";

const DEMO = { email: "parent@neurokid.app", password: "NeuroKid2026!" };

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, googleBusy } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Preencha o e-mail e a senha.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Diga seu nome para o app poder te cumprimentar.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setMode("login");
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    setError("");
  };

  return (
    <KeyboardAwareScrollView
      testID="auth-screen"
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xxl,
        paddingBottom: insets.bottom + spacing.xxl,
        paddingHorizontal: spacing.xl,
      }}
      bottomOffset={spacing.xxl}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInDown.duration(350)}>
        <View style={styles.logo}>
          <Feather name="shield" size={22} color={colors.onBrand} />
        </View>
        <Txt variant="display" style={{ marginTop: spacing.xl }}>
          {mode === "login" ? "Que bom te ver" : "Crie seu espaço"}
        </Txt>
        <Txt variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Um painel calmo e privado para a vida de tela da sua criança. Sem culpa, só
          orientação gentil.
        </Txt>
      </Animated.View>

      <View style={styles.switcher}>
        {(["login", "signup"] as const).map((m) => (
          <Pressable
            key={m}
            testID={`auth-mode-${m}`}
            onPress={() => {
              setMode(m);
              setError("");
            }}
            style={[styles.switchTab, mode === m && styles.switchTabActive]}
          >
            <Txt
              variant="h2"
              color={mode === m ? colors.brandPrimary : colors.textMuted}
            >
              {m === "login" ? "Entrar" : "Criar conta"}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {mode === "signup" ? (
          <Field
            testID="auth-name-input"
            icon="user"
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
          />
        ) : null}
        <Field
          testID="auth-email-input"
          icon="mail"
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.fieldRow}>
          <Feather name="lock" size={18} color={colors.textMuted} />
          <TextInput
            testID="auth-password-input"
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            style={styles.input}
          />
          <Pressable
            testID="auth-toggle-password"
            hitSlop={12}
            onPress={() => setSecure((s) => !s)}
          >
            <Feather name={secure ? "eye" : "eye-off"} size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View testID="auth-error" style={styles.errorBox}>
          <Feather name="info" size={15} color={colors.accentCritical} />
          <Txt variant="body" color={colors.accentCritical} style={{ flex: 1 }}>
            {error}
          </Txt>
        </View>
      ) : null}

      <PrimaryButton
        testID="auth-submit-button"
        label={mode === "login" ? "Entrar" : "Criar conta"}
        loading={busy}
        onPress={submit}
        style={{ marginTop: spacing.xl }}
      />

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Txt variant="caption" color={colors.textMuted}>
          ou
        </Txt>
        <View style={styles.line} />
      </View>

      <Pressable
        testID="google-sign-in-button"
        disabled={googleBusy}
        onPress={async () => {
          setError("");
          try {
            await signInWithGoogle();
          } catch (e) {
            setError(e instanceof Error ? e.message : "O login com Google não foi concluído.");
          }
        }}
        style={({ pressed }) => [
          styles.googleBtn,
          { opacity: googleBusy ? 0.6 : pressed ? 0.88 : 1 },
        ]}
      >
        {googleBusy ? (
          <ActivityIndicator size="small" color={colors.brandPrimary} />
        ) : (
          <Feather name="log-in" size={18} color={colors.textPrimary} />
        )}
        <Txt variant="h2">Continuar com Google</Txt>
      </Pressable>

      <Pressable testID="auth-demo-button" onPress={fillDemo} style={styles.demo}>
        <Feather name="play-circle" size={16} color={colors.brandPrimary} />
        <Txt variant="caption" color={colors.brandPrimary}>
          Usar a família demo (Leo, Mia e Nina)
        </Txt>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

function Field({
  icon,
  testID,
  ...rest
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Feather>["name"];
  testID: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Feather name={icon} size={18} color={colors.textMuted} />
      <TextInput
        testID={testID}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginVertical: spacing.xl,
  },
  switchTab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm - 4,
  },
  switchTabActive: { backgroundColor: colors.surface },
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: "#E76F5114",
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  demo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  googleBtn: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
});
