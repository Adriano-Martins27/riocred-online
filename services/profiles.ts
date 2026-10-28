import { ID, Query } from "appwrite";
import {
  APPWRITE_DATABASE_ID,
  account,
  databases,
} from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { Profile, ProfileInput } from "@/types/profile";

export function mapProfile(doc: Record<string, unknown>): Profile {
  const role = (doc.role as Profile["role"]) ?? "manager";
  return {
    $id: doc.$id as string,
    fullName: (doc.fullName as string) ?? "",
    email: (doc.email as string) ?? "",
    role,
    isApproved: Boolean(doc.isApproved),
    canViewFinancials:
      role === "admin" ? true : Boolean(doc.canViewFinancials),
    canEditCustomers:
      role === "admin" ? true : doc.canEditCustomers !== false,
    canDeleteCustomers:
      role === "admin" ? true : Boolean(doc.canDeleteCustomers),
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.profiles,
      userId,
    );
    return mapProfile(doc as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function ensureProfile(input: ProfileInput): Promise<Profile> {
  const user = await account.get();
  const existing = await getProfile(user.$id);

  if (existing) {
    return existing;
  }

  const bootstrapEmail =
    process.env.EXPO_PUBLIC_BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const isBootstrapAdmin =
    bootstrapEmail && input.email.toLowerCase().trim() === bootstrapEmail;

  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.profiles,
    user.$id,
    {
      fullName: input.fullName,
      email: input.email,
      role: isBootstrapAdmin ? "admin" : (input.role ?? "manager"),
      isApproved: isBootstrapAdmin ? true : (input.isApproved ?? false),
      canViewFinancials: isBootstrapAdmin,
      canEditCustomers: true,
      canDeleteCustomers: false,
    },
  );

  return mapProfile(doc as Record<string, unknown>);
}

export async function listManagers(): Promise<Profile[]> {
  const res = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.profiles,
    [Query.equal("role", "manager")],
  );
  return res.documents.map((d) => mapProfile(d as Record<string, unknown>));
}

export { ID };
