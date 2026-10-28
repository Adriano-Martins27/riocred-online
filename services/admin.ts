import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { Profile } from "@/types/profile";
import type { Route, RouteInput } from "@/types/route";
import { mapProfile } from "@/services/profiles";

function mapRoute(doc: Record<string, unknown>): Route {
  return {
    $id: doc.$id as string,
    name: (doc.name as string) ?? "",
    createdBy: (doc.createdBy as string) ?? "",
    $createdAt: (doc.$createdAt as string) ?? "",
  };
}

export async function listRoutes(): Promise<Route[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.routes,
    [Query.orderAsc("name"), Query.limit(100)],
  );
  return res.documents.map((d) => mapRoute(d as Record<string, unknown>));
}

export async function createRoute(
  createdBy: string,
  input: RouteInput,
): Promise<Route> {
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.routes,
    ID.unique(),
    { name: input.name.trim(), createdBy },
  );
  return mapRoute(doc as Record<string, unknown>);
}

export async function updateRoute(id: string, name: string): Promise<Route> {
  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.routes,
    id,
    { name: name.trim() },
  );
  return mapRoute(doc as Record<string, unknown>);
}

export async function deleteRoute(id: string): Promise<void> {
  await databases.deleteDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.routes,
    id,
  );
}

export async function listAllProfiles(): Promise<Profile[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.profiles,
    [Query.limit(100)],
  );
  return res.documents.map((d) => mapProfile(d as Record<string, unknown>));
}

export async function setManagerAccess(
  managerId: string,
  isApproved: boolean,
  routeIds: string[],
  canViewFinancials = false,
  canEditCustomers = true,
  canDeleteCustomers = false,
): Promise<void> {
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.profiles,
    managerId,
    { isApproved, canViewFinancials, canEditCustomers, canDeleteCustomers },
  );

  const existing = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.managerRouteAccess,
    [Query.equal("managerId", managerId), Query.limit(100)],
  );

  for (const doc of existing.documents) {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.managerRouteAccess,
      doc.$id,
    );
  }

  for (const routeId of routeIds) {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.managerRouteAccess,
      ID.unique(),
      { managerId, routeId },
    );
  }
}

export async function getManagerRouteIds(managerId: string): Promise<string[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.managerRouteAccess,
    [Query.equal("managerId", managerId), Query.limit(50)],
  );
  return res.documents.map((d) => d.routeId as string);
}

export type ManagerRouteAccess = {
  managerId: string;
  routeId: string;
};

export async function listManagerRouteAccess(): Promise<ManagerRouteAccess[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.managerRouteAccess,
    [Query.limit(500)],
  );
  return res.documents.map((d) => ({
    managerId: d.managerId as string,
    routeId: d.routeId as string,
  }));
}
