import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { AppwriteException } from "appwrite";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/Input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { CustomerPicker } from "@/components/CustomerPicker";
import { PrimaryButton } from "@/components/PrimaryButton";
import { FormSheet } from "@/components/ui/FormSheet";
import { DatePickerField, todayIso } from "@/components/ui/DatePickerField";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard, StatCard } from "@/components/ui/StatCard";
import { useAllProfiles } from "@/hooks/useAdmin";
import { useManagerScope } from "@/hooks/useManagerScope";
import type { Customer } from "@/types/customer";
import type {
  InterestMode,
  LateFeeMode,
  Loan,
  LoanFrequency,
  LoanInput,
  LoanInstallment,
} from "@/types/loan";
import { formatBRL, maskBRLInput, parseBRLInput } from "@/utils/currency";
import { LATE_FEE_LABELS } from "@/utils/late-fee";
import { simulateLoan } from "@/utils/loan-simulator";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

type LoanFormModalProps = {
  visible: boolean;
  customers: Customer[];
  loan?: Loan | null;
  installments?: LoanInstallment[];
  onClose: () => void;
  onSubmit: (input: LoanInput) => Promise<void>;
};

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

const LATE_MODES = (Object.keys(LATE_FEE_LABELS) as LateFeeMode[]).map(
  (mode) => ({
    value: mode,
    label: LATE_FEE_LABELS[mode],
  }),
);

export function LoanFormModal({
  visible,
  customers,
  loan,
  installments = [],
  onClose,
  onSubmit,
}: LoanFormModalProps) {
  const isEdit = Boolean(loan);
  const hasPayments = installments.some(
    (i) => i.paidAmount > 0 || i.status === "paid",
  );
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
  const [step, setStep] = useState(1);
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
  const [lateFeeMode, setLateFeeMode] = useState<LateFeeMode>("none");
  const [lateFeeValue, setLateFeeValue] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setError(null);
    if (loan) {
      setCustomerId(loan.customerId);
      setManagerId(loan.managerId || (isManager ? (profile?.$id ?? "") : ""));
      setPrincipalStr(
        loan.principal > 0
          ? maskBRLInput(String(Math.round(loan.principal * 100)))
          : "",
      );
      setInterestRate(String(loan.interestRate));
      setInterestMode(loan.interestMode);
      setFrequency(loan.frequency);
      setInstallmentCount(String(loan.installmentCount));
      setStartDate(loan.startDate || todayIso());
      setFirstDueDate(loan.firstDueDate || todayIso());
      setSkipWeekends(loan.skipWeekends);
      setLateFeeMode(loan.lateFeeMode ?? "none");
      setLateFeeValue(String(loan.lateFeeValue ?? 0));
    } else {
      setCustomerId(customers[0]?.$id ?? "");
      setManagerId(isManager ? (profile?.$id ?? "") : "");
      setPrincipalStr("");
      setInterestRate("10");
      setInterestMode("on_contract");
      setFrequency("monthly");
      setInstallmentCount("12");
      setStartDate(todayIso());
      setFirstDueDate(todayIso());
      setSkipWeekends(true);
      setLateFeeMode("none");
      setLateFeeValue("0");
    }
  }, [visible, loan, customers, isManager, profile?.$id]);

  const customer = customers.find((c) => c.$id === customerId);

  const preview = useMemo(() => {
    const principal = parseBRLInput(principalStr);
    const n = parseInt(installmentCount, 10) || 1;
    const rate = parseFloat(interestRate.replace(",", ".")) || 0;
    if (principal <= 0) return null;
    return simulateLoan({
      principal,
      interestRate: rate,
      interestMode,
      frequency,
      installmentCount: n,
      firstDueDate,
      skipWeekends,
    });
  }, [
    principalStr,
    interestRate,
    interestMode,
    frequency,
    installmentCount,
    firstDueDate,
    skipWeekends,
  ]);

  const handleSave = async () => {
    const principal = parseBRLInput(principalStr);
    const n = parseInt(installmentCount, 10);
    const rate = parseFloat(interestRate.replace(",", ".")) || 0;

    if (!customerId || !customer) {
      setError("Selecione um cliente.");
      setStep(1);
      return;
    }
    if (principal <= 0) {
      setError("Informe o valor do empréstimo.");
      setStep(1);
      return;
    }
    if (n < 1 || n > 36) {
      setError("Número de parcelas deve ser entre 1 e 36.");
      return;
    }
    if (isAdmin && !managerId) {
      setError("Selecione o funcionário responsável pelo contrato.");
      setStep(2);
      return;
    }

    const selectedManager = managers.find((m) => m.id === managerId);
    const managerName =
      isManager && profile
        ? profile.fullName?.trim() || profile.email
        : selectedManager?.name ?? "";

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        customerId,
        customerName: customer.fullName,
        principal,
        interestRate: rate,
        interestMode,
        frequency,
        installmentCount: n,
        startDate,
        firstDueDate,
        skipWeekends,
        lateFeeMode,
        lateFeeValue: parseFloat(lateFeeValue.replace(",", ".")) || 0,
        managerId: isManager ? profile?.$id : managerId,
        managerName,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof AppwriteException
          ? err.message
          : isEdit
            ? "Não foi possível atualizar o empréstimo."
            : "Não foi possível criar o empréstimo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const stepTitle =
    step === 1 ? "Cliente e valores" : step === 2 ? "Condições" : "Revisão";

  return (
    <FormSheet
      visible={visible}
      title={isEdit ? "Editar empréstimo" : "Novo empréstimo"}
      subtitle={stepTitle}
      onClose={onClose}
      step={{ current: step, total: 3 }}
      footer={
        <>
          {step > 1 ? (
            <PrimaryButton
              label="Voltar"
              variant="secondary"
              onPress={() => setStep((s) => s - 1)}
            />
          ) : null}
          <PrimaryButton
            label={
              step === 3
                ? isEdit
                  ? "Salvar alterações"
                  : "Criar contrato"
                : "Continuar"
            }
            onPress={() => {
              if (step < 3) setStep((s) => s + 1);
              else handleSave();
            }}
            loading={loading}
            disabled={customers.length === 0}
          />
        </>
      }
    >
      {isEdit && hasPayments ? (
        <Text style={styles.hint}>
          Parcelas já pagas são mantidas. Parcelas em aberto serão recalculadas
          conforme os novos valores e datas.
        </Text>
      ) : null}
      {step === 1 ? (
        <>
          <SectionCard title="Cliente">
            <CustomerPicker
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </SectionCard>
          <SectionCard title="Valores">
            <CurrencyInput
              label="Valor do empréstimo"
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
        </>
      ) : null}

      {step === 2 ? (
        <>
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
          <SectionCard title="Frequência e juros">
            <FilterChips
              options={FREQUENCIES}
              value={frequency}
              onChange={setFrequency}
            />
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
          <SectionCard title="Mora (atraso)">
            <FilterChips
              options={LATE_MODES}
              value={lateFeeMode}
              onChange={setLateFeeMode}
              scrollable
            />
            {lateFeeMode !== "none" ? (
              <Input
                label="Valor da mora"
                value={lateFeeValue}
                onChangeText={setLateFeeValue}
                keyboardType="decimal-pad"
              />
            ) : null}
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
        </>
      ) : null}

      {step === 3 ? (
        <>
          {preview ? (
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
            </View>
          ) : (
            <Text style={fontStyles.bodyM}>
              Volte e preencha os valores para ver a simulação.
            </Text>
          )}
          <SectionCard title="Resumo">
            <Text style={fontStyles.bodyM}>
              Cliente: {customer?.fullName ?? "—"}
            </Text>
            <Text style={fontStyles.bodyM}>
              {installmentCount}x ·{" "}
              {FREQUENCIES.find((f) => f.value === frequency)?.label}
            </Text>
            <Text style={fontStyles.bodyM}>
              1º venc.: {firstDueDate.split("-").reverse().join("/")}
            </Text>
            {managerId || isManager ? (
              <Text style={fontStyles.bodyM}>
                Funcionário:{" "}
                {isManager
                  ? profile?.fullName || profile?.email
                  : managers.find((m) => m.id === managerId)?.name ?? "—"}
              </Text>
            ) : null}
          </SectionCard>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  kpi: { flex: 1, minWidth: 120 },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  error: { color: colors.danger, fontSize: 14 },
});
