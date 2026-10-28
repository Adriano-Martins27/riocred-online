import type { LoanPayment } from "@/types/loan";

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" });
}

/** Month key (YYYY-MM) from paidAt — supports ISO date or datetime strings. */
export function paymentMonthKey(paidAt: string): string | null {
  if (!paidAt || paidAt.length < 7) return null;
  return paidAt.slice(0, 7);
}

export type PaymentsTrend = {
  data: number[];
  labels: string[];
  months: string[];
};

/** Sum received amounts per calendar month using actual payment dates. */
export function buildPaymentsTrend(
  payments: LoanPayment[],
  monthCount = 6,
  now: Date = new Date(),
): PaymentsTrend {
  const months: string[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }

  const totals = new Map(months.map((mk) => [mk, 0]));
  for (const payment of payments) {
    const mk = paymentMonthKey(payment.paidAt);
    if (!mk || !totals.has(mk)) continue;
    totals.set(mk, (totals.get(mk) ?? 0) + payment.amount);
  }

  return {
    months,
    data: months.map((mk) => totals.get(mk) ?? 0),
    labels: months.map(monthLabel),
  };
}
