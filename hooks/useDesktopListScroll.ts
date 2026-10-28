import { Platform, type FlatListProps, type ViewStyle } from "react-native";
import { useIsDesktop } from "@/hooks/useBreakpoint";

/** FlatList props: bounded flex region inside ScreenShell; scrolls on all platforms. */
export function useDesktopListScroll<T>() {
  const isDesktop = useIsDesktop();
  const desktopWeb = isDesktop && Platform.OS === "web";

  const listStyle: ViewStyle = {
    flex: 1,
    minHeight: 0,
    width: "100%",
    ...(desktopWeb
      ? ({ overflow: "hidden", height: "100%" } as ViewStyle)
      : null),
  };

  const listProps: Partial<FlatListProps<T>> = {
    style: listStyle,
    showsVerticalScrollIndicator: desktopWeb,
    nestedScrollEnabled: true,
    keyboardShouldPersistTaps: "handled",
  };

  return { desktopWeb, listStyle, listProps };
}
