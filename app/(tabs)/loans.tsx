import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppwriteException } from "appwrite";
import { LoanCreatedModal } from "@/components/LoanCreatedModal";
import { LoanFormModal } from "@/components/LoanFormModal";
import { LoanListItem } from "@/components/LoanListItem";
import { LoanPaymentModal } from "@/components/LoanPaymentModal";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { SearchBar } from "@/components/ui/SearchBar";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { SectionCard } from "@/components/ui/StatCard";
import { useScopedData } from "@/hooks/useScopedData";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import { useManagerPermissions } from "@/hooks/useManagerPermissions";
import {
  useLoanMutations,
  usePortfolioSummary,
} from "@/hooks/useLoans";
import { useSettings } from "@/hooks/useSettings";
import type { Customer } from "@/types/customer";
import type { DerivedLoanStatus, Loan } from "@/types/loan";
import { buildLoanSummary } from "@/utils/loan-summary";
import { formatBRL } from "@/utils/currency";
import { fontStyles } from "@/styles/font";
import { colors, radius, spacing } from "@/styles/theme";

const STATUS_FILTERS: { value: DerivedLoanStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "Em dia", label: "Em dia" },
  { value: "Próximo do vencimento", label: "Próximo" },
  { value: "Em atraso", label: "Atraso" },
  { value: "Quitado", label: "Quitado" },
];

export default function LoansScreen() {
  const { customers, loans, installments: allInstallments, loansQuery } =
    useScopedData();
  const { isLoading, isRefetching, refetch, error } = loansQuery;
  const { data: settings } = useSettings();
  const portfolio = usePortfolioSummary();
  const { canViewFinancials } = useFinancialVisibility();
  const { isAdmin, canDeleteCustomers, canEditCustomers } =
    useManagerPermissions();
  const canDeleteLoans =
    isAdmin || canDeleteCustomers || canEditCustomers;
  const { create, pay, remove, update } = useLoanMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DerivedLoanStatus | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [payLoan, setPayLoan] = useState<Loan | null>(null);
  const [createdLoan, setCreatedLoan] = useState<Loan | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = loans ?? [];
    if (q) {
      list = list.filter((l) => l.customerName.toLowerCase().includes(q));
    }
    if (allInstallments) {
      list = list.filter((l) => {
        const insts = allInstallments.filter((i) => i.loanId === l.$id);
        const status = buildLoanSummary(l, insts).status;
        if (!statusFilter) {
          return status !== "Quitado";
        }
        return status === statusFilter;
      });
    }
    return list;
  }, [loans, search, statusFilter, allInstallments]);

  const setupError =
    error instanceof AppwriteException &&
    (error.code === 404 || error.message.includes("Collection"));

  const instByLoan = (loanId: string) =>
    allInstallments?.filter((i) => i.loanId === loanId) ?? [];

  const phoneByCustomer = useMemo(
    () => new Map((customers ?? []).map((c) => [c.$id, c.phone])),
    [customers],
  );

  return (
    <>
      <ScreenShell
        title="Empréstimos"
        style={styles.shell}
        headerRight={
          <PrimaryButton label="+ Novo" onPress={() => setFormOpen(true)} />
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
            <View style={styles.hero}>
              <View style={styles.heroMain}>
                <Text style={styles.heroLabel}>
                  {canViewFinancials ? "Carteira" : "Empréstimos"}
                </Text>
                {canViewFinancials ? (
                  <>
                    <Text style={styles.heroValue}>
                      {formatBRL(portfolio?.totalRemaining ?? 0)}
                    </Text>
                    <Text style={styles.heroSub}>
                      {portfolio?.activeLoans ?? 0} ativos ·{" "}
                      {portfolio?.overdueInstallments ?? 0} parcelas vencidas
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.heroValue}>
                      {portfolio?.activeLoans ?? 0}
                    </Text>
                    <Text style={styles.heroSub}>
                      contratos ativos · {portfolio?.overdueInstallments ?? 0}{" "}
                      vencidas
                    </Text>
                  </>
                )}
              </View>
              {canViewFinancials ? (
                <View style={styles.heroStats}>
                  <MiniStat
                    icon="trending-up"
                    label="Recebido"
                    value={formatBRL(portfolio?.totalReceived ?? 0)}
                  />
                  <MiniStat
                    icon="alert-circle"
                    label="Vencidas"
                    value={String(portfolio?.overdueInstallments ?? 0)}
                    danger={(portfolio?.overdueInstallments ?? 0) > 0}
                  />
                </View>
              ) : (
                <MiniStat
                  icon="alert-circle"
                  label="Vencidas"
                  value={String(portfolio?.overdueInstallments ?? 0)}
                  danger={(portfolio?.overdueInstallments ?? 0) > 0}
                />
              )}
            </View>

            <SectionCard>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por cliente…"
              />
              <FilterChips
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
                scrollable
              />
            </SectionCard>

            {setupError ? (
              <View style={styles.alert}>
                <Text style={fontStyles.bodyM}>
                  Rode `npm run setup:appwrite` para criar collections de
                  empréstimos.
                </Text>
              </View>
            ) : null}

            {filtered.length > 0 ? (
              <Text style={styles.resultCount}>
                {filtered.length} contrato{filtered.length !== 1 ? "s" : ""}
              </Text>
            ) : null}

            {filtered.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title={setupError ? "Configure o Appwrite" : "Nenhum empréstimo"}
                message={
                  setupError
                    ? "Execute o script de setup primeiro."
                    : "Crie um contrato para começar a cobrar."
                }
              />
            ) : (
              <View style={styles.list}>
                {filtered.map((item) => (
                  <LoanListItem
                    key={item.$id}
                    loan={item}
                    installments={instByLoan(item.$id)}
                    customerPhone={phoneByCustomer.get(item.customerId)}
                    onPress={() => setPayLoan(item)}
                    onPay={() => setPayLoan(item)}
                  />
                ))}
              </View>
            )}

            {filtered.length === 0 && !setupError ? (
              <PrimaryButton
                label="Criar primeiro empréstimo"
                onPress={() => setFormOpen(true)}
              />
            ) : null}
          </ScreenScrollView>
        )}
      </ScreenShell>

      <LoanFormModal
        visible={formOpen || Boolean(editLoan)}
        loan={editLoan}
        installments={editLoan ? instByLoan(editLoan.$id) : []}
        customers={customers ?? []}
        onClose={() => {
          setFormOpen(false);
          setEditLoan(null);
        }}
        onSubmit={async (input) => {
          if (editLoan) {
            await update.mutateAsync({ loan: editLoan, input });
            setEditLoan(null);
            return;
          }
          const result = await create.mutateAsync(input);
          const customer =
            customers?.find((c) => c.$id === input.customerId) ?? null;
          setCreatedLoan(result.loan);
          setCreatedCustomer(customer);
          setFormOpen(false);
        }}
      />

      <LoanCreatedModal
        visible={Boolean(createdLoan)}
        loan={createdLoan}
        customer={createdCustomer}
        settings={settings ?? null}
        onClose={() => {
          setCreatedLoan(null);
          setCreatedCustomer(null);
        }}
      />

      <LoanPaymentModal
        visible={Boolean(payLoan)}
        loan={payLoan}
        installments={payLoan ? instByLoan(payLoan.$id) : []}
        canDelete={canDeleteLoans}
        canEdit={canDeleteLoans}
        onClose={() => setPayLoan(null)}
        onEdit={() => {
          if (!payLoan) return;
          setEditLoan(payLoan);
          setPayLoan(null);
        }}
        onSubmit={async (input) => {
          if (!payLoan) return;
          const { loan: updated } = await pay.mutateAsync({
            loan: payLoan,
            input,
          });
          if (
            input.paymentType === "full_payoff" ||
            updated.status === "paid"
          ) {
            setStatusFilter("Quitado");
          }
        }}
        onDelete={
          payLoan
            ? async () => {
                await remove.mutateAsync(payLoan.$id);
                setPayLoan(null);
              }
            : undefined
        }
      />
    </>
  );
}

function MiniStat({
  icon,
  label,
  value,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.miniStat}>
      <Ionicons
        name={icon}
        size={16}
        color={danger ? colors.danger : "rgba(255,255,255,0.9)"}
      />
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, paddingBottom: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  list: { gap: spacing.sm },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroMain: { gap: 4 },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  heroValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: spacing.md,
  },
  miniStat: { flex: 1, gap: 2 },
  miniLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  miniValue: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  resultCount: {
    ...fontStyles.caption,
    color: colors.textMuted,
  },
  loader: { marginTop: spacing.lg },
  alert: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
