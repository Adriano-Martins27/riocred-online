import { Permission, Role } from "node-appwrite";

export {
  labelsFor,
  profilePermissions,
} from "../functions/profile-service/src/main.js";

const staff = Role.label("staff");
const admin = Role.label("admin");

const crud = (role) => [
  Permission.read(role),
  Permission.create(role),
  Permission.update(role),
  Permission.delete(role),
];

const ADMIN_MANAGED = [
  Permission.read(staff),
  Permission.create(admin),
  Permission.update(admin),
  Permission.delete(admin),
];

/**
 * Perfis só são gravados pela Function profile-service; cada usuário lê o
 * próprio perfil por permissão de documento.
 */
const POLICIES = {
  profiles: { permissions: [Permission.read(admin)], documentSecurity: true },
  routes: { permissions: ADMIN_MANAGED, documentSecurity: false },
  manager_route_access: { permissions: ADMIN_MANAGED, documentSecurity: false },
  app_settings: { permissions: crud(admin), documentSecurity: false },
};

export function collectionPolicy(collectionId) {
  return POLICIES[collectionId] ?? { permissions: crud(staff), documentSecurity: false };
}

export const BUCKET_PERMISSIONS = crud(staff);
