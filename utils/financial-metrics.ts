import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Amount applied toward paying off installments (principal + parcela). */
export function sumInstallmentProgress(
  installments: LoanInstallment[],
): number {
  return roundMoney(
    installments.reduce((sum, inst) => sum + inst.paidAmount, 0),
  );
}

/** Total cash received from all payment records (incl. só juros, quitação, mora). */
export function sumCashReceived(payments: LoanPayment[]): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
}

export function sumCashReceivedForLoan(
  payments: LoanPayment[],
  loanId: string,
): number {
  return sumCashReceived(payments.filter((p) => p.loanId === loanId));
}

export function sumCashReceivedForLoans(
  payments: LoanPayment[],
  loanIds: Set<string> | string[],
): number {
  const ids = loanIds instanceof Set ? loanIds : new Set(loanIds);
  return sumCashReceived(payments.filter((p) => ids.has(p.loanId)));
}

export function parsePaidAt(paidAt: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return new Date(paidAt + "T12:00:00");
  }
  const d = new Date(paidAt);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function filterPaymentsInRange(
  payments: LoanPayment[],
  since: Date,
  until: Date,
  loanId?: string,
): LoanPayment[] {
  return payments.filter((p) => {
    const d = parsePaidAt(p.paidAt);
    if (loanId && p.loanId !== loanId) return false;
    return d >= since && d <= until;
  });
}

export function sumCashReceivedInRange(
  payments: LoanPayment[],
  since: Date,
  until: Date,
  loanId?: string,
): number {
  return roundMoney(
    filterPaymentsInRange(payments, since, until, loanId).reduce(
      (sum, p) => sum + p.amount,
      0,
    ),
  );
}

export function filterPaymentsSince(
  payments: LoanPayment[],
  since: Date,
): LoanPayment[] {
  return payments.filter((p) => parsePaidAt(p.paidAt) >= since);
}

export function sumCashReceivedSince(
  payments: LoanPayment[],
  since: Date,
  loanId?: string,
): number {
  const filtered = filterPaymentsSince(payments, since).filter(
    (p) => !loanId || p.loanId === loanId,
  );
  return sumCashReceived(filtered);
}

/** Contract balance still owed (unaffected by interest-only payments). */
export function contractRemaining(
  loan: Loan,
  installments: LoanInstallment[],
): number {
  const progress = sumInstallmentProgress(installments);
  return Math.max(0, roundMoney(loan.totalReceivable - progress));
}
