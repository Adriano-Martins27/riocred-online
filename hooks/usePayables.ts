import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPayable,
  deletePayable,
  listPayables,
  updatePayable,
} from "@/services/payables";
import type { PayableInput } from "@/types/payable";

export function usePayables() {
  const { user } = useAuth();
  const ownerId = user?.$id ?? "";

  return useQuery({
    queryKey: ["payables", ownerId],
    queryFn: () => listPayables(ownerId),
    enabled: Boolean(ownerId),
  });
}

export function usePayableMutations() {
  const { user } = useAuth();
  const ownerId = user?.$id ?? "";
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["payables", ownerId] });

  const create = useMutation({
    mutationFn: (input: PayableInput) => createPayable(ownerId, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PayableInput }) =>
      updatePayable(id, ownerId, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePayable(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
