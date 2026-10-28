import {
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
  Users,
} from "node-appwrite";

const DB = "riocred";
const PROFILES = "profiles";
const ROUTE_ACCESS = "manager_route_access";
const ACCESS_LABELS = ["admin", "staff"];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function labelsFor(profile) {
  if (profile.role === "admin") return ["admin", "staff"];
  return profile.isApproved ? ["staff"] : [];
}

export function profilePermissions(userId, profile) {
  const permissions = [Permission.read(Role.user(userId))];
  // Managers precisam do perfil do admin para achar o dono dos dados operacionais.
  if (profile.role === "admin") {
    permissions.push(Permission.read(Role.label("staff")));
  }
  return permissions;
}

function toProfile(doc) {
  return {
    $id: doc.$id,
    fullName: doc.fullName,
    email: doc.email,
    role: doc.role,
    isApproved: doc.isApproved,
    canViewFinancials: doc.canViewFinancials,
    canEditCustomers: doc.canEditCustomers,
    canDeleteCustomers: doc.canDeleteCustomers,
  };
}

async function findProfile(databases, userId) {
  try {
    return await databases.getDocument({
      databaseId: DB,
      collectionId: PROFILES,
      documentId: userId,
    });
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

async function syncAccess(users, databases, userId, profile) {
  const user = await users.get({ userId });
  const keep = user.labels.filter((l) => !ACCESS_LABELS.includes(l));
  await users.updateLabels({
    userId,
    labels: [...keep, ...labelsFor(profile)],
  });
  await databases.updateDocument({
    databaseId: DB,
    collectionId: PROFILES,
    documentId: userId,
    permissions: profilePermissions(userId, profile),
  });
}

async function bootstrap({ users, databases, callerId }) {
  let doc = await findProfile(databases, callerId);
  if (!doc) {
    const user = await users.get({ userId: callerId });
    const data = {
      fullName: user.name || user.email,
      email: user.email,
      role: "manager",
      isApproved: false,
      canViewFinancials: false,
      canEditCustomers: true,
      canDeleteCustomers: false,
    };
    doc = await databases.createDocument({
      databaseId: DB,
      collectionId: PROFILES,
      documentId: callerId,
      data,
      permissions: profilePermissions(callerId, data),
    });
  }
  await syncAccess(users, databases, callerId, doc);
  return toProfile(doc);
}

async function updateName({ users, databases, callerId, body }) {
  const fullName = String(body.fullName ?? "").trim();
  if (!fullName || fullName.length > 256) {
    throw new HttpError(400, "Nome inválido.");
  }
  await users.updateName({ userId: callerId, name: fullName });
  const doc = await databases.updateDocument({
    databaseId: DB,
    collectionId: PROFILES,
    documentId: callerId,
    data: { fullName },
  });
  return toProfile(doc);
}

async function setManagerAccess({ users, databases, callerId, body }) {
  const caller = await users.get({ userId: callerId });
  if (!caller.labels.includes("admin")) {
    throw new HttpError(403, "Apenas administradores podem aprovar funcionários.");
  }

  const managerId = String(body.managerId ?? "");
  const target = await findProfile(databases, managerId);
  if (!target || target.role !== "manager") {
    throw new HttpError(404, "Funcionário não encontrado.");
  }

  const routeIds = Array.isArray(body.routeIds)
    ? [...new Set(body.routeIds.map(String))]
    : [];

  const doc = await databases.updateDocument({
    databaseId: DB,
    collectionId: PROFILES,
    documentId: managerId,
    data: {
      isApproved: Boolean(body.isApproved),
      canViewFinancials: Boolean(body.canViewFinancials),
      canEditCustomers: body.canEditCustomers !== false,
      canDeleteCustomers: Boolean(body.canDeleteCustomers),
    },
  });

  const existing = await databases.listDocuments({
    databaseId: DB,
    collectionId: ROUTE_ACCESS,
    queries: [Query.equal("managerId", managerId), Query.limit(500)],
  });
  for (const row of existing.documents) {
    await databases.deleteDocument({
      databaseId: DB,
      collectionId: ROUTE_ACCESS,
      documentId: row.$id,
    });
  }
  for (const routeId of routeIds) {
    await databases.createDocument({
      databaseId: DB,
      collectionId: ROUTE_ACCESS,
      documentId: ID.unique(),
      data: { managerId, routeId },
    });
  }

  await syncAccess(users, databases, managerId, doc);
  return toProfile(doc);
}

const ACTIONS = { bootstrap, updateName, setManagerAccess };

export default async ({ req, res, error }) => {
  try {
    const callerId = req.headers["x-appwrite-user-id"];
    if (!callerId) throw new HttpError(401, "Login necessário.");

    const body = req.bodyJson ?? (req.body ? JSON.parse(req.body) : {});
    const action = ACTIONS[body.action];
    if (!action) throw new HttpError(400, "Ação desconhecida.");

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers["x-appwrite-key"] ?? process.env.APPWRITE_API_KEY);

    const result = await action({
      users: new Users(client),
      databases: new Databases(client),
      callerId,
      body,
    });
    return res.json({ ok: true, profile: result });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) error(err?.stack ?? String(err));
    return res.json(
      { ok: false, message: status === 500 ? "Erro interno." : err.message },
      status,
    );
  }
};
