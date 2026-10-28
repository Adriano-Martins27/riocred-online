import { Account, Client, Databases, Functions, Storage } from "appwrite";

export const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "";
export const APPWRITE_PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
export const APPWRITE_PROJECT_NAME =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_NAME ?? "";

export const APPWRITE_DATABASE_ID = "riocred";

export const client = new Client()
  .setProject(APPWRITE_PROJECT_ID)
  .setEndpoint(APPWRITE_ENDPOINT);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
