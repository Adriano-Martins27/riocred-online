import type { Customer } from "@/types/customer";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";
import { sumCashReceivedForLoans } from "@/utils/financial-metrics";
import { buildLoanSummary } from "@/utils/loan-summary";

export type ScoreBand = "Excelente" | "Bom" | "Atenção" | "Alto Risco";

export type CustomerScoreResult = {
  customer: Customer;
  score: number;
  band: ScoreBand;
  totalLoans: number;
  paidLoans: number;
  paidInstallments: number;
  overdueInstallments: number;
  pendingInstallments: number;
  openBalance: number;
  maxDaysLate: number;
};

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  if (score >= 55) return "Atenção";
  return "Alto Risco";
}

function daysLate(dueDate: string): number {
  const due = new Date(dueDate + "T23:59:59");
  const now = new Date();
  if (due >= now) return 0;
  return Math.floor((now.getTime() - due.getTime()) / 86400000);
}

export function calculateCustomerScore(
  customer: Customer,
  loans: Loan[],
  installments: LoanInstallment[],
  payments: LoanPayment[] = [],
): CustomerScoreResult {
  const customerLoans = loans.filter((l) => l.customerId === customer.$id);
  const loanIds = new Set(customerLoans.map((l) => l.$id));
  const insts = installments.filter((i) => loanIds.has(i.loanId));

  const paidOnTime = insts.filter(
    (i) => i.status === "paid" && daysLate(i.dueDate) === 0,
  ).length;
  const onTimeRate = insts.length ? paidOnTime / insts.length : 1;

  const overdue = insts.filter((i) => i.status === "overdue").length;
  const overduePenalty = Math.min(1, overdue / Math.max(insts.length, 1) + 0.1);

  let totalContracted = 0;
  let openBalance = 0;
  let maxDaysLate = 0;

  for (const loan of customerLoans) {
    totalContracted += loan.totalReceivable;
    const li = insts.filter((i) => i.loanId === loan.$id);
    openBalance += buildLoanSummary(loan, li, payments).remaining;
    for (const i of li) {
      if (i.status === "overdue") {
        maxDaysLate = Math.max(maxDaysLate, daysLate(i.dueDate));
      }
    }
  }

  const totalReceived = sumCashReceivedForLoans(payments, loanIds);

  const recoveryRate =
    totalContracted > 0 ? totalReceived / totalContracted : 1;

  const created = new Date(customer.$createdAt || Date.now());
  const months =
    (Date.now() - created.getTime()) / (86400000 * 30);
  const paidLoans = customerLoans.filter((l) => l.status === "paid").length;
  const relationship = Math.min(
    1,
    months / 12 + paidLoans * 0.15,
  );

  const exposurePenalty =
    totalContracted > 0
      ? Math.min(1, openBalance / totalContracted)
      : 0;

  const score = Math.round(
    onTimeRate * 40 +
      (1 - overduePenalty) * 25 +
      recoveryRate * 15 +
      relationship * 10 +
      (1 - exposurePenalty) * 10,
  );

  return {
    customer,
    score: Math.max(0, Math.min(100, score)),
    band: scoreBand(score),
    totalLoans: customerLoans.length,
    paidLoans,
    paidInstallments: insts.filter((i) => i.status === "paid").length,
    overdueInstallments: overdue,
    pendingInstallments: insts.filter(
      (i) => i.status === "pending" || i.status === "partial",
    ).length,
    openBalance,
    maxDaysLate,
  };
}

export function calculateAllScores(
  customers: Customer[],
  loans: Loan[],
  installments: LoanInstallment[],
  payments: LoanPayment[] = [],
): CustomerScoreResult[] {
  return customers
    .map((c) => calculateCustomerScore(c, loans, installments, payments))
    .sort((a, b) => b.score - a.score);
}
