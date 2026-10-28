import {
  buildLoanSummary,
  deriveLoanStatus,
  refreshInstallmentStatus,
} from "@/utils/loan-summary";
import type { Loan, LoanInstallment } from "@/types/loan";

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
  overrides: Partial<LoanInstallment> & Pick<LoanInstallment, "installmentNumber" | "dueDate">,
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

describe("loan-summary", () => {
  it("marks overdue installments", () => {
    const past = inst({
      installmentNumber: 1,
      dueDate: "2020-01-01",
      status: "pending",
    });
    expect(refreshInstallmentStatus(past)).toBe("overdue");
  });

  it("derives quitado when all paid", () => {
    const installments = [
      inst({ installmentNumber: 1, dueDate: "2026-02-01", status: "paid", paidAmount: 550 }),
      inst({ installmentNumber: 2, dueDate: "2026-03-01", status: "paid", paidAmount: 550 }),
    ];
    expect(deriveLoanStatus(loan, installments)).toBe("Quitado");
  });

  it("builds remaining balance", () => {
    const installments = [
      inst({ installmentNumber: 1, dueDate: "2026-02-01", status: "paid", paidAmount: 550 }),
      inst({ installmentNumber: 2, dueDate: "2026-03-01", status: "pending" }),
    ];
    const summary = buildLoanSummary(loan, installments);
    expect(summary.remaining).toBe(550);
    expect(summary.openCount).toBe(1);
  });
});
