import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useScopedData } from "@/hooks/useScopedData";
import {
  cancelReminders,
  ensureReminderPermission,
  getRemindersEnabled,
  onReminderOpened,
  remindersSupported,
  scheduleReminders,
  setRemindersEnabled,
} from "@/services/local-reminders";
import {
  buildReminderPlan,
  reminderPlanSignature,
} from "@/utils/reminder-plan";

const ENABLED_QUERY_KEY = ["reminders-enabled"];

export function useRemindersEnabled() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ENABLED_QUERY_KEY,
    queryFn: getRemindersEnabled,
    enabled: remindersSupported,
    staleTime: Infinity,
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      await setRemindersEnabled(enabled);
      if (!enabled) return { enabled, permission: true };
      return { enabled, permission: await ensureReminderPermission() };
    },
    onSuccess: ({ enabled }) => qc.setQueryData(ENABLED_QUERY_KEY, enabled),
  });

  return {
    supported: remindersSupported,
    loaded: query.isSuccess,
    enabled: query.data ?? false,
    toggle,
  };
}

/** Deve ser montado apenas com usuário autenticado. */
export function useLocalReminders() {
  const router = useRouter();
  const { loans, installments } = useScopedData();
  const { supported, loaded, enabled } = useRemindersEnabled();
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    return onReminderOpened((url) => router.push(url as never));
  }, [supported, router]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      lastSignature.current = null;
      void cancelReminders();
    };
  }, [supported]);

  useEffect(() => {
    if (!supported || !loaded) return;
    if (!enabled) {
      lastSignature.current = null;
      void cancelReminders();
      return;
    }
    if (!loans || !installments) return;

    const plan = buildReminderPlan(installments, loans);
    const signature = reminderPlanSignature(plan);
    if (signature === lastSignature.current) return;

    let cancelled = false;
    (async () => {
      if (!(await ensureReminderPermission()) || cancelled) return;
      await scheduleReminders(plan);
      lastSignature.current = signature;
    })().catch(() => {
      lastSignature.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [supported, loaded, enabled, loans, installments]);
}

export function LocalReminders() {
  useLocalReminders();
  return null;
}
