/**
 * Preenche managerId/managerName em empréstimos antigos com base na rota do cliente.
 *
 * Requer APPWRITE_API_KEY no .env.
 * Uso:
 *   npm run backfill:loan-managers          # dry-run (só mostra o plano)
 *   npm run backfill:loan-managers -- --apply
 *   npm run backfill:loan-managers -- --apply --force  # reatribui todos
 */
import "dotenv/config";
import { Client, Databases, Query } from "node-appwrite";
import { planLoanManagerBackfill } from "./lib/backfill-loan-manager.mjs";

const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "6a3222d2000513ac5182";
const API_KEY = process.env.APPWRITE_API_KEY ?? "";
const DATABASE_ID = "riocred";

const COLLECTIONS = {
  loans: "loans",
  customers: "customers",
  profiles: "profiles",
  managerRouteAccess: "manager_route_access",
};

function serverClient() {
  if (!API_KEY) {
    throw new Error(
      "APPWRITE_API_KEY ausente no .env.\n" +
        "Crie em: Console → Settings → API Keys (scopes: documents read+write)",
    );
  }
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
}

async function listAllDocuments(databases, collectionId) {
  const documents = [];
  let cursor = undefined;

  while (true) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      queries,
    );
    documents.push(...res.documents);

    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }

  return documents;
}

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    force: argv.includes("--force"),
  };
}

async function main() {
  const { apply, force } = parseArgs(process.argv.slice(2));
  const databases = new Databases(serverClient());

  console.log("Carregando dados do Appwrite…\n");

  const [loanDocs, customerDocs, profileDocs, accessDocs] = await Promise.all([
    listAllDocuments(databases, COLLECTIONS.loans),
    listAllDocuments(databases, COLLECTIONS.customers),
    listAllDocuments(databases, COLLECTIONS.profiles),
    listAllDocuments(databases, COLLECTIONS.managerRouteAccess),
  ]);

  const loans = loanDocs.map((d) => ({
    id: d.$id,
    customerId: d.customerId ?? "",
    managerId: d.managerId ?? "",
    managerName: d.managerName ?? "",
  }));

  const customers = customerDocs.map((d) => ({
    id: d.$id,
    routeId: d.routeId ?? "",
  }));

  const profiles = profileDocs.map((d) => ({
    id: d.$id,
    name: d.fullName ?? d.email ?? "",
    role: d.role ?? "",
    isApproved: Boolean(d.isApproved),
  }));

  const accessRows = accessDocs.map((d) => ({
    managerId: d.managerId ?? "",
    routeId: d.routeId ?? "",
  }));

  const plan = planLoanManagerBackfill(loans, customers, accessRows, profiles, {
    force,
  });

  console.log(`Empréstimos analisados: ${loans.length}`);
  console.log(`Atualizações planejadas: ${plan.updates.length}`);
  console.log(`Ignorados: ${plan.skips.length}`);

  if (plan.routeConflicts.length > 0) {
    console.log("\nRotas com mais de um funcionário (usando o primeiro por nome):");
    for (const conflict of plan.routeConflicts) {
      console.log(`  - rota ${conflict.routeId}: ${conflict.managerIds.join(", ")}`);
    }
  }

  if (plan.updates.length > 0) {
    console.log("\nAmostra de atualizações:");
    for (const row of plan.updates.slice(0, 10)) {
      console.log(
        `  - ${row.loanId} → ${row.managerName} (${row.managerId}) [rota ${row.routeId}]`,
      );
    }
    if (plan.updates.length > 10) {
      console.log(`  … e mais ${plan.updates.length - 10}`);
    }
  }

  const skipReasons = plan.skips.reduce((acc, row) => {
    acc[row.reason] = (acc[row.reason] ?? 0) + 1;
    return acc;
  }, {});
  if (Object.keys(skipReasons).length > 0) {
    console.log("\nMotivos de ignorados:");
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  - ${reason}: ${count}`);
    }
  }

  if (!apply) {
    console.log(
      "\nDry-run concluído. Para aplicar: npm run backfill:loan-managers -- --apply",
    );
    return;
  }

  console.log("\nAplicando atualizações…");
  let updated = 0;
  for (const row of plan.updates) {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.loans, row.loanId, {
      managerId: row.managerId,
      managerName: row.managerName,
    });
    updated += 1;
  }

  console.log(`✓ ${updated} empréstimo(s) atualizado(s).`);
}

main().catch((err) => {
  console.error("✗", err.message ?? err);
  process.exit(1);
});
