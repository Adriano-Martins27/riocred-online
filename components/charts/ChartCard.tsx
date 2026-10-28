import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
};

export function ChartCard({
  title,
  subtitle,
  children,
  headerRight,
  style,
}: ChartCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={fontStyles.titleM}>{title}</Text>
          {subtitle ? (
            <Text style={fontStyles.caption}>{subtitle}</Text>
          ) : null}
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
    minHeight: 220,
    maxWidth: "100%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
    minWidth: 0,
  },
  headerLeft: { flex: 1, gap: 2, minWidth: 0 },
});
