import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOperationalOwnerId } from "@/hooks/useOperationalOwnerId";
import {
  createCustomer,
  deleteCustomerCascade,
  listCustomers,
  updateCustomer,
} from "@/services/customers";
import type { CustomerInput } from "@/types/customer";

export function useCustomers() {
  const ownerId = useOperationalOwnerId();

  return useQuery({
    queryKey: ["customers", ownerId],
    queryFn: () => listCustomers(ownerId),
    enabled: Boolean(ownerId),
  });
}

export function useCustomerMutations() {
  const ownerId = useOperationalOwnerId();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["customers", ownerId] });
    queryClient.invalidateQueries({ queryKey: ["loans", ownerId] });
    queryClient.invalidateQueries({ queryKey: ["installments", ownerId] });
    queryClient.invalidateQueries({ queryKey: ["loan-payments", ownerId] });
  };

  const create = useMutation({
    mutationFn: (input: CustomerInput) => createCustomer(ownerId, input),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) =>
      updateCustomer(id, ownerId, input),
    onSuccess: invalidateAll,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCustomerCascade(ownerId, id),
    onSuccess: invalidateAll,
  });

  return { create, update, remove };
}
