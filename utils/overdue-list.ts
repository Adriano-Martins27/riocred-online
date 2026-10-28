import type { Loan, LoanInstallment } from "@/types/loan";

export type OverdueItem = {
  installmentId: string;
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  installmentNumber: number;
  managerName: string;
  dueDate: string;
  amountDue: number;
  daysLate: number;
  routeName: string;
};

function daysLate(dueDate: string, now = new Date()): number {
  const due = new Date(dueDate + "T23:59:59");
  if (due >= now) return 0;
  return Math.ceil((now.getTime() - due.getTime()) / 86400000);
}

export function buildOverdueList(
  installments: LoanInstallment[],
  loans: Loan[],
  customerRouteMap: Map<string, string>,
  routeNames: Map<string, string>,
  customerPhoneMap: Map<string, string> = new Map(),
  now = new Date(),
): OverdueItem[] {
  const loanById = new Map(loans.map((l) => [l.$id, l]));
  const items: OverdueItem[] = [];

  for (const inst of installments) {
    if (inst.status !== "overdue") continue;
    const loan = loanById.get(inst.loanId);
    if (!loan) continue;
    const amountDue = Math.max(
      0,
      Math.round((inst.scheduledAmount - inst.paidAmount) * 100) / 100,
    );
    const routeId = customerRouteMap.get(loan.customerId) ?? "";
    items.push({
      installmentId: inst.$id,
      loanId: loan.$id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      customerPhone: customerPhoneMap.get(loan.customerId) ?? "",
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      amountDue,
      daysLate: daysLate(inst.dueDate, now),
      routeName: routeNames.get(routeId) ?? "—",
      managerName: loan.managerName || "—",
    });
  }

  return items.sort((a, b) => b.daysLate - a.daysLate);
}
