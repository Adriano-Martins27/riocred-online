import {
  endOfDay,
  parsePaidAt,
} from "@/utils/financial-metrics";
import { periodStart } from "@/utils/cash-ledger";

export type ReportPeriodInput = {
  days?: number;
  startDate?: string;
  endDate?: string;
};

export function resolveReportPeriod(
  input: ReportPeriodInput,
  now = new Date(),
): { since: Date; until: Date; label: string } {
  if (input.startDate && input.endDate) {
    const since = parsePaidAt(input.startDate);
    const until = endOfDay(parsePaidAt(input.endDate));
    const fmt = (iso: string) => iso.split("-").reverse().join("/");
    return {
      since,
      until,
      label: `${fmt(input.startDate)} — ${fmt(input.endDate)}`,
    };
  }

  const days = input.days ?? 30;
  return {
    since: periodStart(days, now),
    until: endOfDay(now),
    label: `${days} dias`,
  };
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return false;
  return parsePaidAt(startDate) <= parsePaidAt(endDate);
}
