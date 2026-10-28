import { Fragment, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppwriteException } from "appwrite";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { CustomerListItem } from "@/components/CustomerListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatCard } from "@/components/ui/StatCard";
import { useCustomerMutations } from "@/hooks/useCustomers";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import { useOperationalOwnerId } from "@/hooks/useOperationalOwnerId";
import { useScopedData } from "@/hooks/useScopedData";
import type { Customer } from "@/types/customer";
import { calculateCustomerScore } from "@/utils/customer-score";
import { fontStyles } from "@/styles/font";
import { colors, radius, spacing } from "@/styles/theme";

export default function CustomersScreen() {
  const operationalOwnerId = useOperationalOwnerId();
  const { canEditCustomers, canDeleteCustomers } = useManagerPermissions();
  const { customers, loans, installments, payments, customersQuery } =
    useScopedData();
  const { isLoading, isRefetching, refetch, error } = customersQuery;
  const { create, update, remove } = useCustomerMutations();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const scoreByCustomer = useMemo(() => {
    const map = new Map<
      string,
      { score: number; band: ReturnType<typeof calculateCustomerScore>["band"] }
    >();
    if (!customers || !loans || !installments || !payments) return map;
    for (const c of customers) {
      const r = calculateCustomerScore(c, loans, installments, payments);
      map.set(c.$id, { score: r.score, band: r.band });
    }
    return map;
  }, [customers, loans, installments, payments]);

  const filtered = useMemo(() => {
    const list = customers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.cpf.includes(q),
    );
  }, [customers, search]);

  const activeCount = customers?.filter((c) => c.active).length ?? 0;

  const setupError =
    error instanceof AppwriteException &&
    (error.code === 404 || error.message.includes("Collection"));

  return (
    <Fragment>
      <ScreenShell
        title="Clientes"
        subtitle={`${customers?.length ?? 0} cadastrados · ${activeCount} ativos`}
        style={styles.shell}
        headerRight={
          <PrimaryButton
            label="+ Novo"
            onPress={() => {
              setSelected(null);
              setModalOpen(true);
            }}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScreenScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
          >
            <View style={styles.stats}>
              <StatCard
                label="Total"
                value={String(customers?.length ?? 0)}
                icon="people"
                style={styles.stat}
              />
              <StatCard
                label="Ativos"
                value={String(activeCount)}
                icon="checkmark-circle"
                tone="success"
                style={styles.stat}
              />
            </View>

            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Nome, telefone ou CPF"
            />

            {setupError ? (
              <View style={styles.alert}>
                <Text style={fontStyles.bodyMBold}>Backend não configurado</Text>
                <Text style={fontStyles.bodyM}>
                  Rode npm run setup:appwrite para criar as collections.
                </Text>
              </View>
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={
                  setupError ? "Configure o Appwrite" : "Nenhum cliente ainda"
                }
                message={
                  setupError
                    ? "Crie o database e as collections no Appwrite."
                    : "Cadastre seu primeiro cliente para começar."
                }
              />
            ) : (
              <View style={styles.list}>
                {filtered.map((item) => {
                  const sc = scoreByCustomer.get(item.$id);
                  return (
                    <CustomerListItem
                      key={item.$id}
                      customer={item}
                      score={sc?.score}
                      band={sc?.band}
                      onPress={() => {
                        setSelected(item);
                        setModalOpen(true);
                      }}
                    />
                  );
                })}
              </View>
            )}

          </ScreenScrollView>
        )}
      </ScreenShell>

      <CustomerFormModal
        visible={modalOpen}
        customer={selected}
        ownerId={operationalOwnerId}
        readOnly={Boolean(selected && !canEditCustomers)}
        canDelete={Boolean(selected && canDeleteCustomers)}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSubmit={async (input) => {
          if (selected) {
            return update.mutateAsync({ id: selected.$id, input });
          }
          return create.mutateAsync(input);
        }}
        onDelete={
          selected
            ? async () => {
                await remove.mutateAsync(selected.$id);
                setSelected(null);
              }
            : undefined
        }
      />
    </Fragment>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, paddingBottom: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  stats: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stat: { flex: 1, minWidth: 120 },
  list: { gap: spacing.sm },
  loader: { marginTop: spacing.lg },
  alert: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
