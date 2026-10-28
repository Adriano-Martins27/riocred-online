import { StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { fontStyles } from "@/styles/font";
import { colors } from "@/styles/theme";

type PlaceholderProps = { title: string };

export function StackPlaceholder({ title }: PlaceholderProps) {
  return (
    <ScreenShell title={title}>
      <View style={styles.box}>
        <Text style={fontStyles.bodyM}>Em desenvolvimento — próxima fase.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
