import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  ModalScrollView,
  modalRootStyle,
  modalShellStyle,
} from "@/components/ui/ModalScrollView";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type FormSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  step?: { current: number; total: number };
  contentStyle?: ViewStyle;
};

export function FormSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  step,
  contentStyle,
}: FormSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={modalRootStyle}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={fontStyles.titleM}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {step ? (
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>
                {step.current}/{step.total}
              </Text>
            </View>
          ) : (
            <View style={styles.closeSpacer} />
          )}
        </View>

        {step ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(step.current / step.total) * 100}%` },
              ]}
            />
          </View>
        ) : null}

        <ModalScrollView contentContainerStyle={[styles.scroll, contentStyle]}>
          {children}
        </ModalScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    ...modalShellStyle,
    backgroundColor: colors.background,
    maxWidth: Platform.OS === "web" ? 720 : undefined,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
  },
  closeSpacer: { width: 40 },
  headerText: { flex: 1, gap: 2, paddingTop: 4 },
  subtitle: { ...fontStyles.bodyM, color: colors.textMuted, fontSize: 13 },
  stepBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
});
