import { enrichLoanInputWithManager } from "@/utils/loan-manager";
import type { LoanInput } from "@/types/loan";
import type { Profile } from "@/types/profile";

const baseInput: LoanInput = {
  customerId: "c1",
  customerName: "Maria",
  principal: 1000,
  interestRate: 10,
  interestMode: "on_contract",
  frequency: "monthly",
  installmentCount: 12,
  startDate: "2026-01-01",
  firstDueDate: "2026-06-01",
  skipWeekends: true,
};

describe("loan-manager", () => {
  it("assigns manager profile on create for funcionário", () => {
    const profile: Profile = {
      $id: "m1",
      fullName: "Ana",
      email: "a@x.com",
      role: "manager",
      isApproved: true,
      canViewFinancials: false,
    };
    const result = enrichLoanInputWithManager(baseInput, profile);
    expect(result.managerId).toBe("m1");
    expect(result.managerName).toBe("Ana");
  });
});
