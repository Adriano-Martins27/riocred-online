import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { SparkLine } from "@/components/charts/SparkLine";
import { CollectionInstallmentRow } from "@/components/CollectionInstallmentRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/StatCard";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import { useAllProfiles } from "@/hooks/useAdmin";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useFinancialVisibility } from "@/hooks/useFinancialVisibility";
import {
  useScopedData,
  scopedCustomerPhoneMap,
  scopedCustomerRouteMap,
} from "@/hooks/useScopedData";
import { useSettings } from "@/hooks/useSettings";
import { formatBRL } from "@/utils/currency";
import { buildDueTodayList } from "@/utils/due-today-list";
import { buildOverdueList } from "@/utils/overdue-list";
import { buildPaymentsTrend } from "@/utils/payments-trend";
import { buildCollectionMessage } from "@/utils/whatsapp";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type HomeTab = "today" | "overdue";

export default function DashboardScreen() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { user, profile } = useAuth();
  const metrics = useDashboardMetrics();
  const { canViewFinancials } = useFinancialVisibility();
  const { customers, loans, installments, payments, routes } = useScopedData();
  const { data: settings } = useSettings();
  const { data: allProfiles } = useAllProfiles(profile?.role === "admin");
  const [tab, setTab] = useState<HomeTab>("today");

  const trend = useMemo(
    () => buildPaymentsTrend(payments ?? []),
    [payments],
  );

  const routeNames = useMemo(
    () => new Map((routes ?? []).map((r) => [r.$id, r.name])),
    [routes],
  );

  const dueToday = useMemo(() => {
    if (!customers || !loans || !installments) return [];
    return buildDueTodayList(
      installments,
      loans,
      scopedCustomerPhoneMap(customers),
      scopedCustomerRouteMap(customers),
      routeNames,
    );
  }, [customers, loans, installments, routeNames]);

  const overdue = useMemo(() => {
    if (!customers || !loans || !installments) return [];
    return buildOverdueList(
      installments,
      loans,
      scopedCustomerRouteMap(customers),
      routeNames,
      scopedCustomerPhoneMap(customers),
    );
  }, [customers, loans, installments, routeNames]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "operador";
  const activeList = tab === "today" ? dueToday : overdue;

  const collectionMessage = (
    item: { customerName: string; amountDue: number; dueDate: string },
    kind: "due_today" | "overdue",
  ) =>
    buildCollectionMessage(
      settings ?? null,
      {
        nome: item.customerName,
        valor: formatBRL(item.amountDue),
        data: item.dueDate.split("-").reverse().join("/"),
      },
      kind,
    );

  return (
    <ScreenShell
      title="Início"
      subtitle={`${greeting}, ${firstName}`}
      style={styles.shell}
      headerRight={
        isDesktop ? (
          <PrimaryButton
            label="Novo empréstimo"
            onPress={() => router.push("/(tabs)/loans")}
          />
        ) : undefined
      }
    >
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        {!isDesktop ? (
          <PrimaryButton
            label="Novo empréstimo"
            onPress={() => router.push("/(tabs)/loans")}
          />
        ) : null}

        <View style={styles.metricGrid}>
          <MetricCard
            label="Vence hoje"
            value={String(metrics?.dueTodayInstallments ?? dueToday.length)}
            icon="today"
            tone={
              (metrics?.dueTodayInstallments ?? dueToday.length) > 0
                ? "warning"
                : "default"
            }
            hint="toque para abrir a agenda"
            onPress={() => router.push("/(tabs)/calendar?view=today")}
          />
          <MetricCard
            label="Vencidos"
            value={String(metrics?.overdueInstallments ?? overdue.length)}
            icon="alert-circle"
            tone={
              (metrics?.overdueInstallments ?? 0) > 0 ? "danger" : "default"
            }
            hint="toque para ver a lista"
            onPress={() => router.push("/(stack)/overdue")}
          />
          <MetricCard
            label="Empréstimos"
            value={String(metrics?.totalLoans ?? 0)}
            icon="cash"
            tone="success"
            delta={metrics?.loansThisWeek ?? 0}
            onPress={() => router.push("/(tabs)/loans")}
          />
          <MetricCard
            label="Contratos"
            value={String(metrics?.activeContracts ?? 0)}
            icon="document-text"
            tone="accent"
            delta={metrics?.contractsThisWeek ?? 0}
            onPress={() => router.push("/(tabs)/loans")}
          />
          {canViewFinancials ? (
            <>
              <MetricCard
                label="Total a Receber"
                value={formatBRL(metrics?.totalToReceive ?? 0)}
                icon="trending-up"
                hint="incluindo multas e juros"
                onPress={() => router.push("/(stack)/loans-report")}
              />
              <MetricCard
                label="Recebido"
                value={formatBRL(metrics?.totalReceived ?? 0)}
                icon="wallet"
                tone="success"
                hint="total histórico"
                onPress={() => router.push("/(stack)/caixa")}
              />
              <MetricCard
                label="Capital na Rua"
                value={formatBRL(metrics?.capitalOut ?? 0)}
                icon="logo-usd"
                tone="warning"
                hint="principal emprestado"
                onPress={() => router.push("/(stack)/loans-report")}
              />
              <MetricCard
                label="Juros a Receber"
                value={formatBRL(metrics?.pendingInterest ?? 0)}
                icon="time"
                tone="accent"
                hint="juros pendentes"
                onPress={() => router.push("/(stack)/caixa")}
              />
            </>
          ) : null}
          <MetricCard
            label="Clientes"
            value={String(metrics?.totalCustomers ?? 0)}
            icon="people"
            tone="success"
            hint="cadastrados"
            onPress={() => router.push("/(tabs)/customers")}
          />
        </View>

        <SectionCard
          title="Cobrança do dia"
          subtitle="WhatsApp direto via wa.me"
        >
          <FilterChips
            options={[
              {
                value: "today" as const,
                label: `Vence hoje (${dueToday.length})`,
              },
              {
                value: "overdue" as const,
                label: `Vencidos (${overdue.length})`,
              },
            ]}
            value={tab}
            onChange={(v) => setTab(v as HomeTab)}
          />

          {activeList.length === 0 ? (
            <EmptyState
              icon={
                tab === "today"
                  ? "checkmark-circle-outline"
                  : "alert-circle-outline"
              }
              title={
                tab === "today"
                  ? "Nada vence hoje"
                  : "Nenhum vencido"
              }
              message={
                tab === "today"
                  ? "Não há parcelas com vencimento hoje no seu escopo."
                  : "Todas as parcelas estão em dia."
              }
            />
          ) : (
            <View style={styles.collectionList}>
              {tab === "today"
                ? dueToday.map((item) => (
                    <CollectionInstallmentRow
                      key={item.installmentId}
                      customerName={item.customerName}
                      customerPhone={item.customerPhone}
                      meta={`#${item.installmentNumber} · ${item.routeName}`}
                      amount={formatBRL(item.amountDue)}
                      amountColor={colors.warning}
                      icon="today"
                      iconColor={colors.warning}
                      iconBg={colors.warningLight}
                      whatsappMessage={collectionMessage(item, "due_today")}
                      onPress={() => router.push("/(tabs)/loans")}
                    />
                  ))
                : overdue.map((item) => (
                    <CollectionInstallmentRow
                      key={item.installmentId}
                      customerName={item.customerName}
                      customerPhone={item.customerPhone}
                      meta={`#${item.installmentNumber} · ${item.routeName} · ${item.daysLate}d atraso`}
                      amount={formatBRL(item.amountDue)}
                      amountColor={colors.danger}
                      icon="alert-circle"
                      iconColor={colors.danger}
                      iconBg={colors.dangerLight}
                      whatsappMessage={collectionMessage(item, "overdue")}
                      onPress={() => router.push("/(tabs)/loans")}
                    />
                  ))}
            </View>
          )}

          {activeList.length > 0 ? (
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(tabs)/loans")}
            >
              Registrar pagamento em Empréstimos →
            </Text>
          ) : null}
        </SectionCard>

        <SparkLine
          title="Evolução Financeira"
          subtitle="Últimos 6 meses"
          data={trend.data}
          labels={trend.labels}
        />

        <SectionCard title="Ações rápidas">
          <View style={styles.quickGrid}>
            {[
              {
                label: "Cliente",
                icon: "person-add" as const,
                href: "/(tabs)/customers",
              },
              {
                label: "Empréstimo",
                icon: "add-circle" as const,
                href: "/(tabs)/loans",
              },
              {
                label: "Vencidos",
                icon: "alert-circle" as const,
                href: "/(stack)/overdue",
              },
              {
                label: "Agenda",
                icon: "calendar" as const,
                href: "/(tabs)/calendar",
              },
              {
                label: "Caixa",
                icon: "cash" as const,
                href: "/(stack)/caixa",
              },
              {
                label: "Relatório",
                icon: "document-text" as const,
                href: "/(stack)/loans-report",
              },
            ].map((q) => (
              <QuickAction
                key={q.label}
                icon={q.icon}
                label={q.label}
                onPress={() => router.push(q.href as never)}
              />
            ))}
          </View>
        </SectionCard>

        {profile?.role === "admin" ? (
          <View style={styles.adminStrip}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={fontStyles.bodyM}>
              {allProfiles?.length ?? 0} usuários na plataforma
            </Text>
          </View>
        ) : null}
      </ScreenScrollView>
    </ScreenShell>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
  hint?: string;
  delta?: number;
  onPress?: () => void;
};

function MetricCard({ onPress, ...props }: MetricCardProps) {
  return <StatCard {...props} style={styles.metric} onPress={onPress} />;
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PrimaryButton label={label} variant="secondary" onPress={onPress} />
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: "100%",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minWidth: "47%",
    maxWidth: "100%",
  },
  collectionList: { gap: spacing.sm },
  footerLink: {
    ...fontStyles.bodyM,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  adminStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
