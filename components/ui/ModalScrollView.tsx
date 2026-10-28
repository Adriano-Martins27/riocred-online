import { Platform, ScrollView, type ScrollViewProps } from "react-native";

/** Full-viewport wrapper for Modal children on web (RN Modal portal needs explicit height). */
export const modalRootStyle = {
  flex: 1,
  width: "100%" as const,
  ...(Platform.OS === "web"
    ? ({ height: "100%", minHeight: "100vh" } as const)
    : null),
};

/** Flex shell for modal bodies — keeps scroll region bounded on desktop web. */
export const modalShellStyle = {
  flex: 1,
  minHeight: 0,
  width: "100%" as const,
  flexDirection: "column" as const,
  ...(Platform.OS === "web"
    ? ({ height: "100%", maxHeight: "100vh", overflow: "hidden" } as const)
    : null),
};

const modalScrollStyle = {
  flex: 1,
  minHeight: 0,
  width: "100%" as const,
};

/** ScrollView for modals/sheets — always scrollable, including desktop web. */
export function ModalScrollView({
  style,
  showsVerticalScrollIndicator,
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      style={[modalScrollStyle, style]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? Platform.OS === "web"}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    />
  );
}
