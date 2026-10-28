import type { Profile } from "@/types/profile";
import type { LoanInput } from "@/types/loan";

export function enrichLoanInputWithManager(
  input: LoanInput,
  profile: Profile | null,
): LoanInput {
  if (input.managerId) return input;
  if (profile?.role === "manager") {
    return {
      ...input,
      managerId: profile.$id,
      managerName: profile.fullName?.trim() || profile.email,
    };
  }
  return input;
}
