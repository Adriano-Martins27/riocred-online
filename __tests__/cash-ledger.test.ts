import { buildCashSummary } from "@/utils/cash-ledger";
import { buildReport } from "@/utils/report-pdf";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";
import type { Payable } from "@/types/payable";

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
  managerId: "m1",
  managerName: "Ana",
  $createdAt: "2026-01-01",
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
];

const payments: LoanPayment[] = [
  {
    $id: "p1",
    loanId: "l1",
    installmentId: "i1",
    ownerId: "o1",
    amount: 120,
    interestAmount: 120,
    principalAmount: 0,
    discountAmount: 0,
    paymentMethod: "pix",
    paymentType: "interest_only",
    notes: "",
    paidAt: "2026-06-17",
    $createdAt: "",
  },
];

describe("cash-ledger", () => {
  it("includes interest-only payments in caixa inflow", () => {
    const { summary } = buildCashSummary(payments, [loan], [], {
      mode: "days",
      days: 30,
    });
    expect(summary.inflow).toBe(120);
    expect(summary.interestOnly).toBe(120);
    expect(summary.installments).toBe(0);
  });

  it("filters inflows by route and excludes payables when route is selected", () => {
    const loanR1: Loan = { ...loan, $id: "l1", customerId: "c1" };
    const loanR2: Loan = {
      ...loan,
      $id: "l2",
      customerId: "c2",
      customerName: "João",
    };
    const routePayments: LoanPayment[] = [
      payments[0]!,
      {
        ...payments[0]!,
        $id: "p2",
        loanId: "l2",
        amount: 80,
        paidAt: "2026-06-16",
      },
    ];
    const payables: Payable[] = [
      {
        $id: "pay1",
        ownerId: "o1",
        name: "Aluguel",
        amount: 50,
        dueDate: "2026-06-10",
        category: "fixo",
        notes: "",
        status: "paid",
        $createdAt: "",
      },
    ];
    const customerRouteMap = new Map([
      ["c1", "r1"],
      ["c2", "r2"],
    ]);

    const all = buildCashSummary(
      routePayments,
      [loanR1, loanR2],
      payables,
      { mode: "days", days: 30 },
    );
    expect(all.summary.inflow).toBe(200);
    expect(all.summary.outflow).toBe(50);

    const r1Only = buildCashSummary(
      routePayments,
      [loanR1, loanR2],
      payables,
      { mode: "days", days: 30 },
      { routeId: "r1", customerRouteMap },
    );
    expect(r1Only.summary.inflow).toBe(120);
    expect(r1Only.summary.outflow).toBe(0);
    expect(r1Only.movements).toHaveLength(1);
  });
});

describe("buildReport caixa", () => {
  it("counts interest-only in period received and breakdown", () => {
    const report = buildReport(
      [loan],
      installments,
      { days: 30 },
      payments,
      [],
    );

    expect(report.summary.received).toBe(120);
    expect(report.summary.receivedInterest).toBe(120);
    expect(report.rows[0]?.received).toBe(120);
    expect(report.rows[0]?.totalReceived).toBe(120);
    expect(report.rows[0]?.remaining).toBe(1100);
  });

  it("subtracts paid payables from cash balance", () => {
    const payables: Payable[] = [
      {
        $id: "pay1",
        ownerId: "o1",
        name: "Aluguel",
        amount: 50,
        dueDate: "2026-06-10",
        category: "fixo",
        notes: "",
        status: "paid",
        $createdAt: "",
      },
    ];

    const report = buildReport(
      [loan],
      installments,
      { days: 30 },
      payments,
      payables,
    );

    expect(report.summary.paidOut).toBe(50);
    expect(report.summary.cashBalance).toBe(70);
  });

  it("filters report rows by manager route assignment", () => {
    const loanR2: Loan = {
      ...loan,
      $id: "l2",
      customerId: "c2",
      customerName: "João",
      managerId: "m2",
      managerName: "Bruno",
    };
    const customerRouteMap = new Map([
      ["c1", "r1"],
      ["c2", "r2"],
    ]);
    const routeManagerNames = new Map([
      ["r1", "Ana"],
      ["r2", "Bruno"],
    ]);

    const all = buildReport(
      [loan, loanR2],
      installments,
      { days: 30, customerRouteMap, routeManagerNames },
      payments,
      [],
    );
    expect(all.rows).toHaveLength(2);

    const anaOnly = buildReport(
      [loan, loanR2],
      installments,
      {
        days: 30,
        customerRouteMap,
        routeManagerNames,
        filterManagerId: "m1",
        managerRouteIds: new Set(["r1"]),
      },
      payments,
      [],
    );
    expect(anaOnly.rows).toHaveLength(1);
    expect(anaOnly.rows[0]?.managerName).toBe("Ana");
  });
});
