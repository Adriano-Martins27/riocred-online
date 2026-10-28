/** Minimal loan simulation for seed/backfill scripts (mirrors utils/loan-simulator.ts). */

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function skipWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 6) return addDays(d, 2);
  if (day === 0) return addDays(d, 1);
  return d;
}

function nextDueDate(firstDue, index, frequency, skipWeekends) {
  let d;
  switch (frequency) {
    case "monthly":
      d = addMonths(firstDue, index);
      break;
    case "biweekly":
      d = addDays(firstDue, index * 14);
      break;
    case "weekly":
      d = addDays(firstDue, index * 7);
      break;
    case "daily":
      d = addDays(firstDue, index);
      break;
    default:
      d = addMonths(firstDue, index);
  }
  return skipWeekends ? skipWeekend(d) : d;
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function simulateLoan(input) {
  const {
    principal,
    interestRate,
    interestMode,
    frequency,
    installmentCount,
    firstDueDate,
    skipWeekends,
  } = input;

  const n = Math.max(1, Math.min(36, installmentCount));
  const rate = interestRate / 100;

  const totalInterest =
    interestMode === "on_contract" ? principal * rate : principal * rate * n;

  const totalReceivable = principal + totalInterest;
  const installmentAmount = totalReceivable / n;
  const effectiveRate = principal > 0 ? (totalInterest / principal) * 100 : 0;

  const firstDue = new Date(firstDueDate + "T12:00:00");
  const installments = [];
  let allocated = 0;

  for (let i = 0; i < n; i++) {
    const due = nextDueDate(firstDue, i, frequency, skipWeekends);
    let scheduledAmount = Math.round(installmentAmount * 100) / 100;
    if (i === n - 1) {
      scheduledAmount = Math.round((totalReceivable - allocated) * 100) / 100;
    }
    allocated += scheduledAmount;
    installments.push({
      installmentNumber: i + 1,
      dueDate: toIsoDate(due),
      scheduledAmount,
    });
  }

  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    totalReceivable: Math.round(totalReceivable * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    installments,
  };
}

export function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

export function installmentStatusForSeed(dueDate, paidAmount, scheduledAmount) {
  if (paidAmount >= scheduledAmount) return "paid";
  const due = new Date(dueDate + "T23:59:59");
  if (due < new Date()) return "overdue";
  if (paidAmount > 0) return "partial";
  return "pending";
}
