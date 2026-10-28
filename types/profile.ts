export type UserRole = "admin" | "manager";

export type Profile = {
  $id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  /** Comissão: ver capital na rua e totais. Salário: oculto. */
  canViewFinancials: boolean;
  /** Pode editar clientes existentes. */
  canEditCustomers: boolean;
  /** Pode excluir clientes. */
  canDeleteCustomers: boolean;
};

export type ProfileInput = {
  fullName: string;
  email: string;
  role?: UserRole;
  isApproved?: boolean;
};
