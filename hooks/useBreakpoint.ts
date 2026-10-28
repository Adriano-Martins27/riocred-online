import { useEffect, useState } from "react";
import { Dimensions, Platform } from "react-native";
import { layout, spacing } from "@/styles/theme";

export function useIsDesktop(): boolean {
  const [width, setWidth] = useState(() => Dimensions.get("window").width);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  if (Platform.OS !== "web" && width < layout.desktopBreakpoint) {
    return false;
  }

  return width >= layout.desktopBreakpoint;
}

export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => Dimensions.get("window").width);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  return width;
}

/** Usable content width inside AppShell (sidebar + page padding). */
export function useContentWidth(
  horizontalPadding = spacing.md * 2,
): number {
  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= layout.desktopBreakpoint;
  const chrome = isDesktop ? layout.sidebarWidth + horizontalPadding : horizontalPadding;
  return Math.max(280, windowWidth - chrome);
}
