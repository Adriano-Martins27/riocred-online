export type ManagerRouteAccessRow = {
  managerId: string;
  routeId: string;
};

export type ManagerProfile = {
  id: string;
  name: string;
  role: string;
  isApproved: boolean;
};

export type LoanBackfillRow = {
  id: string;
  customerId: string;
  managerId: string;
  managerName: string;
};

export type CustomerRouteRow = {
  id: string;
  routeId: string;
};

export type LoanManagerBackfillPlan = {
  loanId: string;
  customerId: string;
  routeId: string;
  managerId: string;
  managerName: string;
};

export type LoanManagerBackfillSkip = {
  loanId: string;
  customerId: string;
  reason: string;
};

export type LoanManagerBackfillResult = {
  updates: LoanManagerBackfillPlan[];
  skips: LoanManagerBackfillSkip[];
  routeConflicts: { routeId: string; managerIds: string[] }[];
};

function managerDisplayName(profile: ManagerProfile): string {
  return profile.name.trim() || profile.id;
}

export function buildRouteManagerMap(
  accessRows: ManagerRouteAccessRow[],
  profiles: ManagerProfile[],
): {
  routeManagerMap: Map<string, { managerId: string; managerName: string }>;
  routeConflicts: { routeId: string; managerIds: string[] }[];
} {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const managersByRoute = new Map<string, string[]>();

  for (const row of accessRows) {
    if (!row.routeId || !row.managerId) continue;
    const profile = profileById.get(row.managerId);
    if (!profile || profile.role !== "manager" || !profile.isApproved) continue;
    const list = managersByRoute.get(row.routeId) ?? [];
    if (!list.includes(row.managerId)) list.push(row.managerId);
    managersByRoute.set(row.routeId, list);
  }

  const routeManagerMap = new Map<
    string,
    { managerId: string; managerName: string }
  >();
  const routeConflicts: { routeId: string; managerIds: string[] }[] = [];

  for (const [routeId, managerIds] of managersByRoute) {
    if (managerIds.length > 1) {
      routeConflicts.push({ routeId, managerIds });
    }
    const sorted = [...managerIds].sort((a, b) => {
      const nameA = managerDisplayName(profileById.get(a)!);
      const nameB = managerDisplayName(profileById.get(b)!);
      return nameA.localeCompare(nameB, "pt-BR");
    });
    const chosenId = sorted[0]!;
    const chosen = profileById.get(chosenId)!;
    routeManagerMap.set(routeId, {
      managerId: chosenId,
      managerName: managerDisplayName(chosen),
    });
  }

  return { routeManagerMap, routeConflicts };
}

export function planLoanManagerBackfill(
  loans: LoanBackfillRow[],
  customers: CustomerRouteRow[],
  accessRows: ManagerRouteAccessRow[],
  profiles: ManagerProfile[],
  options?: { force?: boolean },
): LoanManagerBackfillResult {
  const force = options?.force ?? false;
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const { routeManagerMap, routeConflicts } = buildRouteManagerMap(
    accessRows,
    profiles,
  );

  const updates: LoanManagerBackfillPlan[] = [];
  const skips: LoanManagerBackfillSkip[] = [];

  for (const loan of loans) {
    if (!force && loan.managerId.trim()) {
      skips.push({
        loanId: loan.id,
        customerId: loan.customerId,
        reason: "já possui managerId",
      });
      continue;
    }

    const customer = customerById.get(loan.customerId);
    if (!customer) {
      skips.push({
        loanId: loan.id,
        customerId: loan.customerId,
        reason: "cliente não encontrado",
      });
      continue;
    }

    if (!customer.routeId.trim()) {
      skips.push({
        loanId: loan.id,
        customerId: loan.customerId,
        reason: "cliente sem rota",
      });
      continue;
    }

    const manager = routeManagerMap.get(customer.routeId);
    if (!manager) {
      skips.push({
        loanId: loan.id,
        customerId: loan.customerId,
        reason: "nenhum funcionário aprovado na rota do cliente",
      });
      continue;
    }

    if (
      !force &&
      loan.managerId === manager.managerId &&
      loan.managerName === manager.managerName
    ) {
      skips.push({
        loanId: loan.id,
        customerId: loan.customerId,
        reason: "já está correto",
      });
      continue;
    }

    updates.push({
      loanId: loan.id,
      customerId: loan.customerId,
      routeId: customer.routeId,
      managerId: manager.managerId,
      managerName: manager.managerName,
    });
  }

  return { updates, skips, routeConflicts };
}
