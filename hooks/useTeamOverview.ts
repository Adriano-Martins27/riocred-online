import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useLoans } from "@/hooks/useLoans";
import {
  listAllProfiles,
  listManagerRouteAccess,
  listRoutes,
} from "@/services/admin";
import type { Customer } from "@/types/customer";
import type { Profile } from "@/types/profile";
import type { Route } from "@/types/route";

export type RouteOverview = Route & {
  customerCount: number;
  managerCount: number;
  managerNames: string[];
  customers: Pick<Customer, "$id" | "fullName" | "phone" | "active">[];
};

export type ManagerOverview = Profile & {
  routeIds: string[];
  routeNames: string[];
  customerCount: number;
};

export function useTeamOverview(enabled = true) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { data: customers } = useCustomers();
  const { data: loans } = useLoans();

  const routesQuery = useQuery({
    queryKey: ["routes"],
    queryFn: listRoutes,
    enabled: enabled && isAdmin,
  });

  const profilesQuery = useQuery({
    queryKey: ["all-profiles"],
    queryFn: listAllProfiles,
    enabled: enabled && isAdmin,
  });

  const accessQuery = useQuery({
    queryKey: ["manager-route-access-all"],
    queryFn: listManagerRouteAccess,
    enabled: enabled && isAdmin,
  });

  const overview = useMemo(() => {
    const routes = routesQuery.data ?? [];
    const profiles = profilesQuery.data ?? [];
    const access = accessQuery.data ?? [];
    const customerList = customers ?? [];

    const routeNameById = new Map(routes.map((r) => [r.$id, r.name]));
    const managers = profiles.filter((p) => p.role === "manager");

    const routesByManager = new Map<string, string[]>();
    const managersByRoute = new Map<string, string[]>();

    for (const row of access) {
      const list = routesByManager.get(row.managerId) ?? [];
      list.push(row.routeId);
      routesByManager.set(row.managerId, list);

      const mgrs = managersByRoute.get(row.routeId) ?? [];
      const mgr = managers.find((m) => m.$id === row.managerId);
      if (mgr) {
        mgrs.push(mgr.fullName || mgr.email);
      }
      managersByRoute.set(row.routeId, mgrs);
    }

    const customersByRoute = new Map<
      string,
      Pick<Customer, "$id" | "fullName" | "phone" | "active">[]
    >();
    for (const c of customerList) {
      if (!c.routeId) continue;
      const list = customersByRoute.get(c.routeId) ?? [];
      list.push({
        $id: c.$id,
        fullName: c.fullName,
        phone: c.phone,
        active: c.active,
      });
      customersByRoute.set(c.routeId, list);
    }

    const routeOverviews: RouteOverview[] = routes.map((route) => ({
      ...route,
      customerCount: customersByRoute.get(route.$id)?.length ?? 0,
      managerCount: managersByRoute.get(route.$id)?.length ?? 0,
      managerNames: managersByRoute.get(route.$id) ?? [],
      customers: (customersByRoute.get(route.$id) ?? []).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "pt-BR"),
      ),
    }));

    const managerOverviews: ManagerOverview[] = managers.map((mgr) => {
      const routeIds = routesByManager.get(mgr.$id) ?? [];
      const routeNames = routeIds.map((id) => routeNameById.get(id) ?? "—");
      const customerCount = routeIds.reduce(
        (sum, id) => sum + (customersByRoute.get(id)?.length ?? 0),
        0,
      );
      return {
        ...mgr,
        routeIds,
        routeNames,
        customerCount,
      };
    });

    const activeLoans = loans?.filter((l) => l.status === "active").length ?? 0;

    return {
      routeOverviews,
      managerOverviews,
      stats: {
        managers: managers.length,
        pending: managers.filter((m) => !m.isApproved).length,
        routes: routes.length,
        customersWithRoute: customerList.filter((c) => c.routeId).length,
        activeLoans,
      },
    };
  }, [
    routesQuery.data,
    profilesQuery.data,
    accessQuery.data,
    customers,
    loans,
  ]);

  return {
    ...overview,
    isLoading:
      routesQuery.isLoading ||
      profilesQuery.isLoading ||
      accessQuery.isLoading,
    isAdmin,
  };
}
