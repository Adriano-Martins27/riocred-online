import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles, fonts } from "@/styles/font";

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  hint?: string;
  delta?: number;
  style?: ViewStyle;
  onPress?: () => void;
};

const toneMap = {
  default: { bg: colors.primaryLight, fg: colors.primary },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  accent: { bg: colors.accentLight, fg: colors.accent },
};

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  delta,
  style,
  onPress,
}: StatCardProps) {
  const t = toneMap[tone];
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <Text style={fontStyles.caption}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {delta !== undefined ? (
        <Text
          style={[
            styles.hint,
            delta > 0 ? styles.deltaPositive : styles.deltaNeutral,
          ]}
        >
          {delta >= 0 ? "+" : ""}
          {delta} esta semana
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          style,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

export function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={fontStyles.titleM}>{title}</Text>
            {subtitle ? (
              <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
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
    gap: spacing.xs,
    ...shadow.sm,
    flex: 1,
    minWidth: 150,
  },
  cardPressed: {
    opacity: 0.7,
    borderColor: colors.primary,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    ...fontStyles.metric,
    fontSize: 22,
  },
  hint: {
    ...fontStyles.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  deltaPositive: {
    color: colors.success,
    fontFamily: fonts.medium,
    fontWeight: "600",
  },
  deltaNeutral: {
    color: colors.textMuted,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadow.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 2,
  },
  sectionSubtitle: {
    ...fontStyles.caption,
    color: colors.textMuted,
  },
});
