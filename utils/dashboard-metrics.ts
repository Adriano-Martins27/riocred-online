import type { Customer } from "@/types/customer";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";
import {
  contractRemaining,
  roundMoney,
  sumCashReceived,
} from "@/utils/financial-metrics";
import { calculateLateFee } from "@/utils/late-fee";

export type DashboardMetrics = {
  totalLoans: number;
  loansThisWeek: number;
  activeContracts: number;
  contractsThisWeek: number;
  totalToReceive: number;
  totalReceived: number;
  capitalOut: number;
  pendingInterest: number;
  totalCustomers: number;
  customersThisWeek: number;
  overdueInstallments: number;
  dueTodayInstallments: number;
};

export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function createdSince(iso: string, since: Date): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d >= since;
}

function sumInterestPaid(
  payments: LoanPayment[],
  loanId: string,
): number {
  return roundMoney(
    payments
      .filter((p) => p.loanId === loanId)
      .reduce((sum, p) => {
        if (p.interestAmount > 0) return sum + p.interestAmount;
        if (p.paymentType === "interest_only") return sum + p.amount;
        return sum;
      }, 0),
  );
}

export function buildDashboardMetrics(
  loans: Loan[],
  installments: LoanInstallment[],
  payments: LoanPayment[],
  customers: Customer[],
  now = new Date(),
): DashboardMetrics {
  const weekStart = startOfWeek(now);
  const activeLoans = loans.filter((l) => l.status === "active");

  let totalToReceive = 0;
  let capitalOut = 0;
  let pendingInterest = 0;
  let overdueInstallments = 0;
  let dueTodayInstallments = 0;
  const today = now.toISOString().slice(0, 10);

  for (const loan of activeLoans) {
    const insts = installments.filter((i) => i.loanId === loan.$id);
    overdueInstallments += insts.filter((i) => i.status === "overdue").length;
    dueTodayInstallments += insts.filter(
      (i) => i.dueDate === today && i.status !== "paid",
    ).length;
    const remaining = contractRemaining(loan, insts);
    let lateFees = 0;
    for (const inst of insts) {
      if (inst.status !== "paid") {
        lateFees += calculateLateFee(loan, inst, now);
      }
    }
    totalToReceive = roundMoney(totalToReceive + remaining + lateFees);

    if (remaining > 0 && loan.totalReceivable > 0) {
      capitalOut = roundMoney(
        capitalOut + loan.principal * (remaining / loan.totalReceivable),
      );
    }

    const interestPaid = sumInterestPaid(payments, loan.$id);
    pendingInterest = roundMoney(
      pendingInterest + Math.max(0, loan.totalInterest - interestPaid),
    );
  }

  return {
    totalLoans: loans.length,
    loansThisWeek: loans.filter((l) => createdSince(l.$createdAt, weekStart))
      .length,
    activeContracts: activeLoans.length,
    contractsThisWeek: activeLoans.filter((l) =>
      createdSince(l.$createdAt, weekStart),
    ).length,
    totalToReceive,
    totalReceived: sumCashReceived(payments),
    capitalOut,
    pendingInterest,
    totalCustomers: customers.length,
    customersThisWeek: customers.filter((c) =>
      createdSince(c.$createdAt, weekStart),
    ).length,
    overdueInstallments,
    dueTodayInstallments,
  };
}

export function formatWeeklyDelta(count: number): string {
  const sign = count >= 0 ? "+" : "";
  return `${sign}${count} esta semana`;
}
