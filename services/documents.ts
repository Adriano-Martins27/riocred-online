import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { CustomerDocument, DocumentType } from "@/types/document";

function map(doc: Record<string, unknown>): CustomerDocument {
  return {
    $id: doc.$id as string,
    customerId: (doc.customerId as string) ?? "",
    ownerId: (doc.ownerId as string) ?? "",
    type: (doc.type as DocumentType) ?? "outro",
    fileId: (doc.fileId as string) ?? "",
    fileName: (doc.fileName as string) ?? "",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

export async function listCustomerDocuments(
  customerId: string,
): Promise<CustomerDocument[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customerDocuments,
    [Query.equal("customerId", customerId), Query.limit(50)],
  );
  return res.documents.map((d) => map(d as Record<string, unknown>));
}

export async function createCustomerDocument(
  ownerId: string,
  customerId: string,
  type: DocumentType,
  fileId: string,
  fileName: string,
): Promise<CustomerDocument> {
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customerDocuments,
    ID.unique(),
    { ownerId, customerId, type, fileId, fileName },
  );
  return map(doc as Record<string, unknown>);
}

export async function deleteCustomerDocument(id: string): Promise<void> {
  await databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customerDocuments,
    id,
  );
}
