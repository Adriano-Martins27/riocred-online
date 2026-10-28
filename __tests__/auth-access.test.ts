import {
  canAccessApp,
  isPendingManager,
  PendingApprovalError,
  SignUpPendingError,
} from "@/utils/auth-access";
import type { Profile } from "@/types/profile";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    $id: "u1",
    fullName: "Test",
    email: "t@test.com",
    role: "manager",
    isApproved: false,
    ...overrides,
  };
}

describe("auth-access", () => {
  it("allows approved managers and admins", () => {
    expect(canAccessApp(profile({ isApproved: true }))).toBe(true);
    expect(canAccessApp(profile({ role: "admin", isApproved: false }))).toBe(
      true,
    );
  });

  it("blocks unapproved managers", () => {
    expect(canAccessApp(profile())).toBe(false);
    expect(isPendingManager(profile())).toBe(true);
    expect(isPendingManager(profile({ isApproved: true }))).toBe(false);
    expect(isPendingManager(profile({ role: "admin" }))).toBe(false);
  });

  it("exposes typed auth errors", () => {
    expect(new PendingApprovalError().name).toBe("PendingApprovalError");
    expect(new SignUpPendingError().name).toBe("SignUpPendingError");
  });
});
