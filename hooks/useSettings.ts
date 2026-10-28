import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  ensureUserSettings,
  getUserSettings,
  updateProfileName,
  updateUserSettings,
} from "@/services/settings";
import type { UserSettingsInput } from "@/types/settings";

export function useSettings() {
  const { user } = useAuth();
  const ownerId = user?.$id ?? "";

  return useQuery({
    queryKey: ["settings", ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      return ensureUserSettings(ownerId);
    },
    enabled: Boolean(ownerId),
  });
}

export function useSettingsMutations() {
  const { user } = useAuth();
  const ownerId = user?.$id ?? "";
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["settings", ownerId] });

  const saveSettings = useMutation({
    mutationFn: (input: UserSettingsInput) =>
      updateUserSettings(ownerId, input),
    onSuccess: invalidate,
  });

  const saveName = useMutation({
    mutationFn: (fullName: string) => updateProfileName(ownerId, fullName),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return { saveSettings, saveName };
}
