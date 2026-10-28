import { useMemo } from "react";
import { useScopedData } from "@/hooks/useScopedData";
import {
  buildDashboardMetrics,
  type DashboardMetrics,
} from "@/utils/dashboard-metrics";

export function useDashboardMetrics(): DashboardMetrics | null {
  const { customers, loans, installments, payments } = useScopedData();

  return useMemo(() => {
    if (!customers || !loans || !installments || !payments) return null;
    return buildDashboardMetrics(loans, installments, payments, customers);
  }, [customers, loans, installments, payments]);
}
