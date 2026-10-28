import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: ViewStyle;
  error?: string;
};

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  style,
  error,
}: DatePickerFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        {/* @ts-expect-error web input */}
        <input
          type="date"
          value={value}
          min={minimumDate ? toIsoDate(minimumDate) : undefined}
          max={maximumDate ? toIsoDate(maximumDate) : undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) onChange(e.target.value);
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 16,
            fontFamily: "inherit",
            color: colors.text,
            backgroundColor: "transparent",
            padding: 0,
            minWidth: 0,
          }}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...fontStyles.bodyMBold, fontSize: 13 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  fieldError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
