import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { listCustomerDocuments } from "@/services/documents";
import { listLoanPayments } from "@/services/loan-payments";
import { listInstallments, listLoans, deleteLoanCascade } from "@/services/loans";
import type { Customer, CustomerInput } from "@/types/customer";
import { addToSyncQueue, upsertSnapshot, generateLocalId, isLocalId, getSnapshot, getSnapshotByType } from "@/offline/sync";

function mapCustomer(doc: Record<string, unknown>): Customer {
  return {
    $id: doc.$id as string,
    ownerId: (doc.ownerId as string) ?? "",
    fullName: (doc.fullName as string) ?? "",
    cpf: (doc.cpf as string) ?? "",
    phone: (doc.phone as string) ?? "",
    clientType: (doc.clientType as string) ?? "",
    billingType: (doc.billingType as Customer["billingType"]) ?? "emprestimo",
    referrerName: (doc.referrerName as string) ?? "",
    referrerPhone: (doc.referrerPhone as string) ?? "",
    routeId: (doc.routeId as string) ?? "",
    active: doc.active !== false,
    zipCode: (doc.zipCode as string) ?? "",
    street: (doc.street as string) ?? "",
    number: (doc.number as string) ?? "",
    complement: (doc.complement as string) ?? "",
    neighborhood: (doc.neighborhood as string) ?? "",
    city: (doc.city as string) ?? "",
    state: (doc.state as string) ?? "",
    reference: (doc.reference as string) ?? "",
    photoFileId: (doc.photoFileId as string) ?? "",
    photoUpdatedAt: (doc.photoUpdatedAt as string) ?? "",
    clientRequestId: (doc.clientRequestId as string) ?? "",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

function toPayload(ownerId: string, input: CustomerInput) {
  return {
    ownerId,
    fullName: input.fullName.trim(),
    cpf: input.cpf,
    phone: input.phone,
    clientType: input.clientType,
    billingType: input.billingType,
    referrerName: input.referrerName,
    referrerPhone: input.referrerPhone,
    routeId: input.routeId,
    active: input.active,
    zipCode: input.zipCode,
    street: input.street,
    number: input.number,
    complement: input.complement,
    neighborhood: input.neighborhood,
    city: input.city,
    state: input.state,
    reference: input.reference,
    photoFileId: input.photoFileId,
    photoUpdatedAt: input.photoUpdatedAt,
    clientRequestId: input.clientRequestId ?? ID.unique(),
  };
}

async function getFromSnapshot(entityType: string, entityId: string): Promise<any> {
  return await getSnapshot(entityType, entityId);
}

export async function updateCustomer(
  id: string,
  ownerId: string,
  input: CustomerInput,
  online?: boolean,
): Promise<Customer> {
  const payload = toPayload(ownerId, input);
  const isOnline = online ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (!isOnline) {
    // Offline: enfileirar e atualizar snapshot
    await addToSyncQueue('customers', 'update', { $id: id, ...payload });
    const existing = await getFromSnapshot('customers', id);
    const updated = { ...existing, ...payload };
    await upsertSnapshot('customers', id, updated);
    return updated as Customer;
  }

  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customers,
    id,
    payload,
  );
  const customer = mapCustomer(doc as Record<string, unknown>);
  await upsertSnapshot('customers', customer.$id, customer);
  return customer;
}

export async function listCustomers(ownerId: string): Promise<Customer[]> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    // Offline: ler do snapshot
    const snapshot = await getSnapshotByType('customers');
    return snapshot
      .filter((c: any) => c.ownerId === ownerId)
      .map((c: any) => mapCustomer(c));
  }

  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customers,
    [
      Query.equal("ownerId", ownerId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  );
  const customers = res.documents.map((d) => mapCustomer(d as Record<string, unknown>));

  // Atualizar snapshot
  for (const customer of customers) {
    await upsertSnapshot('customers', customer.$id, customer);
  }

  return customers;
}

export async function createCustomer(
  ownerId: string,
  input: CustomerInput,
): Promise<Customer> {
  const payload = toPayload(ownerId, input);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    // Offline: criar ID local e enfileirar
    const localId = generateLocalId('customers');
    const offlineCustomer = {
      $id: localId,
      ...payload,
      $createdAt: new Date().toISOString(),
    };
    await addToSyncQueue('customers', 'create', { ...payload, clientRequestId: localId }, localId);
    await upsertSnapshot('customers', localId, offlineCustomer);
    return offlineCustomer as Customer;
  }

  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customers,
    ID.unique(),
    payload,
  );
  const customer = mapCustomer(doc as Record<string, unknown>);
  await upsertSnapshot('customers', customer.$id, customer);
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.customers,
    id,
  );
}

/** Remove empréstimos, parcelas, pagamentos e documentos do cliente. */
export async function deleteCustomerCascade(
  ownerId: string,
  customerId: string,
): Promise<void> {
  const loans = (await listLoans(ownerId)).filter(
    (l) => l.customerId === customerId,
  );
  for (const loan of loans) {
    await deleteLoanCascade(ownerId, loan.$id);
  }

  const docs = await listCustomerDocuments(customerId);
  for (const doc of docs) {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.customerDocuments,
      doc.$id,
    );
  }

  await deleteCustomer(customerId);
}
