import type { Profile } from "@/types/profile";

export class PendingApprovalError extends Error {
  constructor(
    message = "Sua conta aguarda aprovação de um administrador antes de acessar o sistema.",
  ) {
    super(message);
    this.name = "PendingApprovalError";
  }
}

export class SignUpPendingError extends Error {
  constructor(
    message = "Conta criada com sucesso! Aguarde a aprovação de um administrador para entrar.",
  ) {
    super(message);
    this.name = "SignUpPendingError";
  }
}

export function canAccessApp(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.role === "manager" && profile.isApproved;
}

export function isPendingManager(profile: Profile | null): boolean {
  return profile?.role === "manager" && !profile.isApproved;
}

export function assertCanAccess(profile: Profile | null): void {
  if (isPendingManager(profile)) {
    throw new PendingApprovalError();
  }
}
