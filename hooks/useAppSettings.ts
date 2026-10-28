import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppSettings, updateAppSettings } from "@/services/app-settings";
import type { AppSettings } from "@/types/app-settings";

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });
}

export function useAppSettingsMutations() {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (input: Omit<AppSettings, "$id">) => updateAppSettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-settings"] }),
  });
  return { save };
}
