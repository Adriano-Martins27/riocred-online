import { APPWRITE_DATABASE_ID, databases } from "@/lib/appwrite";
import { COLLECTIONS } from "@/lib/collections";
import type { AppSettings } from "@/types/app-settings";
import { APP_SETTINGS_ID, emptyAppSettings } from "@/types/app-settings";

function map(doc: Record<string, unknown>): AppSettings {
  const defaults = emptyAppSettings();
  return {
    $id: doc.$id as string,
    evolutionBaseUrl: (doc.evolutionBaseUrl as string) ?? defaults.evolutionBaseUrl,
    evolutionApiKey: (doc.evolutionApiKey as string) ?? "",
    evolutionInstanceName:
      (doc.evolutionInstanceName as string) ?? defaults.evolutionInstanceName,
    templateLoanCreated:
      (doc.templateLoanCreated as string) ?? defaults.templateLoanCreated,
    templateDueSoon: (doc.templateDueSoon as string) ?? defaults.templateDueSoon,
    templateDueToday:
      (doc.templateDueToday as string) ?? defaults.templateDueToday,
    templateOverdue: (doc.templateOverdue as string) ?? defaults.templateOverdue,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.appSettings,
      APP_SETTINGS_ID,
    );
    return map(doc as Record<string, unknown>);
  } catch {
    const defaults = emptyAppSettings();
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.appSettings,
      APP_SETTINGS_ID,
      defaults,
    );
    return map(doc as Record<string, unknown>);
  }
}

export async function updateAppSettings(
  input: Omit<AppSettings, "$id">,
): Promise<AppSettings> {
  const doc = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    COLLECTIONS.appSettings,
    APP_SETTINGS_ID,
    input,
  );
  return map(doc as Record<string, unknown>);
}
