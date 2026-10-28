import type { ReminderPlanItem } from "@/utils/reminder-plan";

export const remindersSupported = false;

export async function getRemindersEnabled(): Promise<boolean> {
  return false;
}

export async function setRemindersEnabled(_enabled: boolean): Promise<void> {}

export async function ensureReminderPermission(): Promise<boolean> {
  return false;
}

export async function cancelReminders(): Promise<void> {}

export async function scheduleReminders(
  _plan: ReminderPlanItem[],
): Promise<void> {}

export function onReminderOpened(_handler: (url: string) => void): () => void {
  return () => {};
}
