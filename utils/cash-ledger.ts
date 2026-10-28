import type { Payable } from "@/types/payable";
import type { Loan, LoanPayment, PaymentType } from "@/types/loan";
import {
  endOfDay,
  parsePaidAt,
  roundMoney,
  sumCashReceived,
  sumCashReceivedForLoan,
  sumCashReceivedSince,
} from "@/utils/financial-metrics";

export type CashMovement = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  category: string;
  paymentType?: PaymentType;
};

export type CashSummary = {
  inflow: number;
  outflow: number;
  balance: number;
  interestOnly: number;
  installments: number;
  payoff: number;
};

const PAYMENT_LABELS: Record<PaymentType, string> = {
  installment: "Parcela",
  interest_only: "Só juros",
  full_payoff: "Quitação",
};

export function paymentTypeLabel(type: PaymentType): string {
  return PAYMENT_LABELS[type] ?? type;
}

export function periodStart(days: number, now = new Date()): Date {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);
  return since;
}

export function sumCashByType(
  payments: LoanPayment[],
  since?: Date,
  until?: Date,
): Record<PaymentType, number> {
  const totals: Record<PaymentType, number> = {
    installment: 0,
    interest_only: 0,
    full_payoff: 0,
  };
  for (const payment of payments) {
    const d = parsePaidAt(payment.paidAt);
    if (since && d < since) continue;
    if (until && d > until) continue;
    totals[payment.paymentType] = roundMoney(
      totals[payment.paymentType] + payment.amount,
    );
  }
  return totals;
}

export function buildCashMovements(
  payments: LoanPayment[],
  loans: Loan[],
  payables: Payable[],
  since?: Date,
  until?: Date,
  scope?: CashScopeFilters,
): CashMovement[] {
  const loanNames = new Map(loans.map((l) => [l.$id, l.customerName]));
  const movements: CashMovement[] = [];
  const routeScoped = Boolean(scope?.routeId);

  for (const payment of payments) {
    if (!loanMatchesScope(payment.loanId, loans, scope)) continue;
    const d = parsePaidAt(payment.paidAt);
    if (since && d < since) continue;
    if (until && d > until) continue;
    movements.push({
      id: payment.$id,
      date: payment.paidAt,
      description: `${loanNames.get(payment.loanId) ?? "Empréstimo"} · ${paymentTypeLabel(payment.paymentType)}`,
      amount: payment.amount,
      direction: "in",
      category: "recebimento",
      paymentType: payment.paymentType,
    });
  }

  if (!routeScoped) {
    for (const payable of payables) {
      if (payable.status !== "paid") continue;
      const d = parsePaidAt(payable.dueDate);
      if (since && d < since) continue;
      if (until && d > until) continue;
      movements.push({
        id: payable.$id,
        date: payable.dueDate,
        description: payable.name,
        amount: payable.amount,
        direction: "out",
        category: "despesa",
      });
    }
  }

  return movements.sort(
    (a, b) => parsePaidAt(b.date).getTime() - parsePaidAt(a.date).getTime(),
  );
}

export function summarizeCash(movements: CashMovement[]): CashSummary {
  const inflow = roundMoney(
    movements
      .filter((m) => m.direction === "in")
      .reduce((sum, m) => sum + m.amount, 0),
  );
  const outflow = roundMoney(
    movements
      .filter((m) => m.direction === "out")
      .reduce((sum, m) => sum + m.amount, 0),
  );
  const byType = {
    interest_only: 0,
    installment: 0,
    full_payoff: 0,
  };
  for (const m of movements) {
    if (m.direction !== "in" || !m.paymentType) continue;
    byType[m.paymentType] = roundMoney(byType[m.paymentType] + m.amount);
  }
  return {
    inflow,
    outflow,
    balance: roundMoney(inflow - outflow),
    interestOnly: byType.interest_only,
    installments: byType.installment,
    payoff: byType.full_payoff,
  };
}

export type CashRange =
  | { mode: "days"; days: number }
  | { mode: "range"; startDate: string; endDate: string };

export type CashScopeFilters = {
  routeId?: string;
  customerRouteMap?: Map<string, string>;
  allowedRouteIds?: Set<string>;
};

function loanMatchesScope(
  loanId: string,
  loans: Loan[],
  scope?: CashScopeFilters,
): boolean {
  if (!scope?.routeId && !scope?.allowedRouteIds) return true;
  const loan = loans.find((l) => l.$id === loanId);
  if (!loan) return false;
  const routeId = scope.customerRouteMap?.get(loan.customerId) ?? "";
  if (
    scope.allowedRouteIds &&
    routeId &&
    !scope.allowedRouteIds.has(routeId)
  ) {
    return false;
  }
  if (scope.routeId && routeId !== scope.routeId) return false;
  return true;
}

export function buildCashSummary(
  payments: LoanPayment[],
  loans: Loan[],
  payables: Payable[],
  range?: CashRange,
  scope?: CashScopeFilters,
): { summary: CashSummary; movements: CashMovement[] } {
  let since: Date | undefined;
  let until: Date | undefined;
  if (range?.mode === "days") {
    since = periodStart(range.days);
    until = endOfDay(new Date());
  } else if (range?.mode === "range") {
    since = parsePaidAt(range.startDate);
    until = endOfDay(parsePaidAt(range.endDate));
  }
  const movements = buildCashMovements(
    payments,
    loans,
    payables,
    since,
    until,
    scope,
  );
  return { summary: summarizeCash(movements), movements };
}

export {
  sumCashReceived,
  sumCashReceivedForLoan,
  sumCashReceivedSince,
};
