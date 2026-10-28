import { buildOverdueList } from "@/utils/overdue-list";
import type { Loan, LoanInstallment } from "@/types/loan";

const loan: Loan = {
  $id: "l1",
  ownerId: "o1",
  customerId: "c1",
  customerName: "Maria",
  principal: 1000,
  interestRate: 10,
  interestMode: "on_contract",
  frequency: "monthly",
  installmentCount: 2,
  startDate: "2026-01-01",
  firstDueDate: "2026-06-01",
  skipWeekends: false,
  lateFeeMode: "none",
  lateFeeValue: 0,
  totalInterest: 100,
  totalReceivable: 1100,
  status: "active",
  clientRequestId: "x",
  $createdAt: "2026-01-01",
};

describe("overdue-list", () => {
  it("lists overdue installments with route and days late", () => {
    const installments: LoanInstallment[] = [
      {
        $id: "i1",
        loanId: "l1",
        ownerId: "o1",
        installmentNumber: 1,
        dueDate: "2026-06-01",
        scheduledAmount: 550,
        paidAmount: 0,
        status: "overdue",
      },
      {
        $id: "i2",
        loanId: "l1",
        ownerId: "o1",
        installmentNumber: 2,
        dueDate: "2026-07-01",
        scheduledAmount: 550,
        paidAmount: 0,
        status: "pending",
      },
    ];
    const list = buildOverdueList(
      installments,
      [loan],
      new Map([["c1", "r1"]]),
      new Map([["r1", "Centro"]]),
      new Date("2026-06-17T12:00:00"),
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.customerName).toBe("Maria");
    expect(list[0]?.routeName).toBe("Centro");
    expect(list[0]?.amountDue).toBe(550);
    expect(list[0]?.daysLate).toBeGreaterThan(0);
  });
});
