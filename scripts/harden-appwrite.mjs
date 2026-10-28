/**
 * Aplica o controle de acesso por labels:
 * - admin: tudo; staff (managers aprovados): dados operacionais;
 * - cadastros pendentes não leem nada além do próprio perfil.
 *
 * Também sincroniza labels e permissões dos perfis existentes.
 * Rode depois de `npm run deploy:functions`.
 *
 * Uso: npm run harden:appwrite
 */
import "dotenv/config";
import { Client, Databases, Query, Storage, Users } from "node-appwrite";
import {
  BUCKET_PERMISSIONS,
  collectionPolicy,
  labelsFor,
  profilePermissions,
} from "./access-policy.mjs";

const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const API_KEY = process.env.APPWRITE_API_KEY ?? "";
const DATABASE_ID = "riocred";
const ACCESS_LABELS = ["admin", "staff"];

if (!API_KEY || !PROJECT_ID) {
  console.error("APPWRITE_API_KEY e EXPO_PUBLIC_APPWRITE_PROJECT_ID são obrigatórios no .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);
const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

const { documents: profiles } = await databases.listDocuments({
  databaseId: DATABASE_ID,
  collectionId: "profiles",
  queries: [Query.limit(500)],
});
for (const p of profiles) {
  try {
    const user = await users.get({ userId: p.$id });
    const keep = user.labels.filter((l) => !ACCESS_LABELS.includes(l));
    await users.updateLabels({
      userId: p.$id,
      labels: [...keep, ...labelsFor(p)],
    });
  } catch (err) {
    if (err.code !== 404) throw err;
    console.warn("⚠ perfil sem usuário:", p.$id);
  }
  await databases.updateDocument({
    databaseId: DATABASE_ID,
    collectionId: "profiles",
    documentId: p.$id,
    permissions: profilePermissions(p.$id, p),
  });
  console.log("✓ perfil", p.email, "→", labelsFor(p).join(",") || "(pendente)");
}

const { collections } = await databases.listCollections({
  databaseId: DATABASE_ID,
});
for (const c of collections) {
  const policy = collectionPolicy(c.$id);
  await databases.updateCollection({
    databaseId: DATABASE_ID,
    collectionId: c.$id,
    name: c.name,
    permissions: policy.permissions,
    documentSecurity: policy.documentSecurity,
    enabled: c.enabled,
  });
  console.log("✓ collection", c.$id);
}

const { buckets } = await storage.listBuckets();
for (const b of buckets) {
  await storage.updateBucket({
    bucketId: b.$id,
    name: b.name,
    permissions: BUCKET_PERMISSIONS,
    fileSecurity: false,
    enabled: b.enabled,
    maximumFileSize: b.maximumFileSize,
    allowedFileExtensions: b.allowedFileExtensions,
    compression: b.compression,
    encryption: b.encryption,
    antivirus: b.antivirus,
  });
  console.log("✓ bucket", b.$id);
}

console.log("\nControle de acesso aplicado.");
