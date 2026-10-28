import type { Ionicons } from "@expo/vector-icons";

export type NavIcon = keyof typeof Ionicons.glyphMap;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  iconActive?: NavIcon;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/(tabs)", label: "Início", icon: "grid-outline", iconActive: "grid" },
  {
    href: "/(tabs)/customers",
    label: "Clientes",
    icon: "people-outline",
    iconActive: "people",
  },
  {
    href: "/(tabs)/loans",
    label: "Empréstimos",
    icon: "wallet-outline",
    iconActive: "wallet",
  },
  {
    href: "/(tabs)/calendar",
    label: "Agenda",
    icon: "calendar-outline",
    iconActive: "calendar",
  },
];

export const TOOLS_NAV: NavItem[] = [
  {
    href: "/(stack)/customer-scores",
    label: "Score",
    icon: "analytics-outline",
    iconActive: "analytics",
  },
  {
    href: "/(stack)/overdue",
    label: "Vencidos",
    icon: "alert-circle-outline",
    iconActive: "alert-circle",
  },
  {
    href: "/(stack)/caixa",
    label: "Caixa",
    icon: "cash-outline",
    iconActive: "cash",
  },
  {
    href: "/(stack)/loans-report",
    label: "Relatórios",
    icon: "document-text-outline",
    iconActive: "document-text",
  },
  {
    href: "/(stack)/loan-simulator",
    label: "Simulador",
    icon: "calculator-outline",
    iconActive: "calculator",
  },
  {
    href: "/(stack)/payables",
    label: "Contas a pagar",
    icon: "receipt-outline",
    iconActive: "receipt",
  },
  {
    href: "/(stack)/settings",
    label: "Configurações",
    icon: "settings-outline",
    iconActive: "settings",
  },
  {
    href: "/(stack)/sync-status",
    label: "Sincronização",
    icon: "cloud-outline",
    iconActive: "cloud",
  },
];

export const ADMIN_NAV: NavItem[] = [
  {
    href: "/(stack)/team-overview",
    label: "Equipe & Rotas",
    icon: "people-circle-outline",
    iconActive: "people-circle",
  },
  {
    href: "/(stack)/admin-approvals",
    label: "Aprovações",
    icon: "shield-checkmark-outline",
    iconActive: "shield-checkmark",
  },
  {
    href: "/(stack)/admin-routes",
    label: "Rotas",
    icon: "map-outline",
    iconActive: "map",
  },
  {
    href: "/(stack)/admin-notifications",
    label: "Notificações",
    icon: "notifications-outline",
    iconActive: "notifications",
  },
];
