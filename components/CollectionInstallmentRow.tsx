import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openWhatsApp } from "@/utils/whatsapp";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type WhatsAppButtonProps = {
  phone: string;
  message: string;
  label?: string;
  size?: number;
};

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  size = 22,
}: WhatsAppButtonProps) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  return (
    <TouchableOpacity
      style={styles.btn}
      accessibilityLabel={label}
      onPress={(e) => {
        e?.stopPropagation?.();
        void openWhatsApp(phone, message);
      }}
      hitSlop={8}
    >
      <Ionicons name="logo-whatsapp" size={size} color="#FFF" />
    </TouchableOpacity>
  );
}

type CollectionInstallmentRowProps = {
  customerName: string;
  customerPhone: string;
  meta: string;
  amount: string;
  amountColor?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  whatsappMessage: string;
  onPress?: () => void;
};

export function CollectionInstallmentRow({
  customerName,
  customerPhone,
  meta,
  amount,
  amountColor = colors.text,
  icon,
  iconColor,
  iconBg,
  whatsappMessage,
  onPress,
}: CollectionInstallmentRowProps) {
  const body = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{customerName}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        <WhatsAppButton phone={customerPhone} message={whatsappMessage} size={20} />
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  name: { ...fontStyles.bodyMBold, fontSize: 15 },
  meta: { ...fontStyles.caption, color: colors.textMuted },
  rowRight: { alignItems: "flex-end", gap: 2 },
  amount: { ...fontStyles.bodyMBold, fontSize: 15 },
});
