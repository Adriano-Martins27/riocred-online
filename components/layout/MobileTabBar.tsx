import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "@/styles/theme";

const TAB_ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  index: { outline: "grid-outline", filled: "grid" },
  customers: { outline: "people-outline", filled: "people" },
  loans: { outline: "wallet-outline", filled: "wallet" },
  calendar: { outline: "calendar-outline", filled: "calendar" },
  more: { outline: "ellipsis-horizontal-circle-outline", filled: "ellipsis-horizontal-circle" },
};

export function MobileTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.index;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? icons.filled : icons.outline}
                  size={22}
                  color={focused ? colors.primary : colors.textLight}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadow.tabBar,
  },
  bar: {
    flexDirection: "row",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 48,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textLight,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
