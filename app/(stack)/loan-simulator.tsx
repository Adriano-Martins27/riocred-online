import { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { DatePickerField, todayIso } from "@/components/ui/DatePickerField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { CustomerPicker } from "@/components/CustomerPicker";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard, StatCard } from "@/components/ui/StatCard";
import { useAllProfiles } from "@/hooks/useAdmin";
import { useCustomers } from "@/hooks/useCustomers";
import { useLoanMutations } from "@/hooks/useLoans";
import { useManagerScope } from "@/hooks/useManagerScope";
import type { InterestMode, LoanFrequency } from "@/types/loan";
import { formatBRL, parseBRLInput } from "@/utils/currency";
import { simulateLoan } from "@/utils/loan-simulator";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

const FREQUENCIES: { value: LoanFrequency; label: string }[] = [
  { value: "monthly", label: "Mensal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "weekly", label: "Semanal" },
  { value: "daily", label: "Diário" },
];

const INTEREST_MODES: { value: InterestMode; label: string }[] = [
  { value: "on_contract", label: "No contrato" },
  { value: "per_installment", label: "Por parcela" },
];

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00");
  return !Number.isNaN(d.getTime());
}

export default function LoanSimulatorScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isAdmin, isManager } = useManagerScope();
  const { data: allProfiles } = useAllProfiles(isAdmin);
  const managers = useMemo(
    () =>
      (allProfiles ?? [])
        .filter((p) => p.role === "manager" && p.isApproved)
        .map((p) => ({
          id: p.$id,
          name: p.fullName?.trim() || p.email,
        })),
    [allProfiles],
  );
  const { data: customers } = useCustomers();
  const { create } = useLoanMutations();
  const [customerId, setCustomerId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [principalStr, setPrincipalStr] = useState("");
  const [interestRate, setInterestRate] = useState("10");
  const [interestMode, setInterestMode] =
    useState<InterestMode>("on_contract");
  const [frequency, setFrequency] = useState<LoanFrequency>("monthly");
  const [installmentCount, setInstallmentCount] = useState("12");
  const [startDate, setStartDate] = useState(todayIso());
  const [firstDueDate, setFirstDueDate] = useState(todayIso());
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = customers?.find((c) => c.$id === customerId);
  const installmentN = parseInt(installmentCount, 10) || 0;

  const preview = useMemo(() => {
    const principal = parseBRLInput(principalStr);
    if (principal <= 0 || installmentN < 1) return null;
    if (!isValidIsoDate(firstDueDate)) return null;
    return simulateLoan({
      principal,
      interestRate: parseFloat(interestRate.replace(",", ".")) || 0,
      interestMode,
      frequency,
      installmentCount: installmentN,
      firstDueDate,
      skipWeekends,
    });
  }, [
    principalStr,
    interestRate,
    interestMode,
    frequency,
    installmentN,
    firstDueDate,
    skipWeekends,
  ]);

  const convertToContract = async () => {
    setError(null);
    if (!customer) {
      setError("Selecione um cliente.");
      return;
    }
    if (isAdmin && !managerId) {
      setError("Selecione o funcionário responsável pelo contrato.");
      return;
    }
    if (!preview) {
      setError("Preencha valor, parcelas e data de vencimento válidos.");
      return;
    }
    if (installmentN < 1 || installmentN > 36) {
      setError("Número de parcelas deve ser entre 1 e 36.");
      return;
    }

    setCreating(true);
    try {
      const selectedManager = managers.find((m) => m.id === managerId);
      const managerName =
        isManager && profile
          ? profile.fullName?.trim() || profile.email
          : selectedManager?.name ?? "";

      await create.mutateAsync({
        customerId: customer.$id,
        customerName: customer.fullName,
        principal: parseBRLInput(principalStr),
        interestRate: parseFloat(interestRate.replace(",", ".")) || 0,
        interestMode,
        frequency,
        installmentCount: installmentN,
        startDate,
        firstDueDate,
        skipWeekends,
        managerId: isManager ? profile?.$id : managerId,
        managerName,
      });
      router.replace("/(tabs)/loans");
    } catch {
      setError("Não foi possível criar o contrato. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenShell
      title="Simulador"
      subtitle="Simule cenários antes de formalizar o contrato"
    >
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <SectionCard title="Cliente">
          <CustomerPicker
            customers={customers ?? []}
            value={customerId}
            onChange={setCustomerId}
          />
        </SectionCard>

        {isAdmin ? (
          <SectionCard title="Funcionário responsável">
            <Text style={fontStyles.caption}>
              O contrato ficará atrelado a este funcionário.
            </Text>
            <FilterChips
              options={managers.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              value={managerId}
              onChange={setManagerId}
              scrollable
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Valores">
          <CurrencyInput
            label="Valor do empréstimo (R$)"
            value={principalStr}
            onChangeText={setPrincipalStr}
          />
          <Input
            label="Taxa de juros (%)"
            value={interestRate}
            onChangeText={setInterestRate}
            keyboardType="decimal-pad"
          />
          <Input
            label="Nº de parcelas (1–36)"
            value={installmentCount}
            onChangeText={setInstallmentCount}
            keyboardType="number-pad"
          />
        </SectionCard>

        <SectionCard title="Datas">
          <DatePickerField
            label="Data de início"
            value={startDate}
            onChange={setStartDate}
          />
          <DatePickerField
            label="Primeiro vencimento"
            value={firstDueDate}
            onChange={setFirstDueDate}
            minimumDate={new Date(startDate + "T12:00:00")}
          />
        </SectionCard>

        <SectionCard title="Condições">
          <Text style={fontStyles.caption}>Frequência</Text>
          <FilterChips
            options={FREQUENCIES}
            value={frequency}
            onChange={setFrequency}
          />
          <Text style={fontStyles.caption}>Modo de juros</Text>
          <FilterChips
            options={INTEREST_MODES}
            value={interestMode}
            onChange={setInterestMode}
          />
          <View style={styles.switchRow}>
            <Text style={fontStyles.bodyM}>Pular sábado e domingo</Text>
            <Switch
              value={skipWeekends}
              onValueChange={setSkipWeekends}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </SectionCard>

        {preview ? (
          <SectionCard title="Resultado da simulação">
            <View style={styles.kpiRow}>
              <StatCard
                label="Parcela"
                value={formatBRL(preview.installmentAmount)}
                icon="calendar"
                style={styles.kpi}
              />
              <StatCard
                label="Total"
                value={formatBRL(preview.totalReceivable)}
                icon="wallet"
                tone="accent"
                style={styles.kpi}
              />
              <StatCard
                label="Juros"
                value={formatBRL(preview.totalInterest)}
                icon="trending-up"
                tone="success"
                style={styles.kpi}
              />
              <StatCard
                label="Taxa efetiva"
                value={`${preview.effectiveRate.toFixed(2)}%`}
                icon="analytics"
                style={styles.kpi}
              />
            </View>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.cell, styles.headCell]}>#</Text>
                <Text style={[styles.cell, styles.headCell, styles.flex2]}>
                  Vencimento
                </Text>
                <Text style={[styles.cell, styles.headCell, styles.alignRight]}>
                  Valor
                </Text>
              </View>
              {preview.installments.map((i) => (
                <View key={i.installmentNumber} style={styles.tableRow}>
                  <Text style={styles.cell}>{i.installmentNumber}</Text>
                  <Text style={[styles.cell, styles.flex2]}>
                    {i.dueDate.split("-").reverse().join("/")}
                  </Text>
                  <Text style={[styles.cell, styles.alignRight]}>
                    {formatBRL(i.scheduledAmount)}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : (
          <Text style={styles.hint}>
            Informe valor, parcelas e vencimento para ver a simulação.
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Converter em contrato"
          onPress={convertToContract}
          loading={creating}
          disabled={!customer || !preview || (isAdmin && !managerId)}
        />
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpi: { flex: 1, minWidth: 130 },
  table: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cell: { flex: 1, fontSize: 13, color: colors.text },
  headCell: { fontWeight: "700", color: colors.textMuted, fontSize: 11 },
  flex2: { flex: 2 },
  alignRight: { textAlign: "right" },
  hint: { ...fontStyles.bodyM, color: colors.textMuted, textAlign: "center" },
  error: { color: colors.danger, fontSize: 14 },
});
