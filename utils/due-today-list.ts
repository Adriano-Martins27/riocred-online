import type { Loan, LoanInstallment } from "@/types/loan";

export type DueTodayItem = {
  installmentId: string;
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  installmentNumber: number;
  managerName: string;
  dueDate: string;
  amountDue: number;
  routeName: string;
};

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildDueTodayList(
  installments: LoanInstallment[],
  loans: Loan[],
  customerPhoneMap: Map<string, string>,
  customerRouteMap: Map<string, string>,
  routeNames: Map<string, string>,
  now = new Date(),
): DueTodayItem[] {
  const today = todayIso(now);
  const loanById = new Map(loans.map((l) => [l.$id, l]));
  const items: DueTodayItem[] = [];

  for (const inst of installments) {
    if (inst.dueDate !== today) continue;
    if (inst.status === "paid") continue;
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
      routeName: routeNames.get(routeId) ?? "—",
      managerName: loan.managerName || "—",
    });
  }

  return items.sort((a, b) =>
    a.customerName.localeCompare(b.customerName, "pt-BR"),
  );
}
