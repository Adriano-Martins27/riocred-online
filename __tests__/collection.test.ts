import { maskBRLInput, parseBRLInput } from "@/utils/currency";
import { suggestedCollectionAmount } from "@/utils/late-fee";
import type { Loan, LoanInstallment } from "@/types/loan";

const loan: Loan = {
  $id: "l1",
  ownerId: "o1",
  customerId: "c1",
  customerName: "Test",
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

const inst: LoanInstallment = {
  $id: "i1",
  loanId: "l1",
  ownerId: "o1",
  installmentNumber: 1,
  dueDate: "2020-01-01",
  scheduledAmount: 1100,
  paidAmount: 0,
  status: "overdue",
};

describe("collection flow helpers", () => {
  it("initializes payment amount from suggested collection", () => {
    const suggested = suggestedCollectionAmount(loan, inst);
    const masked = maskBRLInput(String(Math.round(suggested * 100)));
    expect(parseBRLInput(masked)).toBeCloseTo(suggested, 2);
  });

  it("parses masked payment input consistently", () => {
    expect(parseBRLInput(maskBRLInput("55000"))).toBe(550);
    expect(parseBRLInput("550,00")).toBe(550);
  });
});
