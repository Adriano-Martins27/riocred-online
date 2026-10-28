import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerRoutes, useRoutes } from "@/hooks/useAdmin";
import type { Customer } from "@/types/customer";
import type { Loan } from "@/types/loan";
import {
  canManagerAssignRoute,
  filterCustomersByRoutes,
  filterLoansForManager,
  filterRoutesForManager,
} from "@/utils/manager-scope";

export function useManagerScope() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "manager";
  const managerId = isManager ? profile?.$id : undefined;

  const { data: allRoutes, isLoading: routesLoading } = useRoutes();
  const { data: managerRouteIds, isLoading: managerRoutesLoading } =
    useManagerRoutes(managerId);

  const allowedRouteIdSet = useMemo(() => {
    if (isAdmin) return null;
    return new Set(managerRouteIds ?? []);
  }, [isAdmin, managerRouteIds]);

  const routes = useMemo(
    () =>
      allRoutes
        ? filterRoutesForManager(allRoutes, allowedRouteIdSet)
        : undefined,
    [allRoutes, allowedRouteIdSet],
  );

  const filterCustomers = useCallback(
    (customers: Customer[]) =>
      filterCustomersByRoutes(customers, allowedRouteIdSet),
    [allowedRouteIdSet],
  );

  const filterLoans = useCallback(
    (loans: Loan[], customers: Customer[]) =>
      filterLoansForManager(
        loans,
        customers,
        managerId,
        allowedRouteIdSet,
      ),
    [managerId, allowedRouteIdSet],
  );

  const canAssignRoute = useCallback(
    (routeId: string) =>
      canManagerAssignRoute(routeId, allowedRouteIdSet, isAdmin),
    [isAdmin, allowedRouteIdSet],
  );

  const isLoading =
    routesLoading || (isManager && managerRoutesLoading);

  return {
    isAdmin,
    isManager,
    canManageRoutes: isAdmin,
    routes,
    allowedRouteIds: managerRouteIds ?? [],
    allowedRouteIdSet,
    filterCustomers,
    filterLoans,
    canAssignRoute,
    isLoading,
    managerId,
  };
}
