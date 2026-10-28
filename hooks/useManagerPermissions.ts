import { useAuth } from "@/contexts/AuthContext";

/** Permissões configuráveis pelo admin em Aprovações. */
export function useManagerPermissions() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return {
    isAdmin,
    /** Comissão: ligado. Salário: desligado. */
    canViewFinancials:
      isAdmin || Boolean(profile?.canViewFinancials),
    /** Pode alterar clientes já cadastrados. */
    canEditCustomers:
      isAdmin || profile?.canEditCustomers !== false,
    /** Pode excluir clientes. */
    canDeleteCustomers:
      isAdmin || Boolean(profile?.canDeleteCustomers),
  };
}
