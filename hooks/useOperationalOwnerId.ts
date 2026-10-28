import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAllProfiles } from "@/hooks/useAdmin";

/** ID do admin — dados operacionais (clientes, empréstimos) ficam sob a conta líder. */
export function useOperationalOwnerId(): string {
  const { user } = useAuth();
  const { data: profiles } = useAllProfiles(Boolean(user));

  return useMemo(() => {
    const adminId = profiles?.find((p) => p.role === "admin")?.$id;
    return adminId ?? user?.$id ?? "";
  }, [profiles, user?.$id]);
}
