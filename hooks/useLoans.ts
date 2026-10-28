import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/useCustomers";
import { useManagerScope } from "@/hooks/useManagerScope";
import { useOperationalOwnerId } from "@/hooks/useOperationalOwnerId";
import { listLoanPayments } from "@/services/loan-payments";
import {
  createLoanWithInstallments,
  deleteLoanCascade,
  listInstallments,
  listLoans,
  registerPayment,
  updateLoanWithInstallments,
} from "@/services/loans";
import type { Loan, LoanInput, PaymentInput } from "@/types/loan";
import { buildLoanSummary } from "@/utils/loan-summary";
import { enrichLoanInputWithManager } from "@/utils/loan-manager";
import { sumCashReceived } from "@/utils/financial-metrics";

export function useLoans() {
  const ownerId = useOperationalOwnerId();

  return useQuery({
    queryKey: ["loans", ownerId],
    queryFn: () => listLoans(ownerId),
    enabled: Boolean(ownerId),
  });
}

export function useInstallments(loanId?: string) {
  const ownerId = useOperationalOwnerId();

  return useQuery({
    queryKey: ["installments", ownerId, loanId ?? "all"],
    queryFn: () => listInstallments(ownerId, loanId),
    enabled: Boolean(ownerId),
  });
}

export function useLoanPayments(loanId?: string) {
  const ownerId = useOperationalOwnerId();

  return useQuery({
    queryKey: ["loan-payments", ownerId, loanId ?? "all"],
    queryFn: () => listLoanPayments(ownerId, loanId),
    enabled: Boolean(ownerId),
  });
}

export function usePortfolioSummary() {
  const { data: loans } = useLoans();
  const { data: installments } = useInstallments();
  const { data: payments } = useLoanPayments();
  const { data: customers } = useCustomers();
  const { filterLoans } = useManagerScope();

  const scoped = useMemo(() => {
    if (!loans || !customers) return null;
    const scopedLoans = filterLoans(loans, customers);
    const loanIds = new Set(scopedLoans.map((l) => l.$id));
    return {
      loans: scopedLoans,
      installments: installments?.filter((i) => loanIds.has(i.loanId)) ?? [],
      payments: payments?.filter((p) => loanIds.has(p.loanId)) ?? [],
    };
  }, [loans, customers, installments, payments, filterLoans]);

  if (!scoped || !installments || !payments) {
    return null;
  }

  let activeLoans = 0;
  let paidInstallments = 0;
  let openInstallments = 0;
  let overdueInstallments = 0;
  let totalReceivable = 0;
  let totalRemaining = 0;
  let portfolioPrincipal = 0;

  for (const loan of scoped.loans) {
    const insts = scoped.installments.filter((i) => i.loanId === loan.$id);
    const summary = buildLoanSummary(loan, insts, scoped.payments);
    if (loan.status === "active") {
      activeLoans++;
      portfolioPrincipal += loan.principal;
    }
    paidInstallments += insts.filter((i) => i.status === "paid").length;
    openInstallments += summary.openCount;
    overdueInstallments += summary.overdueCount;
    totalReceivable += loan.totalReceivable;
    totalRemaining += summary.remaining;
  }

  const totalReceived = sumCashReceived(scoped.payments);

  return {
    activeLoans,
    paidInstallments,
    openInstallments,
    overdueInstallments,
    totalReceivable,
    totalRemaining,
    totalReceived,
    portfolioPrincipal,
  };
}

export function useLoanMutations() {
  const { profile } = useAuth();
  const ownerId = useOperationalOwnerId();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["loans", ownerId] });
    queryClient.invalidateQueries({ queryKey: ["installments", ownerId] });
    queryClient.invalidateQueries({ queryKey: ["loan-payments", ownerId] });
  };

  const create = useMutation({
    mutationFn: (input: LoanInput) =>
      createLoanWithInstallments(
        ownerId,
        enrichLoanInputWithManager(input, profile),
      ),
    onSuccess: invalidate,
  });

  const pay = useMutation({
    mutationFn: ({
      loan,
      input,
    }: {
      loan: Loan;
      input: PaymentInput;
    }) => registerPayment(loan, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (loanId: string) => deleteLoanCascade(ownerId, loanId),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ loan, input }: { loan: Loan; input: LoanInput }) =>
      updateLoanWithInstallments(
        loan,
        enrichLoanInputWithManager(input, profile),
      ),
    onSuccess: invalidate,
  });

  return { create, pay, remove, update };
}
