import { Linking, Platform } from "react-native";
import type { Loan } from "@/types/loan";
import type { UserSettings } from "@/types/settings";
import { formatBRL } from "@/utils/currency";

function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let msg = template;
  for (const [key, val] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  return msg;
}

export function buildLoanWhatsAppMessage(
  loan: Loan,
  settings: UserSettings | null,
  mode: "full" | "short",
): string {
  const company = settings?.companyName || "RioCred";
  const pix = settings?.pixKey ? `\nPIX: ${settings.pixKey}` : "";

  if (settings && !settings.whatsappEnabled) {
    return (
      `${company}\n` +
      `Contrato registrado para ${loan.customerName}. Contate o operador para detalhes.`
    );
  }

  if (mode === "short") {
    return (
      `${company}\n` +
      `Olá ${loan.customerName}! Seu empréstimo de ${formatBRL(loan.principal)} ` +
      `foi registrado. Total: ${formatBRL(loan.totalReceivable)} em ${loan.installmentCount}x.${pix}`
    );
  }

  return (
    `${company}\n` +
    `Contrato de empréstimo\n` +
    `Cliente: ${loan.customerName}\n` +
    `Valor: ${formatBRL(loan.principal)}\n` +
    `Juros: ${loan.interestRate}% (${loan.interestMode === "on_contract" ? "no contrato" : "por parcela"})\n` +
    `Parcelas: ${loan.installmentCount}x\n` +
    `Total a pagar: ${formatBRL(loan.totalReceivable)}\n` +
    `1º vencimento: ${loan.firstDueDate.split("-").reverse().join("/")}${pix}`
  );
}

export function buildCollectionMessage(
  settings: UserSettings | null,
  vars: {
    nome: string;
    valor: string;
    data: string;
    empresa?: string;
  },
  kind: "default" | "due_today" | "overdue",
): string {
  const company = settings?.companyName || "RioCred";
  const base = { ...vars, empresa: company };
  const templates = {
    default: settings?.templateDefault ||
      "Olá {nome}, sua parcela de {valor} vence em {data}. — {empresa}",
    due_today: settings?.templateDueToday ||
      "Olá {nome}, sua parcela de {valor} vence hoje. — {empresa}",
    overdue: settings?.templateOverdue ||
      "Olá {nome}, identificamos parcela em atraso de {valor}. — {empresa}",
  };
  const pix = settings?.pixKey ? `\nPIX: ${settings.pixKey}` : "";
  return applyTemplate(templates[kind], base) + pix;
}

export function whatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const url = whatsAppUrl(phone, message);
  if (!url) return;
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}
