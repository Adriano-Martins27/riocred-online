import type { Loan, LoanInstallment, PaymentInput } from "@/types/loan";
import { calculateLateFee } from "@/utils/late-fee";

export function buildPaymentBreakdown(
  loan: Loan,
  installment: LoanInstallment,
  amount: number,
  paymentType: PaymentInput["paymentType"],
): { interestAmount: number; principalAmount: number; lateFee: number } {
  const lateFee = calculateLateFee(loan, installment);
  const remaining =
    Math.round((installment.scheduledAmount - installment.paidAmount) * 100) /
    100;

  if (paymentType === "interest_only") {
    const interestPortion = Math.min(amount, lateFee + remaining * 0.1);
    return {
      interestAmount: Math.round(interestPortion * 100) / 100,
      principalAmount: 0,
      lateFee,
    };
  }

  const principalAmount = Math.max(0, amount - lateFee);
  return {
    interestAmount: lateFee,
    principalAmount: Math.min(principalAmount, remaining),
    lateFee,
  };
}

export function netPaymentAmount(amount: number, discountAmount: number): number {
  return Math.round((amount - discountAmount) * 100) / 100;
}
