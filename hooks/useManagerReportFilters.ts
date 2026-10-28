import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAllProfiles } from "@/hooks/useAdmin";
import { useManagerScope } from "@/hooks/useManagerScope";
import { listManagerRouteAccess } from "@/services/admin";
import {
  buildRouteManagerNames,
  routeIdsForManager,
} from "@/utils/manager-scope";

export type ManagerOption = {
  id: string;
  name: string;
  routeIds: string[];
};

export function useManagerReportFilters() {
  const { profile } = useAuth();
  const scope = useManagerScope();
  const isAdmin = scope.isAdmin;

  const { data: access } = useQuery({
    queryKey: ["manager-route-access-all"],
    queryFn: listManagerRouteAccess,
    enabled: isAdmin,
  });

  const { data: profiles } = useAllProfiles(isAdmin);

  const routeManagerNames = useMemo(
    () => buildRouteManagerNames(access ?? [], profiles ?? []),
    [access, profiles],
  );

  const managers = useMemo((): ManagerOption[] => {
    if (!profiles || !access) return [];
    return profiles
      .filter((p) => p.role === "manager" && p.isApproved)
      .map((p) => ({
        id: p.$id,
        name: p.fullName?.trim() || p.email,
        routeIds: [...routeIdsForManager(p.$id, access)],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [profiles, access]);

  const managerLabel =
    profile?.fullName?.trim() || profile?.email || "Funcionário";

  const getManagerRouteIds = useCallback(
    (id: string) => routeIdsForManager(id, access ?? []),
    [access],
  );

  return {
    isAdmin,
    isManager: scope.isManager,
    managers,
    routeManagerNames,
    managerLabel,
    assignedRoutes: scope.routes ?? [],
    assignedRouteIds: scope.allowedRouteIds,
    getManagerRouteIds,
  };
}
