import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { LoanPayment, PaymentMethod, PaymentType } from "@/types/loan";

function map(doc: Record<string, unknown>): LoanPayment {
  return {
    $id: doc.$id as string,
    loanId: (doc.loanId as string) ?? "",
    installmentId: (doc.installmentId as string) ?? "",
    ownerId: (doc.ownerId as string) ?? "",
    amount: Number(doc.amount ?? 0),
    interestAmount: Number(doc.interestAmount ?? 0),
    principalAmount: Number(doc.principalAmount ?? 0),
    discountAmount: Number(doc.discountAmount ?? 0),
    paymentMethod: (doc.paymentMethod as PaymentMethod) ?? "pix",
    paymentType: (doc.paymentType as PaymentType) ?? "installment",
    notes: (doc.notes as string) ?? "",
    paidAt: (doc.paidAt as string) ?? "",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

export async function listLoanPayments(
  ownerId: string,
  loanId?: string,
): Promise<LoanPayment[]> {
  const queries = [
    Query.equal("ownerId", ownerId),
    Query.orderDesc("paidAt"),
    Query.limit(200),
  ];
  if (loanId) queries.unshift(Query.equal("loanId", loanId));

  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loanPayments,
    queries,
  );
  return res.documents.map((d) => map(d as Record<string, unknown>));
}

export async function createLoanPayment(
  ownerId: string,
  data: Omit<LoanPayment, "$id" | "$createdAt" | "ownerId">,
): Promise<LoanPayment> {
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.loanPayments,
    ID.unique(),
    { ownerId, ...data },
  );
  return map(doc as Record<string, unknown>);
}
