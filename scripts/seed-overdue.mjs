/**
 * Seed pequeno: clientes + empréstimos com parcelas vencidas.
 *
 * Requer APPWRITE_API_KEY e admin existente (npm run setup:appwrite).
 *
 * Uso:
 *   npm run seed:overdue           # cria se ainda não existir
 *   npm run seed:overdue -- --force  # recria (apaga seeds anteriores)
 */
import "dotenv/config";
import { Client, Databases, ID, Query, Users } from "node-appwrite";
import {
  installmentStatusForSeed,
  isoDaysAgo,
  simulateLoan,
} from "./lib/loan-simulator.mjs";

const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "6a3222d2000513ac5182";
const API_KEY = process.env.APPWRITE_API_KEY ?? "";
const DATABASE_ID = "riocred";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "admin@riocred.online";
const ADMIN_NAME =
  process.env.ADMIN_NAME ?? "Administrador RioCred";

const COLLECTIONS = {
  customers: "customers",
  loans: "loans",
  loanInstallments: "loan_installments",
  routes: "routes",
};

const SEED_TAG = "seed-overdue-v1";

const SEED_CUSTOMERS = [
  {
    fullName: "Cliente Seed Vencido 1",
    cpf: "90000000001",
    phone: "11990000001",
  },
  {
    fullName: "Cliente Seed Vencido 2",
    cpf: "90000000002",
    phone: "11990000002",
  },
  {
    fullName: "Cliente Seed Vencido 3",
    cpf: "90000000003",
    phone: "11990000003",
  },
];

/** principal, parcelas, dias desde o 1º vencimento */
const SEED_LOANS = [
  { principal: 500, installmentCount: 4, firstDueDaysAgo: 75 },
  { principal: 800, installmentCount: 3, firstDueDaysAgo: 45 },
  { principal: 350, installmentCount: 6, firstDueDaysAgo: 120 },
];

function serverClient() {
  if (!API_KEY) {
    throw new Error(
      "APPWRITE_API_KEY ausente no .env (scopes: documents read+write, users read)",
    );
  }
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
}

async function findUserByEmail(users, email) {
  const list = await users.list({ search: email });
  return list.users.find((u) => u.email === email) ?? null;
}

async function listByOwner(databases, collectionId, ownerId) {
  const documents = [];
  let cursor;
  while (true) {
    const queries = [Query.equal("ownerId", ownerId), Query.limit(100)];
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

async function deleteSeedData(databases, ownerId) {
  const customers = (await listByOwner(databases, COLLECTIONS.customers, ownerId)).filter(
    (c) => String(c.clientRequestId ?? "").startsWith(SEED_TAG),
  );

  if (customers.length === 0) {
    console.log("Nenhum seed anterior encontrado.");
    return;
  }

  const customerIds = new Set(customers.map((c) => c.$id));
  const loans = (await listByOwner(databases, COLLECTIONS.loans, ownerId)).filter(
    (l) => customerIds.has(l.customerId),
  );
  const loanIds = new Set(loans.map((l) => l.$id));
  const installments = (
    await listByOwner(databases, COLLECTIONS.loanInstallments, ownerId)
  ).filter((i) => loanIds.has(i.loanId));

  for (const inst of installments) {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.loanInstallments,
      inst.$id,
    );
  }
  for (const loan of loans) {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.loans, loan.$id);
  }
  for (const customer of customers) {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.customers,
      customer.$id,
    );
  }

  console.log(
    `✓ Removido seed anterior: ${customers.length} clientes, ${loans.length} empréstimos, ${installments.length} parcelas`,
  );
}

async function ensureSeedRoute(databases, ownerId) {
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.routes,
    [Query.equal("name", "Seed — Vencidos")],
  );
  if (existing.documents.length > 0) {
    return existing.documents[0].$id;
  }
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.routes,
    ID.unique(),
    {
      name: "Seed — Vencidos",
      createdBy: ownerId,
    },
  );
  console.log("✓ Rota seed criada: Seed — Vencidos");
  return doc.$id;
}

async function createCustomer(databases, ownerId, routeId, data, index) {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.customers,
    ID.unique(),
    {
      ownerId,
      fullName: data.fullName,
      cpf: data.cpf,
      phone: data.phone,
      clientType: "pessoa_fisica",
      billingType: "emprestimo",
      referrerName: "",
      referrerPhone: "",
      routeId,
      active: true,
      zipCode: "",
      street: "Rua Seed",
      number: String(100 + index),
      complement: "",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      reference: SEED_TAG,
      photoFileId: "",
      photoUpdatedAt: "",
      clientRequestId: `${SEED_TAG}-${index}`,
    },
  );
  return doc;
}

async function createOverdueLoan(
  databases,
  ownerId,
  customer,
  managerId,
  managerName,
  spec,
) {
  const firstDueDate = isoDaysAgo(spec.firstDueDaysAgo);
  const startDate = isoDaysAgo(spec.firstDueDaysAgo + 5);

  const sim = simulateLoan({
    principal: spec.principal,
    interestRate: 8,
    interestMode: "on_contract",
    frequency: "monthly",
    installmentCount: spec.installmentCount,
    firstDueDate,
    skipWeekends: true,
  });

  const loanId = ID.unique();
  const loanDoc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.loans,
    loanId,
    {
      ownerId,
      customerId: customer.$id,
      customerName: customer.fullName,
      principal: spec.principal,
      interestRate: 8,
      interestMode: "on_contract",
      frequency: "monthly",
      installmentCount: spec.installmentCount,
      startDate,
      firstDueDate,
      skipWeekends: true,
      lateFeeMode: "percent_installment_daily",
      lateFeeValue: 0.5,
      totalInterest: sim.totalInterest,
      totalReceivable: sim.totalReceivable,
      status: "active",
      clientRequestId: `${SEED_TAG}-loan-${loanId}`,
      managerId,
      managerName,
    },
  );

  let overdueCount = 0;
  for (const inst of sim.installments) {
    const status = installmentStatusForSeed(
      inst.dueDate,
      0,
      inst.scheduledAmount,
    );
    if (status === "overdue") overdueCount++;
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.loanInstallments,
      ID.unique(),
      {
        loanId,
        ownerId,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        scheduledAmount: inst.scheduledAmount,
        paidAmount: 0,
        status,
      },
    );
  }

  return { loan: loanDoc, overdueCount };
}

async function main() {
  const force = process.argv.includes("--force");

  console.log("RioCred — Seed vencidos\n");
  console.log("Endpoint:", ENDPOINT);
  console.log("Project:", PROJECT_ID);
  console.log("Admin:", ADMIN_EMAIL, "\n");

  const client = serverClient();
  const databases = new Databases(client);
  const users = new Users(client);

  const admin = await findUserByEmail(users, ADMIN_EMAIL);
  if (!admin) {
    throw new Error(
      `Usuário admin não encontrado (${ADMIN_EMAIL}). Rode: npm run setup:appwrite`,
    );
  }

  const ownerId = admin.$id;
  const managerName = ADMIN_NAME;

  const existing = (
    await listByOwner(databases, COLLECTIONS.customers, ownerId)
  ).filter((c) => String(c.clientRequestId ?? "").startsWith(SEED_TAG));

  if (existing.length > 0 && !force) {
    console.log(
      `Seed já existe (${existing.length} clientes). Use --force para recriar.`,
    );
    return;
  }

  if (force) {
    await deleteSeedData(databases, ownerId);
  }

  const routeId = await ensureSeedRoute(databases, ownerId);

  let totalOverdue = 0;
  for (let i = 0; i < SEED_CUSTOMERS.length; i++) {
    const customer = await createCustomer(
      databases,
      ownerId,
      routeId,
      SEED_CUSTOMERS[i],
      i + 1,
    );
    const { loan, overdueCount } = await createOverdueLoan(
      databases,
      ownerId,
      customer,
      ownerId,
      managerName,
      SEED_LOANS[i],
    );
    totalOverdue += overdueCount;
    console.log(
      `✓ ${customer.fullName} — R$ ${SEED_LOANS[i].principal} — ${overdueCount} parcela(s) vencida(s) (loan ${loan.$id.slice(0, 8)}…)`,
    );
  }

  console.log(`\n✅ Seed concluído: ${SEED_CUSTOMERS.length} clientes, ${totalOverdue} parcelas vencidas.`);
  console.log("Veja em: Empréstimos → Atraso, Vencidos ou Agenda → Vencidos.\n");
}

main().catch((err) => {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
});
