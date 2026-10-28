import { ID, Query } from "appwrite";
import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { UserSettings, UserSettingsInput } from "@/types/settings";
import { emptySettings } from "@/types/settings";

function map(doc: Record<string, unknown>): UserSettings {
  return {
    $id: doc.$id as string,
    ownerId: (doc.ownerId as string) ?? "",
    whatsapp: (doc.whatsapp as string) ?? "",
    companyName: (doc.companyName as string) ?? "RioCred",
    pixKey: (doc.pixKey as string) ?? "",
    whatsappEnabled: doc.whatsappEnabled !== false,
    templateDefault: (doc.templateDefault as string) ?? "",
    templateDueToday: (doc.templateDueToday as string) ?? "",
    templateOverdue: (doc.templateOverdue as string) ?? "",
  };
}

export async function getUserSettings(ownerId: string): Promise<UserSettings | null> {
  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.userSettings,
      ownerId,
    );
    return map(doc as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function ensureUserSettings(ownerId: string): Promise<UserSettings> {
  const existing = await getUserSettings(ownerId);
  if (existing) return existing;

  const defaults = emptySettings();
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.userSettings,
    ownerId,
    { ownerId, ...defaults },
  );
  return map(doc as Record<string, unknown>);
}

export async function updateUserSettings(
  ownerId: string,
  input: UserSettingsInput,
): Promise<UserSettings> {
  await ensureUserSettings(ownerId);
  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.userSettings,
    ownerId,
    { ownerId, ...input },
  );
  return map(doc as Record<string, unknown>);
}

export async function updateProfileName(
  ownerId: string,
  fullName: string,
): Promise<void> {
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.profiles,
    ownerId,
    { fullName },
  );
}
