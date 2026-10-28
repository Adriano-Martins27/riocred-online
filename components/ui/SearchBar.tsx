import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "@/styles/theme";

type SearchBarProps = Omit<TextInputProps, "style"> & {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar…",
  ...props
}: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={18} color={colors.textLight} />
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    ...(Platform.OS === "web" ? {} : shadow.sm),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
});
