import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { createLoanPayment, listLoanPayments } from "@/services/loan-payments";
import type {
  Loan,
  LoanInput,
  LoanInstallment,
  PaymentInput,
} from "@/types/loan";
import { calculateLateFee } from "@/utils/late-fee";
import { simulateLoan } from "@/utils/loan-simulator";
import { buildPaymentBreakdown } from "@/utils/payment-breakdown";
import { refreshInstallmentStatus } from "@/utils/loan-summary";
import { addToSyncQueue, upsertSnapshot, generateLocalId, getSnapshotByType } from "@/offline/sync";

function mapLoan(doc: Record<string, unknown>): Loan {
  return {
    $id: doc.$id as string,
    ownerId: (doc.ownerId as string) ?? "",
    customerId: (doc.customerId as string) ?? "",
    customerName: (doc.customerName as string) ?? "",
    principal: Number(doc.principal ?? 0),
    interestRate: Number(doc.interestRate ?? 0),
    interestMode: (doc.interestMode as Loan["interestMode"]) ?? "on_contract",
    frequency: (doc.frequency as Loan["frequency"]) ?? "monthly",
    installmentCount: Number(doc.installmentCount ?? 0),
    startDate: (doc.startDate as string) ?? "",
    firstDueDate: (doc.firstDueDate as string) ?? "",
    skipWeekends: Boolean(doc.skipWeekends),
    lateFeeMode: (doc.lateFeeMode as Loan["lateFeeMode"]) ?? "none",
    lateFeeValue: Number(doc.lateFeeValue ?? 0),
    totalInterest: Number(doc.totalInterest ?? 0),
    totalReceivable: Number(doc.totalReceivable ?? 0),
    status: (doc.status as Loan["status"]) ?? "active",
    clientRequestId: (doc.clientRequestId as string) ?? "",
    managerId: (doc.managerId as string) ?? "",
    managerName: (doc.managerName as string) ?? "",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

function mapInstallment(doc: Record<string, unknown>): LoanInstallment {
  const inst: LoanInstallment = {
    $id: doc.$id as string,
    loanId: (doc.loanId as string) ?? "",
    ownerId: (doc.ownerId as string) ?? "",
    installmentNumber: Number(doc.installmentNumber ?? 0),
    dueDate: (doc.dueDate as string) ?? "",
    scheduledAmount: Number(doc.scheduledAmount ?? 0),
    paidAmount: Number(doc.paidAmount ?? 0),
    status: (doc.status as LoanInstallment["status"]) ?? "pending",
  };
  inst.status = refreshInstallmentStatus(inst);
  return inst;
}

export async function listLoans(ownerId: string): Promise<Loan[]> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    const snapshot = await getSnapshotByType('loans');
    return snapshot
      .filter((l: any) => l.ownerId === ownerId)
      .map((l: any) => mapLoan(l));
  }

  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loans,
    [
      Query.equal("ownerId", ownerId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  );
  const loans = res.documents.map((d) => mapLoan(d as Record<string, unknown>));

  for (const loan of loans) {
    await upsertSnapshot('loans', loan.$id, loan);
  }

  return loans;
}

export async function listInstallments(
  ownerId: string,
  loanId?: string,
): Promise<LoanInstallment[]> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    const snapshot = await getSnapshotByType('loan_installments');
    let filtered = snapshot.filter((i: any) => i.ownerId === ownerId);
    if (loanId) filtered = filtered.filter((i: any) => i.loanId === loanId);
    return filtered.map((i: any) => mapInstallment(i));
  }

  const queries = [
    Query.equal("ownerId", ownerId),
    Query.orderAsc("dueDate"),
    Query.limit(500),
  ];
  if (loanId) {
    queries.unshift(Query.equal("loanId", loanId));
  }
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loanInstallments,
    queries,
  );
  const installments = res.documents.map((d) => mapInstallment(d as Record<string, unknown>));

  for (const inst of installments) {
    await upsertSnapshot('loan_installments', inst.$id, inst);
  }

  return installments;
}

export async function createLoanWithInstallments(
  ownerId: string,
  input: LoanInput,
): Promise<{ loan: Loan; installments: LoanInstallment[] }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const sim = simulateLoan(input);
  const loanId = isOnline ? ID.unique() : generateLocalId('loans');
  const clientRequestId = ID.unique();

  const loanData = {
    ownerId,
    customerId: input.customerId,
    customerName: input.customerName,
    principal: input.principal,
    interestRate: input.interestRate,
    interestMode: input.interestMode,
    frequency: input.frequency,
    installmentCount: input.installmentCount,
    startDate: input.startDate,
    firstDueDate: input.firstDueDate,
    skipWeekends: input.skipWeekends,
    lateFeeMode: input.lateFeeMode ?? "none",
    lateFeeValue: input.lateFeeValue ?? 0,
    totalInterest: sim.totalInterest,
    totalReceivable: sim.totalReceivable,
    status: "active",
    clientRequestId,
    managerId: input.managerId ?? "",
    managerName: input.managerName ?? "",
  };

  let loan: Loan;
  if (!isOnline) {
    loan = { $id: loanId, ...loanData, $createdAt: new Date().toISOString() } as Loan;
    await addToSyncQueue('loans', 'create', { ...loanData, clientRequestId: loanId }, loanId);
    await upsertSnapshot('loans', loanId, loan);
  } else {
    const loanDoc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.loans,
      loanId,
      loanData,
    );
    loan = mapLoan(loanDoc as Record<string, unknown>);
    await upsertSnapshot('loans', loan.$id, loan);
  }

  const installments: LoanInstallment[] = [];
  for (const inst of sim.installments) {
    const instId = isOnline ? ID.unique() : generateLocalId('loan_installments');
    const instData = {
      loanId: loan.$id,
      ownerId,
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      scheduledAmount: inst.scheduledAmount,
      paidAmount: 0,
      status: "pending",
    };

    let installment: LoanInstallment;
    if (!isOnline) {
      installment = { $id: instId, ...instData } as LoanInstallment;
      await addToSyncQueue('loan_installments', 'create', instData, instId);
      await upsertSnapshot('loan_installments', instId, installment);
    } else {
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.loanInstallments,
        instId,
        instData,
      );
      installment = mapInstallment(doc as Record<string, unknown>);
      await upsertSnapshot('loan_installments', installment.$id, installment);
    }
    installments.push(installment);
  }

  return { loan, installments };
}

async function updateInstallment(
  installment: LoanInstallment,
  patch: Partial<
    Pick<
      LoanInstallment,
      "paidAmount" | "status" | "dueDate" | "scheduledAmount"
    >
  >,
): Promise<LoanInstallment> {
  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loanInstallments,
    installment.$id,
    patch,
  );
  return mapInstallment(doc as Record<string, unknown>);
}

async function markLoanPaidIfComplete(
  loan: Loan,
): Promise<Loan> {
  const allInst = await listInstallments(loan.ownerId, loan.$id);
  const allPaid = allInst.every((i) => i.status === "paid");
  if (!allPaid) return loan;

  const loanDoc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loans,
    loan.$id,
    { status: "paid" },
  );
  return mapLoan(loanDoc as Record<string, unknown>);
}

export async function registerPayment(
  loan: Loan,
  input: PaymentInput,
): Promise<{ installment: LoanInstallment; loan: Loan }> {
  const {
    installment,
    amount,
    discountAmount,
    paymentMethod,
    paymentType,
    notes,
    paidAt,
    interestAmount,
    principalAmount,
    rescheduleDate,
  } = input;

  const net = Math.round((amount - discountAmount) * 100) / 100;

  await createLoanPayment(loan.ownerId, {
    loanId: loan.$id,
    installmentId: installment.$id,
    amount: net,
    interestAmount,
    principalAmount,
    discountAmount,
    paymentMethod,
    paymentType,
    notes,
    paidAt,
  });

  let updatedInst = installment;
  let updatedLoan = loan;

  if (paymentType === "full_payoff") {
    const allInst = await listInstallments(loan.ownerId, loan.$id);
    for (const inst of allInst) {
      if (inst.status !== "paid") {
        await updateInstallment(inst, {
          paidAmount: inst.scheduledAmount,
          status: "paid",
        });
      }
    }
    updatedInst = await updateInstallment(installment, {
      paidAmount: installment.scheduledAmount,
      status: "paid",
    });
    const loanDoc = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.loans,
      loan.$id,
      { status: "paid" },
    );
    updatedLoan = mapLoan(loanDoc as Record<string, unknown>);
  } else if (paymentType === "interest_only") {
    if (rescheduleDate) {
      updatedInst = await updateInstallment(installment, {
        dueDate: rescheduleDate,
        status: refreshInstallmentStatus({
          ...installment,
          dueDate: rescheduleDate,
        }),
      });
      const allInst = await listInstallments(loan.ownerId, loan.$id);
      const future = allInst.filter(
        (i) =>
          i.installmentNumber > installment.installmentNumber &&
          i.status !== "paid",
      );
      let nextDate = rescheduleDate;
      for (const fut of future) {
        const d = new Date(nextDate + "T12:00:00");
        d.setMonth(d.getMonth() + 1);
        nextDate = d.toISOString().slice(0, 10);
        await updateInstallment(fut, {
          dueDate: nextDate,
          status: refreshInstallmentStatus({ ...fut, dueDate: nextDate }),
        });
      }
    }
  } else {
    const paidAmount =
      Math.round((installment.paidAmount + net) * 100) / 100;
    const status =
      paidAmount >= installment.scheduledAmount
        ? "paid"
        : refreshInstallmentStatus({ ...installment, paidAmount });

    updatedInst = await updateInstallment(installment, { paidAmount, status });
    updatedLoan = await markLoanPaidIfComplete(loan);
  }

  return { installment: updatedInst, loan: updatedLoan };
}

function loanPayloadFromInput(
  ownerId: string,
  input: LoanInput,
  sim: ReturnType<typeof simulateLoan>,
  extras: { clientRequestId: string; status: Loan["status"] },
) {
  return {
    ownerId,
    customerId: input.customerId,
    customerName: input.customerName,
    principal: input.principal,
    interestRate: input.interestRate,
    interestMode: input.interestMode,
    frequency: input.frequency,
    installmentCount: input.installmentCount,
    startDate: input.startDate,
    firstDueDate: input.firstDueDate,
    skipWeekends: input.skipWeekends,
    lateFeeMode: input.lateFeeMode ?? "none",
    lateFeeValue: input.lateFeeValue ?? 0,
    totalInterest: sim.totalInterest,
    totalReceivable: sim.totalReceivable,
    clientRequestId: extras.clientRequestId,
    managerId: input.managerId ?? "",
    managerName: input.managerName ?? "",
    status: extras.status,
  };
}

/** Recalcula parcelas em aberto; parcelas já pagas são preservadas. */
export async function updateLoanWithInstallments(
  loan: Loan,
  input: LoanInput,
): Promise<{ loan: Loan; installments: LoanInstallment[] }> {
  const sim = simulateLoan(input);
  const existing = await listInstallments(loan.ownerId, loan.$id);
  const sorted = [...existing].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );

  const touchedNumbers = sorted
    .filter((i) => i.status === "paid" || i.paidAmount > 0)
    .map((i) => i.installmentNumber);
  const maxTouched =
    touchedNumbers.length > 0 ? Math.max(...touchedNumbers) : 0;

  if (input.installmentCount < maxTouched) {
    throw new Error(
      `Não é possível reduzir para ${input.installmentCount} parcelas: a parcela #${maxTouched} já tem pagamento registrado.`,
    );
  }

  const simByNumber = new Map(
    sim.installments.map((i) => [i.installmentNumber, i]),
  );
  const existingByNumber = new Map(
    sorted.map((i) => [i.installmentNumber, i]),
  );

  for (const inst of sorted) {
    const simInst = simByNumber.get(inst.installmentNumber);
    if (!simInst) {
      if (inst.paidAmount > 0 || inst.status === "paid") {
        throw new Error(
          `A parcela #${inst.installmentNumber} tem pagamento e não cabe no novo plano.`,
        );
      }
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.loanInstallments,
        inst.$id,
      );
      continue;
    }

    if (inst.status === "paid") {
      continue;
    }

    if (inst.paidAmount > simInst.scheduledAmount) {
      throw new Error(
        `Parcela #${inst.installmentNumber}: já recebido ${inst.paidAmount.toFixed(2)} — maior que o novo valor ${simInst.scheduledAmount.toFixed(2)}.`,
      );
    }

    const next: LoanInstallment = {
      ...inst,
      dueDate: simInst.dueDate,
      scheduledAmount: simInst.scheduledAmount,
    };
    await updateInstallment(inst, {
      dueDate: simInst.dueDate,
      scheduledAmount: simInst.scheduledAmount,
      status: refreshInstallmentStatus(next),
    });
  }

  for (const simInst of sim.installments) {
    if (existingByNumber.has(simInst.installmentNumber)) continue;
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.loanInstallments,
      ID.unique(),
      {
        loanId: loan.$id,
        ownerId: loan.ownerId,
        installmentNumber: simInst.installmentNumber,
        dueDate: simInst.dueDate,
        scheduledAmount: simInst.scheduledAmount,
        paidAmount: 0,
        status: "pending",
      },
    );
  }

  const loanDoc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loans,
    loan.$id,
    loanPayloadFromInput(loan.ownerId, input, sim, {
      clientRequestId: loan.clientRequestId,
      status: "active",
    }),
  );

  let updatedLoan = mapLoan(loanDoc as Record<string, unknown>);
  updatedLoan = await markLoanPaidIfComplete(updatedLoan);
  const installments = await listInstallments(loan.ownerId, loan.$id);
  return { loan: updatedLoan, installments };
}

/** Remove pagamentos, parcelas e o contrato. */
export async function deleteLoanCascade(
  ownerId: string,
  loanId: string,
): Promise<void> {
  const payments = await listLoanPayments(ownerId, loanId);
  for (const payment of payments) {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.loanPayments,
      payment.$id,
    );
  }

  const installments = await listInstallments(ownerId, loanId);
  for (const installment of installments) {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.loanInstallments,
      installment.$id,
    );
  }

  await databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loans,
    loanId,
  );
}

export { buildPaymentBreakdown } from "@/utils/payment-breakdown";
