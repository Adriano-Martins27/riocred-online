import { Platform } from "react-native";
import { addToSyncQueue } from "@/offline/sync-queue";

export async function enqueueIfOffline(
  online: boolean,
  item: { entityType: string; label: string },
): Promise<void> {
  if (!online) {
    await addToSyncQueue(item);
  }
}

export function pickImageWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}

export function pickDocumentWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}
