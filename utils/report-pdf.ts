import type { Payable } from "@/types/payable";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";
import { formatBRL } from "@/utils/currency";
import { sumCashByType } from "@/utils/cash-ledger";
import {
  filterPaymentsInRange,
  parsePaidAt,
  roundMoney,
  sumCashReceivedForLoan,
  sumCashReceivedInRange,
} from "@/utils/financial-metrics";
import { loanBelongsToManager } from "@/utils/manager-scope";
import { buildLoanSummary } from "@/utils/loan-summary";
import { resolveReportPeriod } from "@/utils/report-period";

export type ReportSummary = {
  totalContracts: number;
  dueCount: number;
  dueAmount: number;
  received: number;
  receivedInterest: number;
  receivedInstallments: number;
  receivedPayoff: number;
  paidOut: number;
  cashBalance: number;
  remaining: number;
  overdueCount: number;
  periodLabel: string;
};

export type ReportRow = {
  customerName: string;
  routeName: string;
  managerName: string;
  status: string;
  received: number;
  receivedInterest: number;
  totalReceived: number;
  remaining: number;
  nextDue: string;
};

export type ReportFilters = {
  days?: number;
  startDate?: string;
  endDate?: string;
  routeId?: string;
  status?: string;
  routeNames?: Map<string, string>;
  customerRouteMap?: Map<string, string>;
  /** Escopo do manager logado (rotas atribuídas). */
  allowedRouteIds?: Set<string>;
  /** Admin: filtrar pelo funcionário atrelado ao empréstimo. */
  filterManagerId?: string;
  /** Legado: rotas do funcionário quando empréstimo sem managerId. */
  managerRouteIds?: Set<string>;
  routeManagerNames?: Map<string, string>;
};

function filterPaymentsForLoans(
  payments: LoanPayment[],
  loanIds: Set<string>,
): LoanPayment[] {
  return payments.filter((p) => loanIds.has(p.loanId));
}

function sumPaidOutInRange(
  payables: Payable[],
  since: Date,
  until: Date,
): number {
  return roundMoney(
    payables
      .filter(
        (p) =>
          p.status === "paid" &&
          parsePaidAt(p.dueDate) >= since &&
          parsePaidAt(p.dueDate) <= until,
      )
      .reduce((sum, p) => sum + p.amount, 0),
  );
}

export function buildReport(
  loans: Loan[],
  installments: LoanInstallment[],
  filters: ReportFilters,
  payments: LoanPayment[] = [],
  payables: Payable[] = [],
): { summary: ReportSummary; rows: ReportRow[] } {
  const { since, until, label } = resolveReportPeriod(filters);

  const rows: ReportRow[] = [];
  let received = 0;
  let receivedInterest = 0;
  let remaining = 0;
  let dueCount = 0;
  let dueAmount = 0;
  let overdueCount = 0;
  const includedLoanIds = new Set<string>();

  for (const loan of loans) {
    const routeId = filters.customerRouteMap?.get(loan.customerId) ?? "";
    if (filters.allowedRouteIds && routeId && !filters.allowedRouteIds.has(routeId)) {
      continue;
    }
    if (filters.filterManagerId && filters.managerRouteIds) {
      if (
        !loanBelongsToManager(
          loan,
          filters.filterManagerId,
          filters.customerRouteMap ?? new Map(),
          filters.managerRouteIds,
        )
      ) {
        continue;
      }
    } else if (
      filters.managerRouteIds &&
      (!routeId || !filters.managerRouteIds.has(routeId))
    ) {
      continue;
    }
    if (filters.routeId && routeId !== filters.routeId) continue;

    const insts = installments.filter((i) => i.loanId === loan.$id);
    const summary = buildLoanSummary(loan, insts, payments);
    if (filters.status && summary.status !== filters.status) continue;

    includedLoanIds.add(loan.$id);

    const inPeriod = insts.filter((i) => {
      const d = parsePaidAt(i.dueDate);
      return d >= since && d <= until;
    });

    const periodReceived = sumCashReceivedInRange(
      payments,
      since,
      until,
      loan.$id,
    );
    const periodInterest = filterPaymentsInRange(
      payments,
      since,
      until,
      loan.$id,
    )
      .filter((p) => p.paymentType === "interest_only")
      .reduce((sum, p) => sum + p.amount, 0);

    received += periodReceived;
    receivedInterest += periodInterest;
    remaining += summary.remaining;
    dueCount += inPeriod.length;
    dueAmount += inPeriod.reduce((s, i) => s + i.scheduledAmount, 0);
    overdueCount += summary.overdueCount;

    rows.push({
      customerName: loan.customerName,
      routeName: filters.routeNames?.get(routeId) ?? "—",
      managerName:
        loan.managerName ||
        filters.routeManagerNames?.get(routeId) ||
        "—",
      status: summary.status,
      received: periodReceived,
      receivedInterest: roundMoney(periodInterest),
      totalReceived: sumCashReceivedForLoan(payments, loan.$id),
      remaining: summary.remaining,
      nextDue: summary.nextOpen?.dueDate ?? "—",
    });
  }

  const scopedPayments = filterPaymentsForLoans(payments, includedLoanIds);
  const byType = sumCashByType(scopedPayments, since, until);
  const paidOut = sumPaidOutInRange(payables, since, until);

  return {
    summary: {
      totalContracts: rows.length,
      dueCount,
      dueAmount,
      received,
      receivedInterest,
      receivedInstallments: byType.installment,
      receivedPayoff: byType.full_payoff,
      paidOut,
      cashBalance: roundMoney(received - paidOut),
      remaining,
      overdueCount,
      periodLabel: label,
    },
    rows,
  };
}

export async function exportReportPdf(
  summary: ReportSummary,
  rows: ReportRow[],
  periodLabel?: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;
  const label = periodLabel ?? summary.periodLabel;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("RioCred — Relatório de Empréstimos", 14, 18);
  doc.setFontSize(10);
  doc.text(`Período: ${label}`, 14, 26);
  doc.text(`Gerado: ${new Date().toLocaleString("pt-BR")}`, 14, 32);

  doc.text(`Contratos: ${summary.totalContracts}`, 14, 42);
  doc.text(`Entradas (caixa): ${formatBRL(summary.received)}`, 14, 48);
  doc.text(`  · Só juros: ${formatBRL(summary.receivedInterest)}`, 14, 54);
  doc.text(`  · Parcelas: ${formatBRL(summary.receivedInstallments)}`, 14, 60);
  doc.text(`  · Quitação: ${formatBRL(summary.receivedPayoff)}`, 14, 66);
  doc.text(`Saídas: ${formatBRL(summary.paidOut)}`, 14, 72);
  doc.text(`Saldo caixa: ${formatBRL(summary.cashBalance)}`, 14, 78);
  doc.text(`Em aberto (contratos): ${formatBRL(summary.remaining)}`, 14, 84);
  doc.text(`Parcelas atrasadas: ${summary.overdueCount}`, 14, 90);

  autoTable(doc, {
    startY: 96,
    head: [
      [
        "Cliente",
        "Rota",
        "Funcionário",
        "Status",
        "No período",
        "Só juros",
        "Total caixa",
        "Saldo",
      ],
    ],
    body: rows.map((r) => [
      r.customerName,
      r.routeName,
      r.managerName,
      r.status,
      formatBRL(r.received),
      formatBRL(r.receivedInterest),
      formatBRL(r.totalReceived),
      formatBRL(r.remaining),
    ]),
  });

  if (typeof window !== "undefined") {
    doc.save(`relatorio-emprestimos-${label.replace(/\s/g, "-")}.pdf`);
  }
}
