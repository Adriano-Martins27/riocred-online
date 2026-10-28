import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WhatsAppButton } from "@/components/CollectionInstallmentRow";
import type { Loan } from "@/types/loan";
import { formatBRL } from "@/utils/currency";
import { buildLoanSummary } from "@/utils/loan-summary";
import type { LoanInstallment } from "@/types/loan";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

const STATUS_COLORS: Record<string, string> = {
  "Em dia": colors.success,
  Quitado: colors.textMuted,
  "Em atraso": colors.danger,
  "Próximo do vencimento": colors.warning,
};

const STATUS_BG: Record<string, string> = {
  "Em dia": colors.successLight,
  Quitado: colors.backgroundAlt,
  "Em atraso": colors.dangerLight,
  "Próximo do vencimento": colors.warningLight,
};

type LoanListItemProps = {
  loan: Loan;
  installments: LoanInstallment[];
  customerPhone?: string;
  whatsappMessage?: string;
  onPress: () => void;
  onPay?: () => void;
};

export function LoanListItem({
  loan,
  installments,
  customerPhone,
  whatsappMessage,
  onPress,
  onPay,
}: LoanListItemProps) {
  const summary = buildLoanSummary(loan, installments);
  const statusColor = STATUS_COLORS[summary.status] ?? colors.textMuted;
  const statusBg = STATUS_BG[summary.status] ?? colors.backgroundAlt;
  const waMsg =
    whatsappMessage ??
    `Olá ${loan.customerName}, aqui é da RioCred. Podemos falar sobre seu contrato?`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {loan.customerName}
          </Text>
          {loan.managerName ? (
            <Text style={styles.manager} numberOfLines={1}>
              {loan.managerName}
            </Text>
          ) : null}
          <Text style={styles.principal}>{formatBRL(loan.principal)}</Text>
        </View>
        <View style={styles.headerRight}>
          {customerPhone ? (
            <WhatsAppButton
              phone={customerPhone}
              message={waMsg}
              size={18}
            />
          ) : null}
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.status, { color: statusColor }]}>
              {summary.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Parcelas</Text>
          <Text style={styles.metricValue}>
            {loan.installmentCount}x
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Em aberto</Text>
          <Text style={styles.metricValue}>{formatBRL(summary.remaining)}</Text>
        </View>
        {summary.nextOpen ? (
          <>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Próx. venc.</Text>
              <Text style={styles.metricValue}>
                {summary.nextOpen.dueDate.split("-").reverse().join("/")}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {onPay && summary.openCount > 0 ? (
        <TouchableOpacity
          style={styles.payBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onPay();
          }}
        >
          <Ionicons name="cash-outline" size={16} color={colors.primary} />
          <Text style={styles.payText}>Registrar pagamento</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadow.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  headerLeft: { flex: 1, gap: 2 },
  name: { ...fontStyles.bodyMBold, fontSize: 16 },
  manager: {
    ...fontStyles.caption,
    color: colors.primary,
    fontSize: 12,
  },
  principal: {
    ...fontStyles.bodyM,
    color: colors.textMuted,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  status: { fontSize: 11, fontWeight: "700" },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  payText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
