import type { LoanPayment } from "@/types/loan";
import {
  buildPaymentsTrend,
  monthKey,
  paymentMonthKey,
} from "@/utils/payments-trend";

function payment(
  partial: Partial<LoanPayment> & Pick<LoanPayment, "amount" | "paidAt">,
): LoanPayment {
  return {
    $id: "p1",
    loanId: "l1",
    installmentId: "i1",
    ownerId: "o1",
    interestAmount: 0,
    principalAmount: partial.amount,
    discountAmount: 0,
    paymentMethod: "pix",
    paymentType: "installment",
    notes: "",
    $createdAt: "",
    ...partial,
  };
}

describe("paymentMonthKey", () => {
  it("extracts YYYY-MM from date string", () => {
    expect(paymentMonthKey("2026-06-17")).toBe("2026-06");
    expect(paymentMonthKey("2026-06-17T15:30:00.000Z")).toBe("2026-06");
  });
});

describe("buildPaymentsTrend", () => {
  const now = new Date(2026, 5, 17); // June 2026

  it("groups by paidAt, not installment due date", () => {
    const trend = buildPaymentsTrend(
      [
        payment({ amount: 550, paidAt: "2026-06-10" }),
        payment({ amount: 200, paidAt: "2026-06-15" }),
      ],
      6,
      now,
    );

    expect(trend.months).toContain(monthKey(now));
    const juneIdx = trend.months.indexOf("2026-06");
    expect(trend.data[juneIdx]).toBe(750);
  });

  it("ignores payments outside the window", () => {
    const trend = buildPaymentsTrend(
      [payment({ amount: 100, paidAt: "2025-01-01" })],
      6,
      now,
    );

    expect(trend.data.every((v) => v === 0)).toBe(true);
  });

  it("returns zero series when no payments", () => {
    const trend = buildPaymentsTrend([], 6, now);
    expect(trend.data).toHaveLength(6);
    expect(trend.data.every((v) => v === 0)).toBe(true);
  });
});
