import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { FormSheet } from "@/components/ui/FormSheet";
import { DatePickerField, todayIso } from "@/components/ui/DatePickerField";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard } from "@/components/ui/StatCard";
import type {
  Loan,
  LoanInstallment,
  PaymentInput,
  PaymentMethod,
  PaymentType,
} from "@/types/loan";
import { buildPaymentBreakdown } from "@/utils/payment-breakdown";
import { formatBRL, parseBRLInput, maskBRLInput } from "@/utils/currency";
import { addDaysIso, suggestedCollectionAmount } from "@/utils/late-fee";
import { fontStyles } from "@/styles/font";
import { colors, radius, spacing } from "@/styles/theme";
import { AppwriteException } from "appwrite";

type LoanPaymentModalProps = {
  visible: boolean;
  loan: Loan | null;
  installments: LoanInstallment[];
  onClose: () => void;
  onSubmit: (input: PaymentInput) => Promise<void>;
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  canEdit?: boolean;
  onEdit?: () => void;
};

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "installment", label: "Parcela" },
  { value: "full_payoff", label: "Quitação" },
  { value: "interest_only", label: "Só juros" },
];

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "TED" },
  { value: "other", label: "Outro" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: colors.primary,
  partial: colors.warning,
  overdue: colors.danger,
  paid: colors.success,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  overdue: "Vencida",
  paid: "Paga",
};

export function LoanPaymentModal({
  visible,
  loan,
  installments,
  onClose,
  onSubmit,
  canDelete = false,
  onDelete,
  canEdit = false,
  onEdit,
}: LoanPaymentModalProps) {
  const [step, setStep] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("installment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [amountStr, setAmountStr] = useState("");
  const [discountStr, setDiscountStr] = useState("0,00");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = installments.filter((i) => i.status !== "paid");
  const selected = open.find((i) => i.$id === selectedId) ?? open[0];

  useEffect(() => {
    if (!visible || !loan || !selected) return;
    setStep(1);
    setSelectedId(selected.$id);
    const suggested = suggestedCollectionAmount(loan, selected);
    setAmountStr(maskBRLInput(String(Math.round(suggested * 100))));
    setDiscountStr("0,00");
    setPaidAt(todayIso());
    setNotes("");
    setRescheduleDate(addDaysIso(selected.dueDate, 30));
    setPaymentType("installment");
    setPaymentMethod("pix");
    setError(null);
  }, [visible, loan, selected?.$id]);

  const breakdown =
    loan && selected
      ? buildPaymentBreakdown(
          loan,
          selected,
          parseBRLInput(amountStr),
          paymentType,
        )
      : null;

  const applySuggested = () => {
    if (!loan || !selected) return;
    const suggested = suggestedCollectionAmount(loan, selected);
    setAmountStr(maskBRLInput(String(Math.round(suggested * 100))));
  };

  const handleConfirm = async () => {
    if (!selected || !loan) return;
    const amount = parseBRLInput(amountStr);
    const discountAmount = parseBRLInput(discountStr);
    const bd = buildPaymentBreakdown(loan, selected, amount, paymentType);

    if (amount <= 0) {
      setError("Informe o valor do pagamento.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        installment: selected,
        amount,
        discountAmount,
        paymentMethod,
        paymentType,
        notes,
        paidAt,
        interestAmount: bd.interestAmount,
        principalAmount: bd.principalAmount,
        rescheduleDate:
          paymentType === "interest_only" ? rescheduleDate : undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof AppwriteException
          ? err.message
          : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrimary = () => {
    if (step === 1) {
      if (!selected) return;
      if (paymentType === "interest_only") {
        setStep(2);
      } else {
        setStep(2);
      }
      setError(null);
      return;
    }
    handleConfirm();
  };

  const handleDelete = async () => {
    if (!loan || !onDelete) return;
    const { confirmAction } = await import("@/utils/confirm");
    const ok = await confirmAction(
      "Excluir empréstimo",
      `Remover o contrato de ${loan.customerName} e todo o histórico de pagamentos? Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir o empréstimo.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!loan) return null;

  const totalSteps = paymentType === "interest_only" ? 2 : 2;
  const stepTitle =
    step === 1
      ? "Selecionar parcela"
      : paymentType === "interest_only"
        ? "Reagendar vencimento"
        : "Confirmar cobrança";

  return (
    <FormSheet
      visible={visible}
      title="Cobrança"
      subtitle={loan.customerName}
      onClose={onClose}
      step={{ current: step, total: totalSteps }}
      footer={
        <>
          {open.length === 0 ? (
            <PrimaryButton label="Fechar" onPress={onClose} />
          ) : (
            <>
              {step > 1 ? (
                <PrimaryButton
                  label="Voltar"
                  variant="secondary"
                  onPress={() => setStep(1)}
                />
              ) : null}
              <PrimaryButton
                label={
                  step === 1
                    ? "Continuar"
                    : paymentType === "interest_only"
                      ? "Confirmar reagendamento"
                      : "Registrar pagamento"
                }
                onPress={handlePrimary}
                loading={loading}
              />
            </>
          )}
          {canEdit && onEdit ? (
            <PrimaryButton
              label="Editar contrato"
              variant="secondary"
              onPress={onEdit}
            />
          ) : null}
          {canDelete && onDelete ? (
            <PrimaryButton
              label="Excluir empréstimo"
              variant="ghost"
              onPress={handleDelete}
              loading={deleting}
            />
          ) : null}
        </>
      }
    >
      {open.length === 0 ? (
        <Text style={fontStyles.bodyM}>Todas as parcelas estão quitadas.</Text>
      ) : step === 1 ? (
        <>
          <SectionCard title="Tipo de cobrança">
            <FilterChips
              options={PAYMENT_TYPES}
              value={paymentType}
              onChange={setPaymentType}
            />
          </SectionCard>

          <SectionCard title="Parcela em aberto">
            {open.map((inst) => {
              const isSelected = selected?.$id === inst.$id;
              const remaining = inst.scheduledAmount - inst.paidAmount;
              const late =
                loan && isSelected
                  ? buildPaymentBreakdown(loan, inst, remaining, paymentType)
                      .lateFee
                  : 0;
              return (
                <TouchableOpacity
                  key={inst.$id}
                  style={[styles.instCard, isSelected && styles.instSelected]}
                  onPress={() => {
                    setSelectedId(inst.$id);
                    const sug = suggestedCollectionAmount(loan, inst);
                    setAmountStr(
                      maskBRLInput(String(Math.round(sug * 100))),
                    );
                  }}
                >
                  <View style={styles.instTop}>
                    <Text style={styles.instNum}>#{inst.installmentNumber}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            (inst.status === "overdue"
                              ? colors.dangerLight
                              : colors.primaryLight) as string,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_COLOR[inst.status] },
                        ]}
                      >
                        {STATUS_LABEL[inst.status] ?? inst.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.instDate}>
                    Venc. {inst.dueDate.split("-").reverse().join("/")}
                  </Text>
                  <Text style={styles.instAmount}>{formatBRL(remaining)}</Text>
                  {late > 0 ? (
                    <Text style={styles.lateText}>
                      + {formatBRL(late)} de mora
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </SectionCard>
        </>
      ) : (
        <>
          {paymentType === "interest_only" ? (
            <SectionCard title="Reagendamento">
              <Text style={fontStyles.bodyM}>
                O pagamento de juros foi registrado. Defina a nova data desta
                parcela e das futuras.
              </Text>
              <DatePickerField
                label="Nova data de vencimento"
                value={rescheduleDate}
                onChange={setRescheduleDate}
                minimumDate={new Date()}
              />
            </SectionCard>
          ) : (
            <>
              <SectionCard title="Resumo da cobrança">
                {breakdown ? (
                  <View style={styles.summaryGrid}>
                    <SummaryRow
                      label="Saldo da parcela"
                      value={formatBRL(
                        selected.scheduledAmount - selected.paidAmount,
                      )}
                    />
                    <SummaryRow
                      label="Mora"
                      value={formatBRL(breakdown.lateFee)}
                    />
                    <SummaryRow
                      label="Sugerido"
                      value={formatBRL(
                        suggestedCollectionAmount(loan, selected),
                      )}
                      highlight
                    />
                  </View>
                ) : null}
                <PrimaryButton
                  label="Usar valor sugerido"
                  variant="secondary"
                  onPress={applySuggested}
                />
              </SectionCard>

              <CurrencyInput
                label="Valor recebido"
                value={amountStr}
                onChangeText={setAmountStr}
              />
              <CurrencyInput
                label="Desconto concedido"
                value={discountStr}
                onChangeText={setDiscountStr}
              />

              <SectionCard title="Forma de pagamento">
                <FilterChips
                  options={METHODS}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </SectionCard>

              <DatePickerField
                label="Data do pagamento"
                value={paidAt}
                onChange={setPaidAt}
                maximumDate={new Date()}
              />

              <Text style={fontStyles.caption}>Observações (opcional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex: pagou metade, restante na sexta"
                placeholderTextColor={colors.textLight}
                multiline
                style={styles.notes}
              />
            </>
          )}
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormSheet>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.highlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  instCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  instSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  instTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  instNum: { ...fontStyles.bodyMBold, fontSize: 15 },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  instDate: { fontSize: 13, color: colors.textMuted },
  instAmount: { fontSize: 18, fontWeight: "700", color: colors.text },
  lateText: { fontSize: 12, color: colors.danger, fontWeight: "600" },
  summaryGrid: { gap: spacing.sm },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: colors.textMuted },
  summaryValue: { fontSize: 15, fontWeight: "600" },
  highlight: { color: colors.primary, fontSize: 17 },
  notes: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: "top",
  },
  error: { color: colors.danger, fontSize: 14 },
});
