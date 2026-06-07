import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { t } from "../../src/i18n";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { mutate: doLogin, isPending } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleLogin() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError(t("auth.fill_all_fields"));
      return;
    }
    doLogin(
      { data: { email: email.trim(), password, role } },
      {
        onSuccess: async (data) => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await login(data);
          router.replace("/(tabs)");
        },
        onError: (err: unknown) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const message =
            err instanceof Error ? err.message : t("auth.invalid_credentials");
          setError(message.includes("401") ? t("auth.invalid_login") : message);
        },
      }
    );
  }

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="bag" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{t("auth.welcome_back")}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t("auth.sign_in_subtitle")}
            </Text>
          </View>

          <View style={styles.roleRow}>
            {(["customer", "seller"] as const).map((r) => (
              <Pressable
                key={r}
                testID={`role-${r}`}
                style={({ pressed }) => [
                  styles.roleBtn,
                  {
                    backgroundColor:
                      role === r ? colors.primary : colors.secondary,
                    borderColor: role === r ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => setRole(r)}
              >
                <Ionicons
                  name={r === "customer" ? "person-outline" : "storefront-outline"}
                  size={16}
                  color={role === r ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.roleBtnText,
                    {
                      color:
                        role === r ? colors.primaryForeground : colors.foreground,
                    },
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                testID="email-input"
                style={[styles.input, { color: colors.foreground }]}
                placeholder={t("auth.email_placeholder")}
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                testID="password-input"
                style={[styles.input, { color: colors.foreground }]}
                placeholder={t("auth.password_placeholder")}
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword((p) => !p)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            {!!error && (
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            )}

            <Pressable
              testID="login-btn"
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleLogin}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                  {t("auth.sign_in")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t("auth.no_account")}{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              {t("auth.sign_up")}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.forgotBtn}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text style={[styles.forgotText, { color: colors.mutedForeground }]}>
            {t("auth.forgot_password")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  formSection: { gap: 20 },
  header: { alignItems: "center", gap: 8 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "700" as const, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center" },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleBtnText: { fontSize: 14, fontWeight: "600" as const },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    height: 50,
  },
  input: { flex: 1, fontSize: 15 },
  error: { fontSize: 13 },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontWeight: "700" as const },
  footer: { flexDirection: "row", justifyContent: "center", paddingTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "600" as const },
  forgotBtn: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  forgotText: { fontSize: 13 },
});
