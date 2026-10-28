import { ID } from "appwrite";
import { BUCKETS, storage } from "@/lib/appwrite";

export async function uploadCustomerPhoto(
  ownerId: string,
  customerId: string,
  file: File | Blob,
  name: string,
): Promise<string> {
  const fileId = ID.unique();
  await storage.createFile(BUCKETS.customerPhotos, fileId, file as File);
  return fileId;
}

export async function uploadCustomerDocument(
  ownerId: string,
  file: File | Blob,
  name: string,
): Promise<string> {
  const fileId = ID.unique();
  await storage.createFile(BUCKETS.customerDocuments, fileId, file as File);
  return fileId;
}

export function getFilePreviewUrl(bucketId: string, fileId: string): string {
  const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "";
  const project = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${project}`;
}
