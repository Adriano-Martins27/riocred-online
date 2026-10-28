import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WhatsAppButton } from "@/components/CollectionInstallmentRow";
import type { Customer } from "@/types/customer";
import type { ScoreBand } from "@/utils/customer-score";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

type CustomerListItemProps = {
  customer: Customer;
  score?: number;
  band?: ScoreBand;
  onPress: () => void;
  whatsappMessage?: string;
};

const bandColor: Record<ScoreBand, string> = {
  Excelente: colors.successLight,
  Bom: "#E0F2FE",
  Atenção: colors.warningLight,
  "Alto Risco": colors.dangerLight,
};

const bandText: Record<ScoreBand, string> = {
  Excelente: colors.success,
  Bom: colors.primary,
  Atenção: colors.warning,
  "Alto Risco": colors.danger,
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CustomerListItem({
  customer,
  score,
  band,
  onPress,
  whatsappMessage,
}: CustomerListItemProps) {
  const waMsg =
    whatsappMessage ??
    `Olá ${customer.fullName}, aqui é da RioCred. Podemos falar sobre seu contrato?`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(customer.fullName)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.fullName}
          </Text>
          <View style={styles.topActions}>
            {customer.phone ? (
              <WhatsAppButton
                phone={customer.phone}
                message={waMsg}
                size={18}
              />
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </View>
        </View>
        {customer.phone ? (
          <Text style={styles.meta}>{customer.phone}</Text>
        ) : null}
        {customer.city ? (
          <Text style={styles.meta}>
            {customer.city}
            {customer.state ? ` · ${customer.state}` : ""}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {score != null && band ? (
            <View
              style={[styles.badge, { backgroundColor: bandColor[band] }]}
            >
              <Text style={[styles.badgeText, { color: bandText[band] }]}>
                {score} · {band}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              customer.active ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: customer.active ? colors.success : colors.danger },
              ]}
            >
              {customer.active ? "Ativo" : "Inativo"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    alignItems: "flex-start",
    ...shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  body: { flex: 1, gap: 2 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    ...fontStyles.bodyMBold,
    fontSize: 16,
    flex: 1,
  },
  meta: {
    ...fontStyles.bodyM,
    fontSize: 13,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeActive: { backgroundColor: colors.successLight },
  badgeInactive: { backgroundColor: colors.dangerLight },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
