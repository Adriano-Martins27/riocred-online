import { calculateLateFee, suggestedCollectionAmount } from "@/utils/late-fee";
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
  installmentCount: 1,
  startDate: "2026-01-01",
  firstDueDate: "2026-01-01",
  skipWeekends: false,
  lateFeeMode: "percent_installment_daily",
  lateFeeValue: 1,
  totalInterest: 100,
  totalReceivable: 1100,
  status: "active",
  clientRequestId: "x",
  $createdAt: "2026-01-01",
};

const installment: LoanInstallment = {
  $id: "i1",
  loanId: "l1",
  ownerId: "o1",
  installmentNumber: 1,
  dueDate: "2026-01-01",
  scheduledAmount: 1100,
  paidAmount: 0,
  status: "overdue",
};

describe("late-fee", () => {
  it("returns zero when not overdue", () => {
    const today = new Date("2026-01-01T12:00:00");
    expect(
      calculateLateFee(
        { ...loan, lateFeeMode: "none" },
        { ...installment, dueDate: "2026-06-01", status: "pending" },
        today,
      ),
    ).toBe(0);
  });

  it("calculates percent_installment_daily", () => {
    const today = new Date("2026-01-11T12:00:00");
    const fee = calculateLateFee(loan, installment, today);
    expect(fee).toBeGreaterThan(0);
    expect(suggestedCollectionAmount(loan, installment)).toBeGreaterThan(
      installment.scheduledAmount,
    );
  });
});
