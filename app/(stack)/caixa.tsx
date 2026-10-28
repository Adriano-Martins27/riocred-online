import { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { DatePickerField, todayIso } from "@/components/ui/DatePickerField";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard, StatCard } from "@/components/ui/StatCard";
import { useScopedData, scopedCustomerRouteMap } from "@/hooks/useScopedData";
import { usePayables } from "@/hooks/usePayables";
import { buildCashSummary, paymentTypeLabel } from "@/utils/cash-ledger";
import { isValidDateRange } from "@/utils/report-period";
import { formatBRL } from "@/utils/currency";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

type PeriodMode = "preset" | "custom";

export default function CashScreen() {
  const router = useRouter();
  const { canViewFinancials } = useFinancialVisibility();
  const {
    customers,
    loans,
    payments,
    routes,
    isManager,
    allowedRouteIdSet,
  } = useScopedData();
  const { data: payables } = usePayables();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("preset");
  const [days, setDays] = useState(30);
  const [startDate, setStartDate] = useState(todayIso().slice(0, 8) + "01");
  const [endDate, setEndDate] = useState(todayIso());
  const [routeId, setRouteId] = useState("");

  const customerRouteMap = useMemo(
    () => (customers ? scopedCustomerRouteMap(customers) : undefined),
    [customers],
  );

  const cash = useMemo(() => {
    if (!payments || !loans || !payables || !customers) return null;
    const scope = {
      routeId: routeId || undefined,
      customerRouteMap,
      allowedRouteIds: isManager ? allowedRouteIdSet ?? undefined : undefined,
    };
    if (periodMode === "custom") {
      if (!isValidDateRange(startDate, endDate)) return null;
      return buildCashSummary(
        payments,
        loans,
        payables,
        {
          mode: "range",
          startDate,
          endDate,
        },
        scope,
      );
    }
    return buildCashSummary(
      payments,
      loans,
      payables,
      {
        mode: "days",
        days,
      },
      scope,
    );
  }, [
    payments,
    loans,
    payables,
    customers,
    customerRouteMap,
    periodMode,
    days,
    startDate,
    endDate,
    routeId,
    isManager,
    allowedRouteIdSet,
  ]);

  if (!canViewFinancials) {
    return (
      <ScreenShell title="Caixa" subtitle="Acesso restrito">
        <Text style={fontStyles.bodyM}>
          O administrador não liberou a visualização de valores financeiros para
          seu perfil. Você ainda pode registrar pagamentos e ver vencidos.
        </Text>
        <PrimaryButton
          label="Ver vencidos"
          onPress={() => router.push("/(stack)/overdue")}
        />
        <PrimaryButton
          label="Voltar"
          onPress={() => router.back()}
          variant="secondary"
        />
      </ScreenShell>
    );
  }

  const routeOptions = [
    { value: "", label: "Todas" },
    ...(routes?.map((r) => ({ value: r.$id, label: r.name })) ?? []),
  ];

  return (
    <ScreenShell
      title="Caixa"
      subtitle="Entradas e saídas reais do período"
    >
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <SectionCard title="Período">
          <FilterChips
            options={[
              { value: "preset", label: "Atalhos" },
              { value: "custom", label: "Personalizado" },
            ]}
            value={periodMode}
            onChange={(v) => setPeriodMode(v as PeriodMode)}
          />
          {periodMode === "preset" ? (
            <FilterChips
              options={PERIODS.map((p) => ({
                value: String(p.value),
                label: p.label,
              }))}
              value={String(days)}
              onChange={(v) => setDays(parseInt(v, 10) || 30)}
            />
          ) : (
            <>
              <DatePickerField
                label="Data inicial"
                value={startDate}
                onChange={setStartDate}
                maximumDate={new Date(endDate + "T12:00:00")}
              />
              <DatePickerField
                label="Data final"
                value={endDate}
                onChange={setEndDate}
                minimumDate={new Date(startDate + "T12:00:00")}
                maximumDate={new Date()}
              />
            </>
          )}
        </SectionCard>

        <SectionCard title={isManager ? "Minhas rotas" : "Rota"}>
          {isManager && routeOptions.length <= 1 ? (
            <Text style={fontStyles.bodyM}>
              Nenhuma rota atribuída. Peça ao administrador.
            </Text>
          ) : (
            <FilterChips
              options={routeOptions}
              value={routeId}
              onChange={setRouteId}
              scrollable
            />
          )}
          {routeId ? (
            <Text style={styles.routeHint}>
              Saídas (contas a pagar) aparecem apenas com &quot;Todas&quot; as
              rotas.
            </Text>
          ) : null}
        </SectionCard>

        {cash ? (
          <>
            <View style={styles.kpiRow}>
              <StatCard
                label="Entradas"
                value={formatBRL(cash.summary.inflow)}
                icon="arrow-down-circle"
                tone="success"
                style={styles.kpi}
              />
              <StatCard
                label="Saídas"
                value={formatBRL(cash.summary.outflow)}
                icon="arrow-up-circle"
                tone="danger"
                style={styles.kpi}
              />
              <StatCard
                label="Saldo"
                value={formatBRL(cash.summary.balance)}
                icon="wallet"
                tone={cash.summary.balance >= 0 ? "accent" : "danger"}
                style={styles.kpi}
              />
              <StatCard
                label="Só juros"
                value={formatBRL(cash.summary.interestOnly)}
                icon="trending-up"
                tone="success"
                style={styles.kpi}
              />
            </View>

            <SectionCard title="Composição das entradas">
              <BreakdownRow
                label="Parcelas"
                value={formatBRL(cash.summary.installments)}
              />
              <BreakdownRow
                label="Só juros"
                value={formatBRL(cash.summary.interestOnly)}
              />
              <BreakdownRow
                label="Quitação"
                value={formatBRL(cash.summary.payoff)}
              />
            </SectionCard>

            <SectionCard title="Movimentações">
              <FlatList
                data={cash.movements}
                keyExtractor={(m) => m.id}
                scrollEnabled={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    Nenhuma movimentação no período.
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.movement}>
                    <View
                      style={[
                        styles.movementIcon,
                        item.direction === "in"
                          ? styles.movementIn
                          : styles.movementOut,
                      ]}
                    >
                      <Ionicons
                        name={
                          item.direction === "in"
                            ? "arrow-down"
                            : "arrow-up"
                        }
                        size={16}
                        color={
                          item.direction === "in"
                            ? colors.success
                            : colors.danger
                        }
                      />
                    </View>
                    <View style={styles.movementBody}>
                      <Text style={styles.movementTitle} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={styles.movementDate}>
                        {item.date.split("-").reverse().join("/")}
                        {item.paymentType
                          ? ` · ${paymentTypeLabel(item.paymentType)}`
                          : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.movementAmount,
                        item.direction === "in"
                          ? styles.amountIn
                          : styles.amountOut,
                      ]}
                    >
                      {item.direction === "in" ? "+" : "−"}
                      {formatBRL(item.amount)}
                    </Text>
                  </View>
                )}
              />
            </SectionCard>
          </>
        ) : periodMode === "custom" ? (
          <Text style={styles.empty}>
            Selecione um intervalo de datas válido.
          </Text>
        ) : null}
      </ScreenScrollView>
    </ScreenShell>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={fontStyles.bodyM}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpi: { flex: 1, minWidth: 140 },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  breakdownValue: { ...fontStyles.bodyMBold, color: colors.primary },
  list: { gap: spacing.sm },
  empty: { ...fontStyles.bodyM, color: colors.textMuted, textAlign: "center" },
  routeHint: {
    ...fontStyles.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  movement: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  movementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  movementIn: { backgroundColor: colors.successLight },
  movementOut: { backgroundColor: colors.dangerLight },
  movementBody: { flex: 1, gap: 2 },
  movementTitle: { ...fontStyles.bodyMBold, fontSize: 14 },
  movementDate: { ...fontStyles.caption, color: colors.textMuted },
  movementAmount: { ...fontStyles.bodyMBold, fontSize: 14 },
  amountIn: { color: colors.success },
  amountOut: { color: colors.danger },
});
