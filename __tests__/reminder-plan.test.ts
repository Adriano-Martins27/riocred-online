import { buildReminderPlan, REMINDER_DAYS } from "@/utils/reminder-plan";
import type { Loan, LoanInstallment } from "@/types/loan";

const loan = (id: string, customerName: string): Loan => ({
  $id: id,
  ownerId: "o1",
  customerId: `c-${id}`,
  customerName,
  principal: 1000,
  interestRate: 10,
  interestMode: "on_contract",
  frequency: "daily",
  installmentCount: 3,
  startDate: "2026-06-01",
  firstDueDate: "2026-06-10",
  skipWeekends: false,
  lateFeeMode: "none",
  lateFeeValue: 0,
  totalInterest: 100,
  totalReceivable: 1100,
  status: "active",
  clientRequestId: "x",
  managerId: "m1",
  managerName: "Ana",
  $createdAt: "2026-06-01",
});

const inst = (
  id: string,
  loanId: string,
  dueDate: string,
  scheduledAmount: number,
  extra: Partial<LoanInstallment> = {},
): LoanInstallment => ({
  $id: id,
  loanId,
  ownerId: "o1",
  installmentNumber: 1,
  dueDate,
  scheduledAmount,
  paidAmount: 0,
  status: "pending",
  ...extra,
});

describe("reminder-plan", () => {
  const loans = [loan("l1", "Maria"), loan("l2", "João"), loan("l3", "Pedro")];

  it("schedules today at 8h when opened before 8h, with due and overdue lines", () => {
    const plan = buildReminderPlan(
      [
        inst("i1", "l1", "2026-06-10", 100),
        inst("i2", "l2", "2026-06-10", 50, { paidAmount: 20, status: "partial" }),
        inst("i3", "l3", "2026-06-08", 200, { status: "overdue" }),
      ],
      loans,
      new Date(2026, 5, 10, 7, 0),
    );
    const today = plan[0]!;
    expect(today.id).toBe("riocred-reminder-2026-06-10");
    expect(today.date).toEqual(new Date(2026, 5, 10, 8, 0, 0));
    expect(today.title).toBe("Cobranças de hoje");
    expect(today.body).toContain("2 parcelas vencem hoje");
    expect(today.body).toContain("Maria, João");
    expect(today.body).toContain("1 parcela em atraso");
  });

  it("skips today after 8h and projects unpaid installments as overdue", () => {
    const plan = buildReminderPlan(
      [inst("i1", "l1", "2026-06-10", 100)],
      loans,
      new Date(2026, 5, 10, 9, 0),
    );
    expect(plan[0]!.id).toBe("riocred-reminder-2026-06-11");
    expect(plan[0]!.title).toBe("Parcelas em atraso");
    expect(plan[0]!.body).toContain("1 parcela em atraso");
    expect(plan).toHaveLength(REMINDER_DAYS - 1);
  });

  it("ignores paid installments, unknown loans and empty days", () => {
    const plan = buildReminderPlan(
      [
        inst("i1", "l1", "2026-06-12", 100, { paidAmount: 100, status: "paid" }),
        inst("i2", "other", "2026-06-12", 100),
      ],
      loans,
      new Date(2026, 5, 10, 7, 0),
    );
    expect(plan).toHaveLength(0);
  });

  it("summarizes extra customer names", () => {
    const plan = buildReminderPlan(
      [
        inst("i1", "l1", "2026-06-10", 10),
        inst("i2", "l2", "2026-06-10", 10),
        inst("i3", "l3", "2026-06-10", 10),
      ],
      loans,
      new Date(2026, 5, 10, 7, 0),
    );
    expect(plan[0]!.body).toContain("e +1");
  });
});
