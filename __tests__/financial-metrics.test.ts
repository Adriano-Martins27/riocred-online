import { buildLoanSummary } from "@/utils/loan-summary";
import {
  contractRemaining,
  sumCashReceived,
  sumCashReceivedSince,
  sumInstallmentProgress,
} from "@/utils/financial-metrics";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";

const loan: Loan = {
  $id: "l1",
  ownerId: "o1",
  customerId: "c1",
  customerName: "Cliente",
  principal: 1000,
  interestRate: 10,
  interestMode: "on_contract",
  frequency: "monthly",
  installmentCount: 2,
  startDate: "2026-01-01",
  firstDueDate: "2026-02-01",
  skipWeekends: false,
  lateFeeMode: "none",
  lateFeeValue: 0,
  totalInterest: 100,
  totalReceivable: 1100,
  status: "active",
  clientRequestId: "x",
  $createdAt: "2026-01-01",
};

function inst(
  overrides: Partial<LoanInstallment> &
    Pick<LoanInstallment, "installmentNumber" | "dueDate">,
): LoanInstallment {
  return {
    $id: `i${overrides.installmentNumber}`,
    loanId: "l1",
    ownerId: "o1",
    scheduledAmount: 550,
    paidAmount: 0,
    status: "pending",
    ...overrides,
  };
}

function payment(
  partial: Partial<LoanPayment> & Pick<LoanPayment, "amount" | "paidAt">,
): LoanPayment {
  return {
    $id: "p1",
    loanId: "l1",
    installmentId: "i1",
    ownerId: "o1",
    interestAmount: partial.amount,
    principalAmount: 0,
    discountAmount: 0,
    paymentMethod: "pix",
    paymentType: "interest_only",
    notes: "",
    $createdAt: "",
    ...partial,
  };
}

describe("financial-metrics", () => {
  const installments = [
    inst({ installmentNumber: 1, dueDate: "2026-06-01", status: "overdue" }),
    inst({ installmentNumber: 2, dueDate: "2026-07-01" }),
  ];

  it("counts interest-only payments as cash received", () => {
    const payments = [
      payment({ $id: "p1", amount: 120, paidAt: "2026-06-10" }),
      payment({ $id: "p2", amount: 80, paidAt: "2026-06-15" }),
    ];

    expect(sumCashReceived(payments)).toBe(200);
    expect(sumInstallmentProgress(installments)).toBe(0);
    expect(contractRemaining(loan, installments)).toBe(1100);
  });

  it("filters payments by period using paidAt", () => {
    const payments = [
      payment({ $id: "p1", amount: 100, paidAt: "2026-06-01" }),
      payment({ $id: "p2", amount: 50, paidAt: "2025-01-01" }),
    ];
    const since = new Date("2026-06-01T00:00:00");
    expect(sumCashReceivedSince(payments, since, "l1")).toBe(100);
  });

  it("buildLoanSummary separates cash from contract progress", () => {
    const payments = [payment({ amount: 150, paidAt: "2026-06-10" })];
    const summary = buildLoanSummary(loan, installments, payments);

    expect(summary.cashReceived).toBe(150);
    expect(summary.installmentPaid).toBe(0);
    expect(summary.paid).toBe(0);
    expect(summary.remaining).toBe(1100);
  });

  it("includes installment payments in both metrics", () => {
    const paidInst = [
      inst({
        installmentNumber: 1,
        dueDate: "2026-02-01",
        status: "paid",
        paidAmount: 550,
      }),
      inst({ installmentNumber: 2, dueDate: "2026-03-01" }),
    ];
    const payments = [
      {
        ...payment({ amount: 550, paidAt: "2026-02-05" }),
        paymentType: "installment" as const,
        principalAmount: 550,
        interestAmount: 0,
      },
    ];

    const summary = buildLoanSummary(loan, paidInst, payments);
    expect(summary.cashReceived).toBe(550);
    expect(summary.installmentPaid).toBe(550);
    expect(summary.remaining).toBe(550);
  });
});
