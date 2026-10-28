import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { DatePickerField, todayIso } from "@/components/ui/DatePickerField";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard, StatCard } from "@/components/ui/StatCard";
import { useScopedData, scopedCustomerRouteMap } from "@/hooks/useScopedData";
import { useManagerReportFilters } from "@/hooks/useManagerReportFilters";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { usePayables } from "@/hooks/usePayables";
import type { DerivedLoanStatus } from "@/types/loan";
import { buildReport, exportReportPdf } from "@/utils/report-pdf";
import { isValidDateRange } from "@/utils/report-period";
import { formatBRL } from "@/utils/currency";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

const STATUSES: DerivedLoanStatus[] = [
  "Em dia",
  "Próximo do vencimento",
  "Em atraso",
  "Quitado",
];

type PeriodMode = "preset" | "custom";

export default function LoansReportScreen() {
  const {
    customers,
    loans,
    installments,
    payments,
    routes,
    isManager,
    isAdmin,
    allowedRouteIdSet,
  } = useScopedData();
  const {
    managers,
    routeManagerNames,
    managerLabel,
    assignedRoutes,
    getManagerRouteIds,
  } = useManagerReportFilters();
  const { canViewFinancials } = useFinancialVisibility();
  const { data: payables } = usePayables();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("preset");
  const [days, setDays] = useState(30);
  const [startDate, setStartDate] = useState(
    todayIso().slice(0, 8) + "01",
  );
  const [endDate, setEndDate] = useState(todayIso());
  const [managerId, setManagerId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [status, setStatus] = useState<DerivedLoanStatus | "">("");
  const [exporting, setExporting] = useState(false);

  const managerRouteIds = useMemo(() => {
    if (!isAdmin || !managerId) return undefined;
    return getManagerRouteIds(managerId);
  }, [isAdmin, managerId, getManagerRouteIds]);

  const visibleRoutes = useMemo(() => {
    const list = routes ?? [];
    if (!isAdmin || !managerId) return list;
    const allowed = managerRouteIds;
    if (!allowed?.size) return [];
    return list.filter((r) => allowed.has(r.$id));
  }, [routes, isAdmin, managerId, managerRouteIds]);

  const report = useMemo(() => {
    if (!loans || !installments || !payments || !payables || !customers) {
      return null;
    }
    if (periodMode === "custom" && !isValidDateRange(startDate, endDate)) {
      return null;
    }

    const routeNames = new Map((routes ?? []).map((r) => [r.$id, r.name]));
    const customerRouteMap = scopedCustomerRouteMap(customers);

    return buildReport(
      loans,
      installments,
      {
        ...(periodMode === "custom"
          ? { startDate, endDate }
          : { days }),
        routeId: routeId || undefined,
        status: status || undefined,
        routeNames,
        customerRouteMap,
        routeManagerNames,
        allowedRouteIds: isManager ? allowedRouteIdSet ?? undefined : undefined,
        filterManagerId: managerId || undefined,
        managerRouteIds: managerRouteIds?.size ? managerRouteIds : undefined,
      },
      payments,
      payables,
    );
  }, [
    loans,
    installments,
    payments,
    payables,
    customers,
    routes,
    periodMode,
    days,
    startDate,
    endDate,
    routeId,
    status,
    isManager,
    isAdmin,
    allowedRouteIdSet,
    managerRouteIds,
    routeManagerNames,
  ]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportReportPdf(report.summary, report.rows, report.summary.periodLabel);
    } finally {
      setExporting(false);
    }
  };

  const routeOptions = [
    { value: "", label: "Todas" },
    ...visibleRoutes.map((r) => ({ value: r.$id, label: r.name })),
  ];

  const managerOptions = [
    { value: "", label: "Todos" },
    ...managers.map((m) => ({ value: m.id, label: m.name })),
  ];

  const selectedManager = managers.find((m) => m.id === managerId);

  return (
    <ScreenShell title="Relatórios" subtitle="Caixa, carteira e exportação PDF">
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <SectionCard title="Período">
          <FilterChips
            options={[
              { value: "preset", label: "Atalhos" },
              { value: "custom", label: "Personalizado" },
            ]}
            value={periodMode}
            onChange={(v) => {
              setPeriodMode(v as PeriodMode);
            }}
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
              {periodMode === "custom" &&
              !isValidDateRange(startDate, endDate) ? (
                <Text style={styles.error}>
                  Selecione um intervalo válido (início ≤ fim).
                </Text>
              ) : null}
            </>
          )}
        </SectionCard>

        {isAdmin ? (
          <SectionCard title="Funcionário">
            {managerOptions.length <= 1 ? (
              <Text style={fontStyles.bodyM}>
                Nenhum manager aprovado cadastrado.
              </Text>
            ) : (
              <>
                <FilterChips
                  options={managerOptions}
                  value={managerId}
                  onChange={(v) => {
                    setManagerId(v);
                    setRouteId("");
                  }}
                  scrollable
                />
                {selectedManager ? (
                  <Text style={styles.assignmentHint}>
                    Rotas atribuídas:{" "}
                    {selectedManager.routeIds.length > 0
                      ? visibleRoutes.map((r) => r.name).join(", ")
                      : "nenhuma"}
                  </Text>
                ) : (
                  <Text style={styles.assignmentHint}>
                    Selecione um funcionário para ver só as rotas e clientes
                    atribuídos a ele.
                  </Text>
                )}
              </>
            )}
          </SectionCard>
        ) : isManager ? (
          <SectionCard title="Funcionário">
            <Text style={fontStyles.bodyMBold}>{managerLabel}</Text>
            <Text style={styles.assignmentHint}>
              Rotas atribuídas:{" "}
              {assignedRoutes.length > 0
                ? assignedRoutes.map((r) => r.name).join(", ")
                : "Nenhuma — peça ao administrador em Aprovações."}
            </Text>
            <Text style={styles.assignmentHint}>
              Você vê apenas clientes e contratos vinculados às rotas acima.
            </Text>
          </SectionCard>
        ) : null}

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
        </SectionCard>

        <SectionCard title="Status">
          <FilterChips
            options={[
              { value: "", label: "Todos" },
              ...STATUSES.map((s) => ({ value: s, label: s })),
            ]}
            value={status}
            onChange={(v) => setStatus(v as DerivedLoanStatus | "")}
            scrollable
          />
        </SectionCard>

        {report ? (
          <>
            <SectionCard
              title="Caixa do período"
              subtitle={report.summary.periodLabel}
            >
              {canViewFinancials ? (
              <View style={styles.kpiRow}>
                <StatCard
                  label="Entradas"
                  value={formatBRL(report.summary.received)}
                  icon="arrow-down-circle"
                  tone="success"
                  style={styles.kpi}
                />
                <StatCard
                  label="Só juros"
                  value={formatBRL(report.summary.receivedInterest)}
                  icon="trending-up"
                  tone="success"
                  style={styles.kpi}
                />
                <StatCard
                  label="Saídas"
                  value={formatBRL(report.summary.paidOut)}
                  icon="arrow-up-circle"
                  tone="danger"
                  style={styles.kpi}
                />
                <StatCard
                  label="Saldo caixa"
                  value={formatBRL(report.summary.cashBalance)}
                  icon="wallet"
                  tone={report.summary.cashBalance >= 0 ? "accent" : "danger"}
                  style={styles.kpi}
                />
              </View>
              ) : (
                <Text style={fontStyles.bodyM}>
                  Valores de caixa ocultos para seu perfil. O líder pode liberar
                  em Aprovações → Ver valores financeiros.
                </Text>
              )}
            </SectionCard>

            <SectionCard title="Carteira">
              <View style={styles.kpiRow}>
                <StatCard
                  label="Contratos"
                  value={String(report.summary.totalContracts)}
                  icon="document-text"
                  style={styles.kpi}
                />
                {canViewFinancials ? (
                  <StatCard
                    label="Em aberto"
                    value={formatBRL(report.summary.remaining)}
                    icon="wallet"
                    tone="warning"
                    style={styles.kpi}
                  />
                ) : null}
                <StatCard
                  label="Atrasadas"
                  value={String(report.summary.overdueCount)}
                  icon="alert-circle"
                  tone={
                    report.summary.overdueCount > 0 ? "danger" : "default"
                  }
                  style={styles.kpi}
                />
              </View>
            </SectionCard>
          </>
        ) : periodMode === "custom" ? (
          <Text style={styles.hint}>
            Ajuste as datas do período para gerar o relatório.
          </Text>
        ) : null}

        {report?.rows.map((row, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.name}>{row.customerName}</Text>
            <Text style={styles.meta}>
              {row.routeName} · {row.managerName} · {row.status}
            </Text>
            <Text style={styles.meta}>
              Período: {formatBRL(row.received)}
              {row.receivedInterest > 0
                ? ` (juros ${formatBRL(row.receivedInterest)})`
                : ""}{" "}
              · Total caixa: {formatBRL(row.totalReceived)} · Aberto:{" "}
              {formatBRL(row.remaining)}
            </Text>
          </View>
        ))}

        <PrimaryButton
          label="Exportar PDF"
          onPress={handleExport}
          loading={exporting}
          disabled={!report?.rows.length}
        />
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  kpi: { flex: 1, minWidth: 140 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
    ...shadow.sm,
  },
  name: { ...fontStyles.bodyMBold, fontSize: 15 },
  meta: { ...fontStyles.bodyM, fontSize: 13, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13 },
  hint: { ...fontStyles.bodyM, color: colors.textMuted, textAlign: "center" },
  assignmentHint: {
    ...fontStyles.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
