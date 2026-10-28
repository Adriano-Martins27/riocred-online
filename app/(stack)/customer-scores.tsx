import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionCard } from "@/components/ui/StatCard";
import { useScopedData } from "@/hooks/useScopedData";
import {
  calculateAllScores,
  type ScoreBand,
  type CustomerScoreResult,
} from "@/utils/customer-score";
import { formatBRL } from "@/utils/currency";
import { fontStyles, fonts } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

const BAND_COLORS: Record<ScoreBand, string> = {
  Excelente: colors.success,
  Bom: colors.primary,
  Atenção: colors.warning,
  "Alto Risco": colors.danger,
};

const BAND_BG: Record<ScoreBand, string> = {
  Excelente: colors.successLight,
  Bom: colors.primaryLight,
  Atenção: colors.warningLight,
  "Alto Risco": colors.dangerLight,
};

const BANDS: ScoreBand[] = ["Excelente", "Bom", "Atenção", "Alto Risco"];

export default function CustomerScoresScreen() {
  const { customers, loans, installments, payments } = useScopedData();
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<ScoreBand | "">("");

  const scores = useMemo(() => {
    if (!customers || !loans || !installments || !payments) return [];
    return calculateAllScores(customers, loans, installments, payments);
  }, [customers, loans, installments, payments]);

  const filtered = scores.filter((s) => {
    if (bandFilter && s.band !== bandFilter) return false;
    if (!search.trim()) return true;
    return s.customer.fullName.toLowerCase().includes(search.toLowerCase());
  });

  const bandCounts = useMemo(() => {
    const map = new Map<ScoreBand | "all", number>();
    map.set("all", scores.length);
    for (const b of BANDS) {
      map.set(b, scores.filter((s) => s.band === b).length);
    }
    return map;
  }, [scores]);

  return (
    <ScreenShell
      title="Score de Clientes"
      subtitle="Classificação de risco da carteira"
      style={styles.shell}
    >
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        <SectionCard>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar cliente…"
          />
          <FilterChips
            options={[
              { value: "" as const, label: `Todas (${bandCounts.get("all")})` },
              ...BANDS.map((b) => ({
                value: b,
                label: `${b} (${bandCounts.get(b)})`,
                color: BAND_COLORS[b],
              })),
            ]}
            value={bandFilter}
            onChange={setBandFilter}
            scrollable
          />
        </SectionCard>

        {filtered.length > 0 ? (
          <Text style={styles.resultCount}>
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
          </Text>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            icon="analytics-outline"
            title="Sem dados de score"
            message="Cadastre clientes e empréstimos para calcular."
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <ScoreCard key={item.customer.$id} item={item} />
            ))}
          </View>
        )}
      </ScreenScrollView>
    </ScreenShell>
  );
}

function ScoreCard({ item }: { item: CustomerScoreResult }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.customer.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {item.customer.fullName}
          </Text>
          <View
            style={[styles.bandPill, { backgroundColor: BAND_BG[item.band] }]}
          >
            <Text style={[styles.bandText, { color: BAND_COLORS[item.band] }]}>
              {item.band}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.scoreCircle,
            {
              borderColor: BAND_COLORS[item.band],
              backgroundColor: BAND_BG[item.band],
            },
          ]}
        >
          <Text style={[styles.score, { color: BAND_COLORS[item.band] }]}>
            {item.score}
          </Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric label="Contratos" value={String(item.totalLoans)} />
        <Metric label="Pagas" value={String(item.paidInstallments)} />
        <Metric label="Em aberto" value={formatBRL(item.openBalance)} />
      </View>
      {item.overdueInstallments > 0 ? (
        <Text style={styles.overdue}>
          {item.overdueInstallments} vencida(s) · máx {item.maxDaysLate} dias de
          atraso
        </Text>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  list: { gap: spacing.sm },
  resultCount: {
    ...fontStyles.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadow.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  body: { flex: 1, gap: 4 },
  name: { ...fontStyles.bodyMBold, fontSize: 15 },
  bandPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  bandText: { fontSize: 11, fontFamily: fonts.semiBold, fontWeight: "600" },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { fontSize: 18, fontFamily: fonts.bold, fontWeight: "700" },
  metrics: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: "uppercase",
    fontFamily: fonts.medium,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
    color: colors.text,
  },
  overdue: {
    color: colors.danger,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    fontWeight: "600",
  },
});
