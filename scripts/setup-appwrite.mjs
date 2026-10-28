/**
 * Provisiona database, collections, usuário admin e valida conexão.
 *
 * Requer APPWRITE_API_KEY no .env (Console → Settings → API Keys).
 * Uso: npm run setup:appwrite
 */
import "dotenv/config";
import {
  Client,
  Databases,
  ID,
  Project,
  Users,
} from "node-appwrite";
import {
  BUCKET_PERMISSIONS,
  collectionPolicy,
  labelsFor,
  profilePermissions,
} from "./access-policy.mjs";

const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "6a3222d2000513ac5182";
const API_KEY = process.env.APPWRITE_API_KEY ?? "";
const DATABASE_ID = "riocred";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "admin@riocred.online";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_NAME =
  process.env.ADMIN_NAME ?? "Administrador RioCred";

function serverClient() {
  if (!API_KEY) {
    throw new Error(
      "APPWRITE_API_KEY ausente no .env.\n" +
        "Crie em: https://cloud.appwrite.io/console/project-" +
        PROJECT_ID +
        "/settings/api-keys\n" +
        "Scopes: databases, collections, attributes, indexes, documents, users (read+write)",
    );
  }
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitAttribute(databases, databaseId, collectionId, key) {
  for (let i = 0; i < 60; i++) {
    try {
      const attr = await databases.getAttribute(
        databaseId,
        collectionId,
        key,
      );
      if (attr.status === "available") return;
    } catch {
      /* ainda propagando */
    }
    await sleep(1000);
  }
  throw new Error(`Atributo "${key}" não ficou disponível a tempo.`);
}

async function ensureDatabase(databases) {
  try {
    await databases.get({ databaseId: DATABASE_ID });
    console.log("✓ Database", DATABASE_ID, "já existe");
  } catch {
    await databases.create({
      databaseId: DATABASE_ID,
      name: "RioCred",
    });
    console.log("✓ Database", DATABASE_ID, "criado");
  }
}

async function ensureCollection(databases, collectionId, name) {
  try {
    await databases.getCollection({
      databaseId: DATABASE_ID,
      collectionId,
    });
    console.log("✓ Collection", collectionId, "já existe");
    return;
  } catch {
    /* create below */
  }

  await databases.createCollection({
    databaseId: DATABASE_ID,
    collectionId,
    name,
    ...collectionPolicy(collectionId),
  });
  console.log("✓ Collection", collectionId, "criada");
}

async function ensureStringAttr(
  databases,
  collectionId,
  key,
  size,
  required = false,
) {
  try {
    await databases.getAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
    });
    return;
  } catch {
    await databases.createStringAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      size,
      required,
    });
    await waitAttribute(databases, DATABASE_ID, collectionId, key);
  }
}

async function ensureBoolAttr(
  databases,
  collectionId,
  key,
  required = false,
  defaultValue = undefined,
) {
  try {
    await databases.getAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
    });
    return;
  } catch {
    await databases.createBooleanAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      required,
      default: defaultValue,
    });
    await waitAttribute(databases, DATABASE_ID, collectionId, key);
  }
}

async function setupProfilesCollection(databases) {
  await ensureCollection(databases, "profiles", "Profiles");
  await ensureStringAttr(databases, "profiles", "fullName", 256, true);
  await ensureStringAttr(databases, "profiles", "email", 320, true);
  await ensureStringAttr(databases, "profiles", "role", 32, true);
  await ensureBoolAttr(databases, "profiles", "isApproved", true, false);
  await ensureBoolAttr(databases, "profiles", "canViewFinancials", false, false);
  await ensureBoolAttr(databases, "profiles", "canEditCustomers", false, true);
  await ensureBoolAttr(databases, "profiles", "canDeleteCustomers", false, false);
  console.log("✓ Schema profiles OK");
}

async function setupCustomersCollection(databases) {
  await ensureCollection(databases, "customers", "Customers");
  const strings = [
    ["ownerId", 64, true],
    ["fullName", 256, true],
    ["cpf", 32, false],
    ["phone", 32, false],
    ["clientType", 64, false],
    ["billingType", 32, false],
    ["referrerName", 256, false],
    ["referrerPhone", 32, false],
    ["routeId", 64, false],
    ["zipCode", 16, false],
    ["street", 256, false],
    ["number", 32, false],
    ["complement", 128, false],
    ["neighborhood", 128, false],
    ["city", 128, false],
    ["state", 8, false],
    ["reference", 256, false],
    ["clientRequestId", 64, true],
  ];
  for (const [key, size, required] of strings) {
    await ensureStringAttr(databases, "customers", key, size, required);
  }
  await ensureBoolAttr(databases, "customers", "active", true, true);
  await ensureStringAttr(databases, "customers", "photoFileId", 64, false);
  await ensureStringAttr(databases, "customers", "photoUpdatedAt", 32, false);

  try {
    await databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: "customers",
      key: "ownerId_idx",
      type: "key",
      attributes: ["ownerId"],
      orders: ["ASC"],
    });
  } catch {
    /* index may exist */
  }
  console.log("✓ Schema customers OK");
}

async function ensureFloatAttr(
  databases,
  collectionId,
  key,
  required = false,
) {
  try {
    await databases.getAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
    });
    return;
  } catch {
    await databases.createFloatAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      required,
    });
    await waitAttribute(databases, DATABASE_ID, collectionId, key);
  }
}

async function ensureIntegerAttr(
  databases,
  collectionId,
  key,
  required = false,
) {
  try {
    await databases.getAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
    });
    return;
  } catch {
    await databases.createIntegerAttribute({
      databaseId: DATABASE_ID,
      collectionId,
      key,
      required,
    });
    await waitAttribute(databases, DATABASE_ID, collectionId, key);
  }
}

async function setupLoansCollection(databases) {
  await ensureCollection(databases, "loans", "Loans");
  await ensureStringAttr(databases, "loans", "ownerId", 64, true);
  await ensureStringAttr(databases, "loans", "customerId", 64, true);
  await ensureStringAttr(databases, "loans", "customerName", 256, true);
  await ensureFloatAttr(databases, "loans", "principal", true);
  await ensureFloatAttr(databases, "loans", "interestRate", true);
  await ensureStringAttr(databases, "loans", "interestMode", 32, true);
  await ensureStringAttr(databases, "loans", "frequency", 32, true);
  await ensureIntegerAttr(databases, "loans", "installmentCount", true);
  await ensureStringAttr(databases, "loans", "startDate", 16, true);
  await ensureStringAttr(databases, "loans", "firstDueDate", 16, true);
  await ensureBoolAttr(databases, "loans", "skipWeekends", true, true);
  await ensureFloatAttr(databases, "loans", "totalInterest", true);
  await ensureFloatAttr(databases, "loans", "totalReceivable", true);
  await ensureStringAttr(databases, "loans", "status", 16, true);
  await ensureStringAttr(databases, "loans", "clientRequestId", 64, true);
  await ensureStringAttr(databases, "loans", "managerId", 64, false);
  await ensureStringAttr(databases, "loans", "managerName", 256, false);
  await ensureStringAttr(databases, "loans", "lateFeeMode", 32, false);
  await ensureFloatAttr(databases, "loans", "lateFeeValue", false);
  console.log("✓ Schema loans OK");
}

async function setupInstallmentsCollection(databases) {
  await ensureCollection(databases, "loan_installments", "Loan Installments");
  await ensureStringAttr(databases, "loan_installments", "loanId", 64, true);
  await ensureStringAttr(databases, "loan_installments", "ownerId", 64, true);
  await ensureIntegerAttr(databases, "loan_installments", "installmentNumber", true);
  await ensureStringAttr(databases, "loan_installments", "dueDate", 16, true);
  await ensureFloatAttr(databases, "loan_installments", "scheduledAmount", true);
  await ensureFloatAttr(databases, "loan_installments", "paidAmount", true);
  await ensureStringAttr(databases, "loan_installments", "status", 16, true);
  try {
    await databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: "loan_installments",
      key: "loanId_idx",
      type: "key",
      attributes: ["loanId"],
      orders: ["ASC"],
    });
  } catch {
    /* exists */
  }
  console.log("✓ Schema loan_installments OK");
}

async function setupUserSettingsCollection(databases) {
  await ensureCollection(databases, "user_settings", "User Settings");
  await ensureStringAttr(databases, "user_settings", "ownerId", 64, true);
  await ensureStringAttr(databases, "user_settings", "whatsapp", 32, false);
  await ensureStringAttr(databases, "user_settings", "companyName", 128, false);
  await ensureStringAttr(databases, "user_settings", "pixKey", 128, false);
  await ensureBoolAttr(databases, "user_settings", "whatsappEnabled", false, true);
  await ensureStringAttr(databases, "user_settings", "templateDefault", 512, false);
  await ensureStringAttr(databases, "user_settings", "templateDueToday", 512, false);
  await ensureStringAttr(databases, "user_settings", "templateOverdue", 512, false);
  console.log("✓ Schema user_settings OK");
}

async function setupPayablesCollection(databases) {
  await ensureCollection(databases, "payable_accounts", "Payable Accounts");
  await ensureStringAttr(databases, "payable_accounts", "ownerId", 64, true);
  await ensureStringAttr(databases, "payable_accounts", "name", 256, true);
  await ensureFloatAttr(databases, "payable_accounts", "amount", true);
  await ensureStringAttr(databases, "payable_accounts", "dueDate", 16, true);
  await ensureStringAttr(databases, "payable_accounts", "category", 64, false);
  await ensureStringAttr(databases, "payable_accounts", "notes", 512, false);
  await ensureStringAttr(databases, "payable_accounts", "status", 16, true);
  console.log("✓ Schema payable_accounts OK");
}

async function setupRoutesCollection(databases) {
  await ensureCollection(databases, "routes", "Routes");
  await ensureStringAttr(databases, "routes", "name", 128, true);
  await ensureStringAttr(databases, "routes", "createdBy", 64, true);
  console.log("✓ Schema routes OK");
}

async function setupManagerRouteAccessCollection(databases) {
  await ensureCollection(databases, "manager_route_access", "Manager Route Access");
  await ensureStringAttr(databases, "manager_route_access", "managerId", 64, true);
  await ensureStringAttr(databases, "manager_route_access", "routeId", 64, true);
  try {
    await databases.createIndex({
      databaseId: DATABASE_ID,
      collectionId: "manager_route_access",
      key: "managerId_idx",
      type: "key",
      attributes: ["managerId"],
      orders: ["ASC"],
    });
  } catch {
    /* exists */
  }
  console.log("✓ Schema manager_route_access OK");
}

async function setupLoanPaymentsCollection(databases) {
  await ensureCollection(databases, "loan_payments", "Loan Payments");
  await ensureStringAttr(databases, "loan_payments", "loanId", 64, true);
  await ensureStringAttr(databases, "loan_payments", "installmentId", 64, true);
  await ensureStringAttr(databases, "loan_payments", "ownerId", 64, true);
  await ensureFloatAttr(databases, "loan_payments", "amount", true);
  await ensureFloatAttr(databases, "loan_payments", "interestAmount", true);
  await ensureFloatAttr(databases, "loan_payments", "principalAmount", true);
  await ensureFloatAttr(databases, "loan_payments", "discountAmount", true);
  await ensureStringAttr(databases, "loan_payments", "paymentMethod", 16, true);
  await ensureStringAttr(databases, "loan_payments", "paymentType", 24, true);
  await ensureStringAttr(databases, "loan_payments", "notes", 512, false);
  await ensureStringAttr(databases, "loan_payments", "paidAt", 32, true);
  console.log("✓ Schema loan_payments OK");
}

async function setupCustomerDocumentsCollection(databases) {
  await ensureCollection(databases, "customer_documents", "Customer Documents");
  await ensureStringAttr(databases, "customer_documents", "customerId", 64, true);
  await ensureStringAttr(databases, "customer_documents", "ownerId", 64, true);
  await ensureStringAttr(databases, "customer_documents", "type", 32, true);
  await ensureStringAttr(databases, "customer_documents", "fileId", 64, true);
  await ensureStringAttr(databases, "customer_documents", "fileName", 256, true);
  console.log("✓ Schema customer_documents OK");
}

async function setupPushDevicesCollection(databases) {
  await ensureCollection(databases, "push_devices", "Push Devices");
  await ensureStringAttr(databases, "push_devices", "userId", 64, true);
  await ensureStringAttr(databases, "push_devices", "expoPushToken", 256, true);
  await ensureStringAttr(databases, "push_devices", "platform", 16, true);
  await ensureStringAttr(databases, "push_devices", "updatedAt", 32, true);
  console.log("✓ Schema push_devices OK");
}

async function setupAppSettingsCollection(databases) {
  await ensureCollection(databases, "app_settings", "App Settings");
  await ensureStringAttr(databases, "app_settings", "evolutionBaseUrl", 256, false);
  await ensureStringAttr(databases, "app_settings", "evolutionApiKey", 256, false);
  await ensureStringAttr(databases, "app_settings", "evolutionInstanceName", 128, false);
  await ensureStringAttr(databases, "app_settings", "templateLoanCreated", 512, false);
  await ensureStringAttr(databases, "app_settings", "templateDueSoon", 512, false);
  await ensureStringAttr(databases, "app_settings", "templateDueToday", 512, false);
  await ensureStringAttr(databases, "app_settings", "templateOverdue", 512, false);
  console.log("✓ Schema app_settings OK");
}

async function ensureStorageBuckets() {
  const { Storage } = await import("node-appwrite");
  const storage = new Storage(serverClient());
  const buckets = [
    { bucketId: "customer-photos", name: "Customer Photos", max: 5_000_000 },
    { bucketId: "customer-documents", name: "Customer Documents", max: 10_000_000 },
  ];
  for (const b of buckets) {
    try {
      await storage.getBucket(b.bucketId);
      console.log("✓ Bucket", b.bucketId, "já existe");
    } catch {
      await storage.createBucket({
        bucketId: b.bucketId,
        name: b.name,
        permissions: BUCKET_PERMISSIONS,
        fileSecurity: false,
        maximumFileSize: b.max,
        allowedFileExtensions: ["jpg", "jpeg", "png", "pdf", "webp"],
      });
      console.log("✓ Bucket", b.bucketId, "criado");
    }
  }
}

async function findUserByEmail(users, email) {
  const list = await users.list({ search: email });
  return list.users.find((u) => u.email === email) ?? null;
}

async function ensureAdminUser(users, databases) {
  let user = await findUserByEmail(users, ADMIN_EMAIL);

  if (!user) {
    user = await users.create({
      userId: ID.unique(),
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    });
    console.log("✓ Usuário admin criado:", ADMIN_EMAIL);
  } else {
    console.log("✓ Usuário admin já existe:", ADMIN_EMAIL);
  }

  const data = {
    fullName: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: "admin",
    isApproved: true,
  };
  const permissions = profilePermissions(user.$id, data);
  try {
    await databases.getDocument({
      databaseId: DATABASE_ID,
      collectionId: "profiles",
      documentId: user.$id,
    });
    await databases.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: "profiles",
      documentId: user.$id,
      data,
      permissions,
    });
    console.log("✓ Profile admin atualizado");
  } catch {
    await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: "profiles",
      documentId: user.$id,
      data,
      permissions,
    });
    console.log("✓ Profile admin criado");
  }

  const keep = user.labels.filter((l) => !["admin", "staff"].includes(l));
  await users.updateLabels({
    userId: user.$id,
    labels: [...keep, ...labelsFor(data)],
  });
  console.log("✓ Labels admin aplicadas");

  return user;
}

async function validateClientLogin() {
  const { Account, Client: WebClient } = await import("appwrite");
  const client = new WebClient().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  const account = new Account(client);

  try {
    await account.createEmailPasswordSession(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch (err) {
    if (err.code !== 409) throw err;
  }

  const sessionUser = await account.get();
  const ping = await client.ping();

  console.log("\n── Validação ──");
  console.log("Ping:", ping);
  console.log("Login OK:", sessionUser.email, "|", sessionUser.name);
  console.log("User ID:", sessionUser.$id);

  await account.deleteSession("current");
  console.log("✓ Sessão de teste encerrada");
}

async function enableEmailPasswordAuth() {
  const project = new Project(serverClient());
  try {
    await project.updateAuthMethod({
      methodId: "email-password",
      enabled: true,
    });
    console.log("✓ Auth Email/Password habilitado");
  } catch (err) {
    console.warn(
      "⚠ Não foi possível habilitar Email/Password via API:",
      err.message ?? err,
    );
    console.warn("  Habilite manualmente: Auth → Settings → Email/Password");
  }
}

async function ensureWebPlatforms() {
  const project = new Project(serverClient());
  const platforms = [
    { platformId: "riocred-web-local", name: "RioCred Local", hostname: "localhost" },
    {
      platformId: "riocred-web-prod",
      name: "RioCred Web",
      hostname: "riocred.online",
    },
  ];

  let existing = [];
  try {
    const list = await project.listPlatforms();
    existing = list.platforms.map((p) => p.$id);
  } catch {
    /* list may fail on older scopes */
  }

  for (const plat of platforms) {
    if (existing.includes(plat.platformId)) {
      console.log("✓ Platform web já existe:", plat.hostname);
      continue;
    }
    try {
      await project.createWebPlatform(plat);
      console.log("✓ Platform web criada:", plat.hostname);
    } catch (err) {
      if (String(err.message).includes("already exists")) {
        console.log("✓ Platform web já existe:", plat.hostname);
      } else {
        console.warn("⚠ Platform", plat.hostname, ":", err.message ?? err);
      }
    }
  }
}

async function main() {
  console.log("RioCred — Appwrite Setup\n");
  console.log("Endpoint:", ENDPOINT);
  console.log("Project:", PROJECT_ID);
  console.log("Admin:", ADMIN_EMAIL, "\n");

  const client = serverClient();
  const databases = new Databases(client);
  const users = new Users(client);

  await enableEmailPasswordAuth();
  await ensureWebPlatforms();
  await ensureDatabase(databases);
  await setupProfilesCollection(databases);
  await setupCustomersCollection(databases);
  await setupLoansCollection(databases);
  await setupInstallmentsCollection(databases);
  await setupUserSettingsCollection(databases);
  await setupPayablesCollection(databases);
  await setupRoutesCollection(databases);
  await setupManagerRouteAccessCollection(databases);
  await setupLoanPaymentsCollection(databases);
  await setupCustomerDocumentsCollection(databases);
  await setupPushDevicesCollection(databases);
  await setupAppSettingsCollection(databases);
  try {
    await ensureStorageBuckets();
  } catch (err) {
    console.warn(
      "⚠ Buckets de storage:",
      err.message ?? err,
      "\n  Crie manualmente: customer-photos, customer-documents",
    );
  }
  await ensureAdminUser(users, databases);

  try {
    await validateClientLogin();
  } catch (err) {
    console.warn(
      "\n⚠ Validação de login pelo client falhou:",
      err.message ?? err,
    );
    console.warn(
      "  Habilite Auth → Email/Password no console Appwrite e rode: npm run validate:appwrite",
    );
  }

  console.log("\n✅ Setup concluído!");
  console.log("\nAdmin:", ADMIN_EMAIL, "(senha definida em ADMIN_PASSWORD)");
}

main().catch((err) => {
  console.error("\n❌ Setup falhou:\n", err.message ?? err);
  process.exit(1);
});
