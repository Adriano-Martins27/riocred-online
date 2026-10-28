import { simulateLoan } from "@/utils/loan-simulator";

describe("simulateLoan", () => {
  const base = {
    principal: 1000,
    interestRate: 10,
    interestMode: "on_contract" as const,
    frequency: "monthly" as const,
    installmentCount: 4,
    firstDueDate: "2026-01-15",
    skipWeekends: false,
  };

  it("calculates on_contract interest once", () => {
    const result = simulateLoan(base);
    expect(result.totalInterest).toBe(100);
    expect(result.totalReceivable).toBe(1100);
    expect(result.installmentAmount).toBe(275);
    expect(result.installments).toHaveLength(4);
  });

  it("sums installments to total receivable", () => {
    const result = simulateLoan({ ...base, principal: 999.99, installmentCount: 3 });
    const sum = result.installments.reduce((s, i) => s + i.scheduledAmount, 0);
    expect(sum).toBeCloseTo(result.totalReceivable, 2);
  });

  it("calculates per_installment interest", () => {
    const result = simulateLoan({
      ...base,
      interestMode: "per_installment",
      installmentCount: 2,
    });
    expect(result.totalInterest).toBe(200);
    expect(result.totalReceivable).toBe(1200);
  });

  it("skips weekends when enabled", () => {
    const result = simulateLoan({
      ...base,
      firstDueDate: "2026-01-09",
      frequency: "daily",
      installmentCount: 2,
      skipWeekends: true,
    });
    expect(result.installments[0].dueDate).toBe("2026-01-09");
    expect(result.installments[1].dueDate).toBe("2026-01-12");
  });

  it("caps installments between 1 and 36", () => {
    const few = simulateLoan({ ...base, installmentCount: 0 });
    expect(few.installments).toHaveLength(1);
    const many = simulateLoan({ ...base, installmentCount: 100 });
    expect(many.installments).toHaveLength(36);
  });
});
