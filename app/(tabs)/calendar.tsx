import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollectionInstallmentRow } from "@/components/CollectionInstallmentRow";
import { ScreenShell } from "@/components/ScreenShell";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { FilterChips } from "@/components/ui/FilterChips";
import {
  useScopedData,
  scopedCustomerPhoneMap,
  scopedCustomerRouteMap,
} from "@/hooks/useScopedData";
import { useSettings } from "@/hooks/useSettings";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/StatCard";
import { formatBRL } from "@/utils/currency";
import { buildDueTodayList } from "@/utils/due-today-list";
import { buildOverdueList } from "@/utils/overdue-list";
import { buildCollectionMessage } from "@/utils/whatsapp";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

type AgendaView = "calendar" | "today" | "overdue";

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function buildCalendarGrid(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  return cells;
}

const STATUS_DOT: Record<string, string> = {
  pending: colors.primary,
  partial: colors.warning,
  paid: colors.success,
  overdue: colors.danger,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
};

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const { customers, installments, loans, routes } = useScopedData();
  const [view, setView] = useState<AgendaView>("calendar");

  useEffect(() => {
    if (
      params.view === "today" ||
      params.view === "overdue" ||
      params.view === "calendar"
    ) {
      setView(params.view);
    }
  }, [params.view]);
  const [monthKey, setMonthKey] = useState(formatMonthKey(new Date()));
  const [selectedDay, setSelectedDay] = useState<number | null>(
    new Date().getDate(),
  );

  const byDate = useMemo(() => {
    const map = new Map<string, typeof installments>();
    for (const inst of installments ?? []) {
      const list = map.get(inst.dueDate) ?? [];
      list.push(inst);
      map.set(inst.dueDate, list);
    }
    return map;
  }, [installments]);

  const grid = buildCalendarGrid(monthKey);
  const [y, m] = monthKey.split("-").map(Number);

  const selectedIso =
    selectedDay != null
      ? `${y}-${String(m).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
      : null;

  const dayItems = selectedIso ? (byDate.get(selectedIso) ?? []) : [];

  const monthTotal = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const inst of installments ?? []) {
      if (inst.dueDate.startsWith(monthKey) && inst.status !== "paid") {
        count++;
        amount += inst.scheduledAmount - inst.paidAmount;
      }
    }
    return { count, amount };
  }, [installments, monthKey]);

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(formatMonthKey(d));
    setSelectedDay(1);
  };

  const loanName = (loanId: string) =>
    loans?.find((l) => l.$id === loanId)?.customerName ?? "—";

  const overdueList = useMemo(() => {
    if (!customers || !loans || !installments) return [];
    const routeNames = new Map((routes ?? []).map((r) => [r.$id, r.name]));
    return buildOverdueList(
      installments,
      loans,
      scopedCustomerRouteMap(customers),
      routeNames,
      scopedCustomerPhoneMap(customers),
    );
  }, [customers, loans, installments, routes]);

  const dueTodayList = useMemo(() => {
    if (!customers || !loans || !installments) return [];
    const routeNames = new Map((routes ?? []).map((r) => [r.$id, r.name]));
    return buildDueTodayList(
      installments,
      loans,
      scopedCustomerPhoneMap(customers),
      scopedCustomerRouteMap(customers),
      routeNames,
    );
  }, [customers, loans, installments, routes]);

  const { data: settings } = useSettings();

  const chipOptions = [
    { value: "calendar" as const, label: "Calendário" },
    { value: "today" as const, label: `Hoje (${dueTodayList.length})` },
    { value: "overdue" as const, label: `Vencidos (${overdueList.length})` },
  ];

  return (
    <ScreenShell
      title="Agenda"
      style={styles.shell}
      subtitle={
        view === "overdue"
          ? `${overdueList.length} vencido(s)`
          : view === "today"
            ? `${dueTodayList.length} vence(m) hoje`
            : `${monthTotal.count} vencimentos · ${formatBRL(monthTotal.amount)}`
      }
    >
      {view === "overdue" ? (
        <ScreenScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.overdueScroll}
        >
          <FilterChips
            options={chipOptions}
            value={view}
            onChange={(v) => setView(v as AgendaView)}
          />
          {overdueList.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Nenhum vencido"
              message="Não há parcelas em atraso no seu escopo."
            />
          ) : (
            <View style={styles.list}>
              {overdueList.map((item) => (
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
                  whatsappMessage={buildCollectionMessage(
                    settings ?? null,
                    {
                      nome: item.customerName,
                      valor: formatBRL(item.amountDue),
                      data: item.dueDate.split("-").reverse().join("/"),
                    },
                    "overdue",
                  )}
                  onPress={() => router.push("/(tabs)/loans")}
                />
              ))}
            </View>
          )}
          {overdueList.length > 0 ? (
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/(tabs)/loans")}
            >
              Registrar pagamento em Empréstimos →
            </Text>
          ) : null}
        </ScreenScrollView>
      ) : view === "today" ? (
        <ScreenScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.overdueScroll}
        >
          <FilterChips
            options={chipOptions}
            value={view}
            onChange={(v) => setView(v as AgendaView)}
          />
          {dueTodayList.length === 0 ? (
            <EmptyState
              icon="today-outline"
              title="Nada vence hoje"
              message="Não há parcelas com vencimento hoje."
            />
          ) : (
            <View style={styles.list}>
              {dueTodayList.map((item) => (
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
                  whatsappMessage={buildCollectionMessage(
                    settings ?? null,
                    {
                      nome: item.customerName,
                      valor: formatBRL(item.amountDue),
                      data: item.dueDate.split("-").reverse().join("/"),
                    },
                    "due_today",
                  )}
                  onPress={() => router.push("/(tabs)/loans")}
                />
              ))}
            </View>
          )}
        </ScreenScrollView>
      ) : (
        <ScreenScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.calendarScroll}
        >
          <FilterChips
            options={chipOptions}
            value={view}
            onChange={(v) => setView(v as AgendaView)}
          />
      <SectionCard>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={fontStyles.titleM}>{monthLabel(monthKey)}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
            <Text key={w} style={styles.weekHead}>
              {w}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((day, i) => {
            if (day == null) {
              return <View key={`pad-${i}`} style={styles.cell} />;
            }
            const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const items = byDate.get(iso) ?? [];
            const hasOverdue = items.some((x) => x.status === "overdue");
            const allPaid =
              items.length > 0 && items.every((x) => x.status === "paid");
            const dotColor = hasOverdue
              ? STATUS_DOT.overdue
              : allPaid
                ? STATUS_DOT.paid
                : items.length
                  ? STATUS_DOT.pending
                  : undefined;

            return (
              <TouchableOpacity
                key={iso}
                style={[
                  styles.cell,
                  selectedDay === day && styles.cellSelected,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.cellDay,
                    selectedDay === day && styles.cellDaySelected,
                  ]}
                >
                  {day}
                </Text>
                {dotColor ? (
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <Text style={[fontStyles.titleS, styles.dayTitle]}>
        {selectedIso
          ? selectedIso.split("-").reverse().join("/")
          : "Selecione um dia"}
      </Text>

      {dayItems.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Sem vencimentos"
          message="Nenhuma parcela vence neste dia."
        />
      ) : (
        <View style={styles.list}>
          {dayItems.map((item) => (
            <View key={item.$id} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{loanName(item.loanId)}</Text>
                <Text style={styles.meta}>
                  Parcela #{item.installmentNumber}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>
                  {formatBRL(item.scheduledAmount - item.paidAmount)}
                </Text>
                <Text
                  style={[
                    styles.status,
                    { color: STATUS_DOT[item.status] ?? colors.textMuted },
                  ]}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
        </ScreenScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  overdueScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  calendarScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  weekRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekHead: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  cellSelected: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  cellDay: { fontSize: 14, color: colors.text },
  cellDaySelected: { fontWeight: "700", color: colors.primaryDark },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  dayTitle: { marginTop: spacing.md, marginBottom: spacing.sm },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadow.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: colors.dangerLight },
  footerLink: {
    ...fontStyles.bodyM,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "600",
  },
  name: { fontWeight: "600", fontSize: 15 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontWeight: "700", fontSize: 15 },
  status: { fontSize: 12, fontWeight: "600" },
});
