import type { Customer } from "@/types/customer";
import type { Loan } from "@/types/loan";
import type { Route } from "@/types/route";

export function filterRoutesForManager(
  routes: Route[],
  allowedRouteIds: Set<string> | null,
): Route[] {
  if (!allowedRouteIds) return routes;
  return routes.filter((r) => allowedRouteIds.has(r.$id));
}

export function filterCustomersByRoutes(
  customers: Customer[],
  allowedRouteIds: Set<string> | null,
): Customer[] {
  if (!allowedRouteIds) return customers;
  if (allowedRouteIds.size === 0) return [];
  return customers.filter((c) => c.routeId && allowedRouteIds.has(c.routeId));
}

export function filterLoansByCustomers(
  loans: Loan[],
  customers: Customer[],
): Loan[] {
  const customerIds = new Set(customers.map((c) => c.$id));
  return loans.filter((l) => customerIds.has(l.customerId));
}

/** Funcionário vê empréstimos atrelados a ele; legado sem managerId usa rota do cliente. */
export function filterLoansForManager(
  loans: Loan[],
  customers: Customer[],
  managerId: string | undefined,
  allowedRouteIdSet: Set<string> | null,
): Loan[] {
  if (!managerId && !allowedRouteIdSet) return loans;

  const scopedCustomerIds = new Set(
    filterCustomersByRoutes(customers, allowedRouteIdSet).map((c) => c.$id),
  );

  return loans.filter((loan) => {
    if (loan.managerId && managerId) {
      return loan.managerId === managerId;
    }
    return scopedCustomerIds.has(loan.customerId);
  });
}

export function loanBelongsToManager(
  loan: Loan,
  managerId: string,
  customerRouteMap: Map<string, string>,
  managerRouteIds: Set<string>,
): boolean {
  if (loan.managerId) return loan.managerId === managerId;
  const routeId = customerRouteMap.get(loan.customerId) ?? "";
  return managerRouteIds.has(routeId);
}

export function canManagerAssignRoute(
  routeId: string,
  allowedRouteIds: Set<string> | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!routeId) return false;
  return allowedRouteIds?.has(routeId) ?? false;
}

export type ManagerRouteAccessRow = {
  managerId: string;
  routeId: string;
};

export function routeIdsForManager(
  managerId: string,
  access: ManagerRouteAccessRow[],
): Set<string> {
  return new Set(
    access.filter((a) => a.managerId === managerId).map((a) => a.routeId),
  );
}

/** routeId → nome(s) do(s) funcionário(s) atribuído(s) à rota. */
export function buildRouteManagerNames(
  access: ManagerRouteAccessRow[],
  profiles: { $id: string; fullName: string; email: string }[],
): Map<string, string> {
  const nameById = new Map(
    profiles.map((p) => [p.$id, p.fullName?.trim() || p.email]),
  );
  const byRoute = new Map<string, string[]>();

  for (const row of access) {
    const name = nameById.get(row.managerId);
    if (!name) continue;
    const list = byRoute.get(row.routeId) ?? [];
    if (!list.includes(name)) list.push(name);
    byRoute.set(row.routeId, list);
  }

  return new Map(
    [...byRoute.entries()].map(([routeId, names]) => [
      routeId,
      names.join(", "),
    ]),
  );
}
