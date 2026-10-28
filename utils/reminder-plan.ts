import type { Loan, LoanInstallment } from "@/types/loan";
import { formatBRL } from "@/utils/currency";
import { todayIso } from "@/utils/due-today-list";

export const REMINDER_DAYS = 14;
export const REMINDER_HOUR = 8;
export const REMINDER_ID_PREFIX = "riocred-reminder-";

export type ReminderPlanItem = {
  id: string;
  date: Date;
  title: string;
  body: string;
};

type OpenInstallment = {
  dueDate: string;
  amountDue: number;
  customerName: string;
};

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function sum(items: OpenInstallment[]): number {
  return Math.round(items.reduce((acc, i) => acc + i.amountDue, 0) * 100) / 100;
}

function namesPreview(items: OpenInstallment[]): string {
  const names = [...new Set(items.map((i) => i.customerName))];
  const shown = names.slice(0, 2).join(", ");
  const rest = names.length - 2;
  return rest > 0 ? `${shown} e +${rest}` : shown;
}

/**
 * Um lembrete por dia às 8h. Atrasos são projetados assumindo que nada
 * será pago até lá; o plano é refeito sempre que os dados mudam.
 */
export function buildReminderPlan(
  installments: LoanInstallment[],
  loans: Loan[],
  now = new Date(),
): ReminderPlanItem[] {
  const loanById = new Map(loans.map((l) => [l.$id, l]));
  const open: OpenInstallment[] = [];

  for (const inst of installments) {
    if (inst.status === "paid") continue;
    const loan = loanById.get(inst.loanId);
    if (!loan) continue;
    const amountDue =
      Math.round((inst.scheduledAmount - inst.paidAmount) * 100) / 100;
    if (amountDue <= 0) continue;
    open.push({
      dueDate: inst.dueDate,
      amountDue,
      customerName: loan.customerName,
    });
  }

  const plan: ReminderPlanItem[] = [];

  for (let offset = 0; offset < REMINDER_DAYS; offset++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      REMINDER_HOUR,
      0,
      0,
    );
    if (date <= now) continue;

    const day = todayIso(date);
    const due = open.filter((i) => i.dueDate === day);
    const overdue = open.filter((i) => i.dueDate < day);
    if (due.length === 0 && overdue.length === 0) continue;

    const lines: string[] = [];
    if (due.length > 0) {
      lines.push(
        `${plural(due.length, "parcela vence", "parcelas vencem")} hoje · ${formatBRL(sum(due))} (${namesPreview(due)})`,
      );
    }
    if (overdue.length > 0) {
      lines.push(
        `${plural(overdue.length, "parcela", "parcelas")} em atraso · ${formatBRL(sum(overdue))}`,
      );
    }

    plan.push({
      id: `${REMINDER_ID_PREFIX}${day}`,
      date,
      title: due.length > 0 ? "Cobranças de hoje" : "Parcelas em atraso",
      body: lines.join("\n"),
    });
  }

  return plan;
}

export function reminderPlanSignature(plan: ReminderPlanItem[]): string {
  return plan.map((p) => `${p.id}|${p.body}`).join("\n");
}
