import { useManagerPermissions } from "@/hooks/useManagerPermissions";

/** @deprecated Prefer useManagerPermissions */
export function useFinancialVisibility() {
  const { isAdmin, canViewFinancials } = useManagerPermissions();
  return { isAdmin, canViewFinancials };
}
