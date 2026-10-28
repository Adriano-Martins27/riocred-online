import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import { colors, layout, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type ScreenShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  headerRight?: React.ReactNode;
};

export function ScreenShell({
  title,
  subtitle,
  children,
  style,
  headerRight,
}: ScreenShellProps) {
  const isDesktop = useIsDesktop();
  const desktopWeb = isDesktop && Platform.OS === "web";
  const segments = useSegments();
  const router = useRouter();
  const isStack = segments[0] === "(stack)";
  const showBack = !isDesktop && isStack && router.canGoBack();

  return (
    <SafeAreaView
      style={[styles.safe, desktopWeb && styles.safeDesktop, style]}
      edges={isDesktop ? ["top"] : ["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={[styles.flex, desktopWeb && styles.flexDesktop]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {(title || showBack) ? (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {showBack ? (
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backBtn}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
              ) : null}
              <View style={{ flex: 1 }}>
                {title ? <Text style={fontStyles.titleL}>{title}</Text> : null}
                {subtitle ? (
                  <Text style={fontStyles.bodyM}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
            {headerRight}
          </View>
        ) : null}
        <View style={[styles.container, desktopWeb && styles.containerDesktop]}>
          <View style={styles.body}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function LoadingScreen({ label = "Carregando…" }: { label?: string }) {
  return (
    <SafeAreaView style={styles.loadingSafe}>
      <View style={styles.loadingInner}>
        <Ionicons name="leaf" size={40} color={colors.primary} />
        <Text style={[fontStyles.bodyM, styles.loadingText]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ height: "100%" } as object) : null),
  },
  safeDesktop: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ height: "100%" } as object) : null),
  },
  flex: { flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" },
  flexDesktop: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    maxWidth: layout.contentMaxWidth,
    width: "100%",
    alignSelf: "center",
    minWidth: 0,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    maxWidth: layout.contentMaxWidth,
    width: "100%",
    alignSelf: "center",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  containerDesktop: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    paddingBottom: spacing.md,
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: "100%",
  },
  loadingSafe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingInner: { alignItems: "center", gap: spacing.md },
  loadingText: { color: colors.textMuted },
});
