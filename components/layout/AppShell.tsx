import { Platform, StyleSheet, View } from "react-native";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import { Sidebar } from "@/components/layout/Sidebar";
import { colors } from "@/styles/theme";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return <View style={styles.mobile}>{children}</View>;
  }

  return (
    <View style={styles.desktop}>
      <Sidebar />
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobile: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  desktop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
    minHeight: 0,
    height: "100%",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    maxWidth: "100%",
    overflow: "hidden",
    position: "relative",
    ...(Platform.OS === "web" ? ({ height: "100%" } as object) : null),
  },
});
