import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  createRoute,
  deleteRoute,
  getManagerRouteIds,
  listAllProfiles,
  listRoutes,
  setManagerAccess,
  updateRoute,
} from "@/services/admin";

export function useRoutes() {
  return useQuery({
    queryKey: ["routes"],
    queryFn: listRoutes,
  });
}

export function useAllProfiles(enabled = true) {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: listAllProfiles,
    enabled,
  });
}

export function useManagerRoutes(managerId: string | undefined) {
  return useQuery({
    queryKey: ["manager-routes", managerId],
    queryFn: () => getManagerRouteIds(managerId!),
    enabled: Boolean(managerId),
  });
}

export function useAdminMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["routes"] });
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
    qc.invalidateQueries({ queryKey: ["manager-routes"] });
    qc.invalidateQueries({ queryKey: ["manager-route-access-all"] });
  };

  const createRouteMut = useMutation({
    mutationFn: ({ createdBy, name }: { createdBy: string; name: string }) =>
      createRoute(createdBy, { name }),
    onSuccess: invalidate,
  });

  const deleteRouteMut = useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: invalidate,
  });

  const updateRouteMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateRoute(id, name),
    onSuccess: invalidate,
  });

  const setAccess = useMutation({
    mutationFn: ({
      managerId,
      isApproved,
      routeIds,
      canViewFinancials,
      canEditCustomers,
      canDeleteCustomers,
    }: {
      managerId: string;
      isApproved: boolean;
      routeIds: string[];
      canViewFinancials?: boolean;
      canEditCustomers?: boolean;
      canDeleteCustomers?: boolean;
    }) =>
      setManagerAccess(
        managerId,
        isApproved,
        routeIds,
        canViewFinancials ?? false,
        canEditCustomers ?? true,
        canDeleteCustomers ?? false,
      ),
    onSuccess: invalidate,
  });

  return { createRouteMut, deleteRouteMut, updateRouteMut, setAccess };
}
