import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { AppwriteException } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import {
  PendingApprovalError,
  SignUpPendingError,
} from "@/utils/auth-access";
import { pingAppwrite } from "@/utils/appwrite-connection";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

const logo = require("@/assets/logo.png");

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const isDesktop = useIsDesktop();
  const { signIn, signUp, ping, recoverPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    process.env.EXPO_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ?? "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<"checking" | "ok" | "fail">(
    "checking",
  );
  const [connectionDetail, setConnectionDetail] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    pingAppwrite(ping).then((result) => {
      if (result.ok) {
        setConnection("ok");
        setConnectionDetail(null);
        return;
      }
      setConnection("fail");
      setConnectionDetail(result.message);
    });
  }, [ping]);

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setSuccess(null);
  };

  const handleRecovery = async () => {
    if (!email.trim()) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await recoverPassword(email.trim());
      setRecoverySent(true);
    } catch (err) {
      setError(
        err instanceof AppwriteException
          ? err.message
          : "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Informe seu nome completo.");
          return;
        }
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      if (err instanceof SignUpPendingError) {
        setSuccess(err.message);
        setMode("signin");
        return;
      }
      if (err instanceof PendingApprovalError) {
        setError(err.message);
        return;
      }
      setError(
        err instanceof AppwriteException
          ? err.message
          : "Não foi possível autenticar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, isDesktop && styles.flexDesktop]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        {isDesktop ? (
          <View style={styles.brandPanel}>
            <Image source={logo} style={styles.brandLogo} contentFit="contain" />
            <Text style={styles.brandTitle}>RioCred</Text>
            <Text style={styles.brandDesc}>
              Gestão de crédito comunitário para operação em campo — clientes,
              contratos, cobrança e relatórios em um só lugar.
            </Text>
          </View>
        ) : null}

        <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
          <ScreenScrollView
            alwaysScroll
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.card}>
              <View style={styles.logoWrap}>
                <Image source={logo} style={styles.logo} contentFit="contain" />
              </View>
              <Text style={fontStyles.titleM}>
                {mode === "signin" ? "Bem-vindo de volta" : "Criar conta"}
              </Text>
              <Text style={fontStyles.bodyM}>
                {mode === "signin"
                  ? "Entre para acessar sua carteira."
                  : "Cadastre-se como operador de campo."}
              </Text>

              <View
                style={[
                  styles.connection,
                  connection === "ok" && styles.connectionOk,
                  connection === "fail" && styles.connectionFail,
                ]}
              >
                <Text style={fontStyles.caption}>
                  {connection === "checking"
                    ? "Conectando ao servidor…"
                    : connection === "ok"
                      ? "Servidor conectado"
                      : "Sem conexão com o Appwrite"}
                </Text>
                {connection === "fail" && connectionDetail ? (
                  <Text style={[fontStyles.caption, styles.connectionDetail]}>
                    {connectionDetail}
                  </Text>
                ) : null}
              </View>

              {mode === "signup" ? (
                <Input
                  label="Nome completo"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              ) : null}

              <Input
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}
              {recoverySent ? (
                <Text style={styles.success}>E-mail de recuperação enviado.</Text>
              ) : null}

              {mode === "signin" ? (
                <PrimaryButton
                  label="Esqueceu a senha?"
                  onPress={handleRecovery}
                  variant="ghost"
                />
              ) : null}

              <PrimaryButton
                label={mode === "signin" ? "Entrar" : "Criar conta"}
                onPress={handleSubmit}
                loading={loading}
              />

              <PrimaryButton
                label={
                  mode === "signin"
                    ? "Não tem conta? Cadastre-se"
                    : "Já tem conta? Entrar"
                }
                onPress={toggleMode}
                variant="ghost"
              />
            </View>
          </ScreenScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexDesktop: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web" ? ({ height: "100%" } as object) : null),
  },
  page: { flex: 1 },
  pageDesktop: {
    flexDirection: "row",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ height: "100%" } as object) : null),
  },
  brandPanel: {
    flex: 1,
    backgroundColor: colors.sidebar,
    padding: spacing.xxl,
    justifyContent: "center",
    maxWidth: 480,
    alignItems: "flex-start",
  },
  brandLogo: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: spacing.sm,
  },
  brandDesc: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.sidebarText,
  },
  formPanel: { flex: 1 },
  formPanelDesktop: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.md,
    alignItems: "stretch",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  logo: {
    width: 88,
    height: 88,
  },
  connection: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
  },
  connectionOk: { backgroundColor: colors.successLight },
  connectionFail: { backgroundColor: colors.dangerLight },
  connectionDetail: { marginTop: spacing.xs, color: colors.textMuted },
  success: { color: colors.success, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
