import { useMemo } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useManagerScope } from "@/hooks/useManagerScope";
import {
  useInstallments,
  useLoanPayments,
  useLoans,
} from "@/hooks/useLoans";
import type { Customer } from "@/types/customer";
import type { Loan, LoanInstallment, LoanPayment } from "@/types/loan";

export function useScopedData() {
  const { data: rawCustomers, ...customersQuery } = useCustomers();
  const { data: rawLoans, ...loansQuery } = useLoans();
  const { data: rawInstallments, ...installmentsQuery } = useInstallments();
  const { data: rawPayments, ...paymentsQuery } = useLoanPayments();
  const scope = useManagerScope();

  const customers = useMemo(
    () => (rawCustomers ? scope.filterCustomers(rawCustomers) : undefined),
    [rawCustomers, scope],
  );

  const loans = useMemo(() => {
    if (!rawLoans || !rawCustomers) return undefined;
    return scope.filterLoans(rawLoans, rawCustomers);
  }, [rawLoans, rawCustomers, scope]);

  const loanIds = useMemo(
    () => new Set((loans ?? []).map((l) => l.$id)),
    [loans],
  );

  const installments = useMemo(
    () =>
      rawInstallments
        ? rawInstallments.filter((i) => loanIds.has(i.loanId))
        : undefined,
    [rawInstallments, loanIds],
  );

  const payments = useMemo(
    () =>
      rawPayments
        ? rawPayments.filter((p) => loanIds.has(p.loanId))
        : undefined,
    [rawPayments, loanIds],
  );

  const customerIds = useMemo(
    () => new Set((customers ?? []).map((c) => c.$id)),
    [customers],
  );

  return {
    customers,
    loans,
    installments,
    payments,
    customerIds,
    loanIds,
    routes: scope.routes,
    isAdmin: scope.isAdmin,
    isManager: scope.isManager,
    canManageRoutes: scope.canManageRoutes,
    canAssignRoute: scope.canAssignRoute,
    allowedRouteIdSet: scope.allowedRouteIdSet,
    scopeLoading: scope.isLoading,
    customersQuery,
    loansQuery,
    installmentsQuery,
    paymentsQuery,
  };
}

export function scopedCustomerRouteMap(
  customers: Customer[],
): Map<string, string> {
  return new Map(customers.map((c) => [c.$id, c.routeId]));
}

export function scopedCustomerPhoneMap(
  customers: Customer[],
): Map<string, string> {
  return new Map(customers.map((c) => [c.$id, c.phone]));
}
