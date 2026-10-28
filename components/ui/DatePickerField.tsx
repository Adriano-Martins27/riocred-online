import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + "T12:00:00");
  }
  return new Date();
}

function formatDisplay(iso: string): string {
  if (!iso) return "Selecionar data";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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
  const [open, setOpen] = useState(false);
  const date = useMemo(() => parseIsoDate(value), [value]);

  const apply = (next: Date) => {
    onChange(toIsoDate(next));
  };

  const onNativeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed") return;
    if (selected) apply(selected);
  };

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.value}>{formatDisplay(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textLight} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onNativeChange}
        />
      ) : null}
      {Platform.OS === "ios" && open ? (
        <Pressable style={styles.iosDone} onPress={() => setOpen(false)}>
          <Text style={styles.iosDoneText}>OK</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export { toIsoDate as isoDateToday };

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
  value: { flex: 1, fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 12 },
  iosDone: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iosDoneText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});
