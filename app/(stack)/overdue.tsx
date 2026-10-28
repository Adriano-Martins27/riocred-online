import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CollectionInstallmentRow } from "@/components/CollectionInstallmentRow";
import { ScreenShell } from "@/components/ScreenShell";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  useScopedData,
  scopedCustomerPhoneMap,
  scopedCustomerRouteMap,
} from "@/hooks/useScopedData";
import { useSettings } from "@/hooks/useSettings";
import { formatBRL } from "@/utils/currency";
import { buildOverdueList } from "@/utils/overdue-list";
import { buildCollectionMessage } from "@/utils/whatsapp";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

export default function OverdueScreen() {
  const router = useRouter();
  const { customers, loans, installments, routes } = useScopedData();
  const { data: settings } = useSettings();

  const overdue = useMemo(() => {
    if (!customers || !loans || !installments) return [];
    const routeNames = new Map((routes ?? []).map((r) => [r.$id, r.name]));
    return buildOverdueList(
      installments,
      loans,
      scopedCustomerRouteMap(customers),
      routeNames,
      scopedCustomerPhoneMap(customers),
    );
  }, [customers, loans, installments, routes]);

  const totalDue = useMemo(
    () => overdue.reduce((sum, item) => sum + item.amountDue, 0),
    [overdue],
  );

  return (
    <ScreenShell
      title="Vencidos"
      subtitle={`${overdue.length} parcela${overdue.length !== 1 ? "s" : ""} em atraso`}
      style={styles.shell}
    >
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.summary}>
          <StatCard
            label="Parcelas vencidas"
            value={String(overdue.length)}
            icon="alert-circle"
            tone="danger"
            style={styles.stat}
          />
          <StatCard
            label="Valor em atraso"
            value={formatBRL(totalDue)}
            icon="cash"
            tone="warning"
            style={styles.stat}
          />
        </View>

        {overdue.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Nenhum vencido"
            message="Todas as parcelas estão em dia no seu escopo."
          />
        ) : (
          <View style={styles.list}>
            {overdue.map((item) => (
              <CollectionInstallmentRow
                key={item.installmentId}
                customerName={item.customerName}
                customerPhone={item.customerPhone}
                meta={`Parcela #${item.installmentNumber} · ${item.routeName}${
                  item.managerName !== "—" ? ` · ${item.managerName}` : ""
                } · ${item.daysLate}d atraso`}
                amount={formatBRL(item.amountDue)}
                amountColor={colors.danger}
                icon="alert-circle"
                iconColor={colors.danger}
                iconBg={colors.dangerLight}
                whatsappMessage={buildCollectionMessage(
                  settings ?? null,
                  {
                    nome: item.customerName,
                    valor: formatBRL(item.amountDue),
                    data: item.dueDate.split("-").reverse().join("/"),
                  },
                  "overdue",
                )}
                onPress={() => router.push("/(tabs)/loans")}
              />
            ))}
          </View>
        )}

        {overdue.length > 0 ? (
          <Text
            style={styles.footerLink}
            onPress={() => router.push("/(tabs)/loans")}
          >
            Ir para Empréstimos para registrar pagamento →
          </Text>
        ) : null}
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summary: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stat: { flex: 1, minWidth: 140 },
  list: { gap: spacing.sm },
  footerLink: {
    ...fontStyles.bodyM,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
    fontWeight: "600",
  },
});
