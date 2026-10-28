import type { Customer } from "@/types/customer";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";
import {
  buildDashboardMetrics,
  formatWeeklyDelta,
  startOfWeek,
} from "@/utils/dashboard-metrics";

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
  $createdAt: "2026-06-16T10:00:00.000Z",
};

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

const payments: LoanPayment[] = [
  {
    $id: "p1",
    loanId: "l1",
    installmentId: "i1",
    ownerId: "o1",
    amount: 50,
    interestAmount: 50,
    principalAmount: 0,
    discountAmount: 0,
    paymentMethod: "pix",
    paymentType: "interest_only",
    notes: "",
    paidAt: "2026-06-10",
    $createdAt: "",
  },
];

const customers: Customer[] = [
  {
    $id: "c1",
    ownerId: "o1",
    fullName: "Maria",
    cpf: "000",
    phone: "11999999999",
    clientType: "",
    billingType: "emprestimo",
    referrerName: "",
    referrerPhone: "",
    routeId: "r1",
    active: true,
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
    photoFileId: "",
    photoUpdatedAt: "",
    clientRequestId: "",
    $createdAt: "2026-06-15T10:00:00.000Z",
  },
];

describe("dashboard-metrics", () => {
  const now = new Date("2026-06-17T12:00:00");

  it("computes portfolio totals and weekly deltas", () => {
    const m = buildDashboardMetrics(
      [loan],
      installments,
      payments,
      customers,
      now,
    );

    expect(m.totalLoans).toBe(1);
    expect(m.loansThisWeek).toBe(1);
    expect(m.activeContracts).toBe(1);
    expect(m.totalCustomers).toBe(1);
    expect(m.customersThisWeek).toBe(1);
    expect(m.totalReceived).toBe(50);
    expect(m.totalToReceive).toBe(1100);
    expect(m.pendingInterest).toBe(50);
    expect(m.capitalOut).toBe(1000);
  });

  it("startOfWeek returns Monday", () => {
    const monday = startOfWeek(new Date("2026-06-17T12:00:00"));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(15);
  });

  it("formatWeeklyDelta", () => {
    expect(formatWeeklyDelta(3)).toBe("+3 esta semana");
    expect(formatWeeklyDelta(0)).toBe("+0 esta semana");
  });
});
