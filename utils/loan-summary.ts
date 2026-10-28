import type {
  DerivedLoanStatus,
  Loan,
  LoanInstallment,
  LoanPayment,
} from "@/types/loan";
import {
  contractRemaining,
  sumCashReceivedForLoan,
  sumInstallmentProgress,
} from "@/utils/financial-metrics";

export function refreshInstallmentStatus(
  inst: LoanInstallment,
  today = new Date(),
): LoanInstallment["status"] {
  if (inst.status === "paid" || inst.paidAmount >= inst.scheduledAmount) {
    return "paid";
  }
  if (inst.paidAmount > 0) {
    const due = new Date(inst.dueDate + "T23:59:59");
    return due < today ? "overdue" : "partial";
  }
  const due = new Date(inst.dueDate + "T23:59:59");
  return due < today ? "overdue" : "pending";
}

export function deriveLoanStatus(
  loan: Loan,
  installments: LoanInstallment[],
): DerivedLoanStatus {
  if (loan.status === "paid" || installments.every((i) => i.status === "paid")) {
    return "Quitado";
  }

  const open = installments.filter((i) => i.status !== "paid");
  if (open.some((i) => i.status === "overdue")) return "Em atraso";

  const today = new Date();
  const in7 = new Date();
  in7.setDate(today.getDate() + 7);

  const next = open.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )[0];

  if (next) {
    const due = new Date(next.dueDate + "T12:00:00");
    if (due <= in7) return "Próximo do vencimento";
  }

  return "Em dia";
}

export function buildLoanSummary(
  loan: Loan,
  installments: LoanInstallment[],
  payments: LoanPayment[] = [],
) {
  const installmentPaid = sumInstallmentProgress(installments);
  const remaining = contractRemaining(loan, installments);
  const cashReceived = payments.length
    ? sumCashReceivedForLoan(payments, loan.$id)
    : installmentPaid;
  const openCount = installments.filter((i) => i.status !== "paid").length;
  const overdueCount = installments.filter((i) => i.status === "overdue").length;
  const nextOpen = installments
    .filter((i) => i.status !== "paid")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];

  return {
    /** Progress toward contract payoff (installment paidAmount). */
    paid: installmentPaid,
    installmentPaid,
    /** Total cash received, including interest-only payments. */
    cashReceived,
    remaining,
    openCount,
    overdueCount,
    nextOpen,
    status: deriveLoanStatus(loan, installments),
  };
}
