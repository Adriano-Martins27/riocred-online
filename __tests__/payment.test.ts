import { buildPaymentBreakdown, netPaymentAmount } from "@/utils/payment-breakdown";
import type { Loan, LoanInstallment } from "@/types/loan";

const baseLoan: Loan = {
  $id: "l1",
  ownerId: "o1",
  customerId: "c1",
  customerName: "Maria",
  principal: 1000,
  interestRate: 10,
  interestMode: "on_contract",
  frequency: "monthly",
  installmentCount: 4,
  startDate: "2026-01-01",
  firstDueDate: "2026-02-01",
  skipWeekends: false,
  lateFeeMode: "percent_installment_daily",
  lateFeeValue: 1,
  totalInterest: 100,
  totalReceivable: 1100,
  status: "active",
  clientRequestId: "x",
  $createdAt: "2026-01-01",
};

function installment(
  overrides: Partial<LoanInstallment> = {},
): LoanInstallment {
  return {
    $id: "i1",
    loanId: "l1",
    ownerId: "o1",
    installmentNumber: 1,
    dueDate: "2020-01-01",
    scheduledAmount: 275,
    paidAmount: 0,
    status: "overdue",
    ...overrides,
  };
}

describe("buildPaymentBreakdown", () => {
  it("splits principal and late fee for installment payment", () => {
    const noLateLoan = { ...baseLoan, lateFeeMode: "none" as const };
    const inst = installment({ dueDate: "2099-01-01", status: "pending" });
    const bd = buildPaymentBreakdown(noLateLoan, inst, 275, "installment");
    expect(bd.lateFee).toBe(0);
    expect(bd.principalAmount).toBe(275);
    expect(bd.interestAmount).toBe(0);
  });

  it("applies mora before principal on overdue installment", () => {
    const inst = installment();
    const bd = buildPaymentBreakdown(baseLoan, inst, 5000, "installment");
    expect(bd.lateFee).toBeGreaterThan(0);
    expect(bd.interestAmount).toBe(bd.lateFee);
    expect(bd.principalAmount).toBeLessThanOrEqual(275);
  });

  it("allocates interest only without principal", () => {
    const inst = installment({ status: "overdue" });
    const bd = buildPaymentBreakdown(baseLoan, inst, 50, "interest_only");
    expect(bd.principalAmount).toBe(0);
    expect(bd.interestAmount).toBeGreaterThan(0);
  });

  it("caps principal at remaining balance", () => {
    const inst = installment({ paidAmount: 200, status: "partial" });
    const remaining = 75;
    const bd = buildPaymentBreakdown(baseLoan, inst, 500, "installment");
    expect(bd.principalAmount).toBeLessThanOrEqual(remaining);
  });

  it("returns zero late fee when installment is not overdue", () => {
    const inst = installment({
      dueDate: "2099-12-31",
      status: "pending",
    });
    const bd = buildPaymentBreakdown(baseLoan, inst, 275, "installment");
    expect(bd.lateFee).toBe(0);
    expect(bd.principalAmount).toBe(275);
  });
});

describe("payment net amount", () => {
  it("computes net after discount", () => {
    expect(netPaymentAmount(300, 20)).toBe(280);
  });
});
