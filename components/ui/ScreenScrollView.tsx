import {
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useIsDesktop } from "@/hooks/useBreakpoint";

type ScreenScrollViewProps = ScrollViewProps & {
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Keep ScrollView on desktop web (e.g. login outside AppShell). */
  alwaysScroll?: boolean;
};

/**
 * Scrollable page body. On desktop web uses a bounded ScrollView inside AppShell.
 * On mobile, flex ScrollView with minHeight fix for RN Web.
 */
export function ScreenScrollView({
  style,
  contentContainerStyle,
  children,
  showsVerticalScrollIndicator,
  alwaysScroll = false,
  ...props
}: ScreenScrollViewProps) {
  const isDesktop = useIsDesktop();
  const desktopWeb = isDesktop && Platform.OS === "web";

  return (
    <ScrollView
      {...props}
      style={[
        screenScrollStyles.root,
        desktopWeb && !alwaysScroll && screenScrollStyles.desktopBounded,
        style,
      ]}
      contentContainerStyle={[
        desktopWeb && !alwaysScroll && screenScrollStyles.desktopContent,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={
        showsVerticalScrollIndicator ?? desktopWeb
      }
      nestedScrollEnabled
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
    >
      {children}
    </ScrollView>
  );
}

const screenScrollStyles = {
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%" as const,
    maxWidth: "100%" as const,
  },
  desktopBounded: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web"
      ? ({ overflowY: "auto", overflowX: "hidden" } as const)
      : null),
  },
  desktopContent: {
    flexGrow: 1,
  },
};
