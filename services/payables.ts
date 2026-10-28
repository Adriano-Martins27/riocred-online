import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { Payable, PayableInput } from "@/types/payable";

function map(doc: Record<string, unknown>): Payable {
  return {
    $id: doc.$id as string,
    ownerId: (doc.ownerId as string) ?? "",
    name: (doc.name as string) ?? "",
    amount: Number(doc.amount ?? 0),
    dueDate: (doc.dueDate as string) ?? "",
    category: (doc.category as string) ?? "",
    notes: (doc.notes as string) ?? "",
    status: (doc.status as Payable["status"]) ?? "pending",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

export async function listPayables(ownerId: string): Promise<Payable[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.payableAccounts,
    [
      Query.equal("ownerId", ownerId),
      Query.orderAsc("dueDate"),
      Query.limit(100),
    ],
  );
  return res.documents.map((d) => map(d as Record<string, unknown>));
}

export async function createPayable(
  ownerId: string,
  input: PayableInput,
): Promise<Payable> {
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.payableAccounts,
    ID.unique(),
    { ownerId, ...input },
  );
  return map(doc as Record<string, unknown>);
}

export async function updatePayable(
  id: string,
  ownerId: string,
  input: PayableInput,
): Promise<Payable> {
  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.payableAccounts,
    id,
    { ownerId, ...input },
  );
  return map(doc as Record<string, unknown>);
}

export async function deletePayable(id: string): Promise<void> {
  await databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.payableAccounts,
    id,
  );
}
