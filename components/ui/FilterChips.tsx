import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type ChipOption<T extends string> = {
  value: T;
  label: string;
  color?: string;
};

type FilterChipsProps<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
};

function Chip<T extends string>({
  opt,
  active,
  onPress,
}: {
  opt: ChipOption<T>;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          !active && opt.color ? { color: opt.color } : null,
        ]}
        numberOfLines={1}
      >
        {opt.label}
      </Text>
    </TouchableOpacity>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: FilterChipsProps<T>) {
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollRow}
      >
        {options.map((opt) => (
          <Chip
            key={opt.value || "__all"}
            opt={opt}
            active={value === opt.value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.row}>
      {options.map((opt) => (
        <Chip
          key={opt.value || "__all"}
          opt={opt}
          active={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    maxHeight: 44,
    maxWidth: "100%",
    overflow: "hidden",
  },
  scrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  chip: {
    flexShrink: 0,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...fontStyles.bodyM,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
});
