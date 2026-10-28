import { LineChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View } from "react-native";
import { useContentWidth } from "@/hooks/useBreakpoint";
import { colors, spacing } from "@/styles/theme";
import { fontStyles, fonts } from "@/styles/font";
import { formatBRL } from "@/utils/currency";
import { ChartCard } from "@/components/charts/ChartCard";

type SparkLineProps = {
  title: string;
  subtitle?: string;
  data: number[];
  labels?: string[];
  color?: string;
};

export function SparkLine({
  title,
  subtitle,
  data,
  labels,
  color = colors.primary,
}: SparkLineProps) {
  const contentWidth = useContentWidth(spacing.md * 4);
  const plotWidth = Math.max(200, contentWidth - spacing.md * 2 - 44);
  const last = data[data.length - 1] ?? 0;
  const max = Math.max(...data, 0);
  const allZero = data.every((v) => v === 0);
  const peak = Math.max(...data, 0);
  const peakIdx = data.indexOf(peak);

  const chartData = data.map((v, i) => ({
    value: v,
    label: labels?.[i] ?? "",
    dataPointText: v > 0 ? formatBRL(v).replace("R$", "").trim() : "",
  }));

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={
        <View style={styles.headerRight}>
          <Text style={styles.headerLabel}>Último mês</Text>
          <Text style={styles.headerValue}>{formatBRL(last)}</Text>
        </View>
      }
    >
      {allZero ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhum recebimento</Text>
          <Text style={styles.emptyMsg}>
            Os valores aparecerão aqui conforme parcelas forem pagas.
          </Text>
        </View>
      ) : (
        <View style={styles.chartClip}>
          <LineChart
            data={chartData}
            width={plotWidth}
            height={160}
            curved
            color={color}
            thickness={2.5}
            startFillColor={color}
            endFillColor={colors.surface}
            startOpacity={0.18}
            endOpacity={0.01}
            areaChart
            hideDataPoints={false}
            dataPointsColor={color}
            dataPointsRadius={5}
            textColor1={colors.textMuted}
            textFontSize={9}
            spacing={plotWidth / Math.max(data.length - 1, 1)}
            initialSpacing={12}
            endSpacing={12}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.borderLight}
            rulesColor={colors.borderLight}
            rulesType="solid"
            noOfSections={4}
            maxValue={max * 1.15 || 1}
            yAxisTextStyle={styles.axis}
            xAxisLabelTextStyle={styles.axis}
            adjustToWidth={false}
            isAnimated
            animationDuration={600}
            yAxisLabelWidth={44}
            formatYLabel={(v) => {
              const n = Number(v);
              if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
              if (n === 0) return "0";
              return n >= 100 ? `${Math.round(n)}` : n.toFixed(0);
            }}
          />
          {peak > 0 ? (
            <Text style={styles.peakNote}>
              Pico: {formatBRL(peak)}
              {labels?.[peakIdx] ? ` em ${labels[peakIdx]}` : ""}
            </Text>
          ) : null}
        </View>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartClip: {
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  headerRight: { alignItems: "flex-end" },
  headerLabel: { ...fontStyles.caption, fontSize: 11 },
  headerValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  axis: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  empty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyTitle: {
    ...fontStyles.bodyMBold,
    fontSize: 15,
  },
  emptyMsg: {
    ...fontStyles.bodyM,
    textAlign: "center",
    maxWidth: 280,
  },
  peakNote: {
    ...fontStyles.caption,
    marginTop: spacing.sm,
    textAlign: "right",
  },
});
