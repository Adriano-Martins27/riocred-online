import type { LateFeeMode, Loan, LoanInstallment } from "@/types/loan";

function daysLate(dueDate: string, today = new Date()): number {
  const due = new Date(dueDate + "T23:59:59");
  if (due >= today) return 0;
  return Math.ceil((today.getTime() - due.getTime()) / 86400000);
}

export function calculateLateFee(
  loan: Loan,
  installment: LoanInstallment,
  today = new Date(),
): number {
  const days = daysLate(installment.dueDate, today);
  if (days <= 0 || installment.status === "paid") return 0;

  const remaining =
    Math.round((installment.scheduledAmount - installment.paidAmount) * 100) /
    100;
  if (remaining <= 0) return 0;

  const mode = loan.lateFeeMode ?? "none";
  const value = loan.lateFeeValue ?? 0;
  if (mode === "none" || value <= 0) return 0;

  switch (mode) {
    case "percent_installment_daily":
      return Math.round(remaining * (value / 100) * days * 100) / 100;
    case "percent_total_daily":
      return (
        Math.round(loan.totalReceivable * (value / 100) * (days / 30) * 100) /
        100
      );
    case "fixed_daily":
      return Math.round(value * days * 100) / 100;
    default:
      return 0;
  }
}

export function suggestedCollectionAmount(
  loan: Loan,
  installment: LoanInstallment,
): number {
  const base =
    Math.round((installment.scheduledAmount - installment.paidAmount) * 100) /
    100;
  const late = calculateLateFee(loan, installment);
  return Math.round((base + late) * 100) / 100;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const LATE_FEE_LABELS: Record<LateFeeMode, string> = {
  none: "Sem mora",
  percent_installment_daily: "% da parcela / dia",
  percent_total_daily: "% do total / 30 dias",
  fixed_daily: "Valor fixo (R$) / dia",
};
