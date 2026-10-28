import { PieChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles, fonts } from "@/styles/font";
import { formatBRL } from "@/utils/currency";
import { ChartCard } from "@/components/charts/ChartCard";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
};

export function DonutChart({ title, subtitle, segments }: DonutChartProps) {
  const { width } = useWindowDimensions();
  const compact = width < 400;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const hasData = total > 0;

  const pieData = hasData
    ? segments
        .filter((s) => s.value > 0)
        .map((seg) => ({
          value: seg.value,
          color: seg.color,
          gradientCenterColor: seg.color,
          focused: true,
        }))
    : [{ value: 1, color: colors.borderLight }];

  const radius = compact ? 72 : 88;
  const dominant = hasData
    ? segments.reduce((a, b) => (b.value > a.value ? b : a))
    : null;

  return (
    <ChartCard title={title} subtitle={subtitle} style={styles.card}>
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={styles.chartWrap}>
          <PieChart
            data={pieData}
            donut
            radius={radius}
            innerRadius={radius * 0.68}
            innerCircleColor={colors.surface}
            innerCircleBorderWidth={2}
            innerCircleBorderColor={colors.borderLight}
            showText={false}
            focusOnPress={false}
            strokeWidth={0}
            centerLabelComponent={() => (
              <View style={styles.center}>
                {hasData && dominant ? (
                  <>
                    <Text style={styles.centerPct}>
                      {Math.round((dominant.value / total) * 100)}%
                    </Text>
                    <Text style={styles.centerLbl} numberOfLines={2}>
                      {dominant.label}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.centerLbl}>Sem dados</Text>
                )}
              </View>
            )}
          />
        </View>

        <View style={styles.legend}>
          {segments.map((seg) => {
            const pct = hasData
              ? Math.round((seg.value / total) * 100)
              : 0;
            return (
              <View key={seg.label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: seg.color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>{seg.label}</Text>
                  <Text style={styles.legendValue}>
                    {formatBRL(seg.value)} · {pct}%
                  </Text>
                </View>
                <View style={styles.legendBarTrack}>
                  <View
                    style={[
                      styles.legendBarFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: seg.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={fontStyles.caption}>Total contratado</Text>
            <Text style={fontStyles.bodyMBold}>{formatBRL(total)}</Text>
          </View>
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, maxWidth: "100%" },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    minWidth: 0,
  },
  bodyCompact: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 180,
  },
  center: { alignItems: "center", paddingHorizontal: 8, maxWidth: 100 },
  centerPct: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 26,
  },
  centerLbl: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    fontFamily: fonts.medium,
  },
  legend: { flex: 1, gap: spacing.md, minWidth: 160 },
  legendRow: { gap: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  legendText: { gap: 1 },
  legendLabel: {
    ...fontStyles.bodyMBold,
    fontSize: 13,
  },
  legendValue: {
    ...fontStyles.caption,
    fontSize: 12,
  },
  legendBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    overflow: "hidden",
    marginTop: 4,
  },
  legendBarFill: {
    height: "100%",
    borderRadius: radius.pill,
    minWidth: 0,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
});
