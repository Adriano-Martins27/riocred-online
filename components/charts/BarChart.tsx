import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles, fonts } from "@/styles/font";
import { ChartCard } from "@/components/charts/ChartCard";

export type BarItem = {
  label: string;
  value: number;
  color: string;
};

type BarChartProps = {
  title: string;
  subtitle?: string;
  items: BarItem[];
};

export function BarChart({ title, subtitle, items }: BarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <ChartCard title={title} subtitle={subtitle} style={styles.card}>
      <View style={styles.rows}>
        {items.map((item) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <View key={item.label} style={styles.row}>
              <View style={styles.rowHead}>
                <View style={styles.labelWrap}>
                  <View
                    style={[styles.swatch, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.label}>{item.label}</Text>
                </View>
                <Text style={styles.value}>{item.value}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(pct, item.value > 0 ? 8 : 0)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.footer}>
        {total} parcela{total !== 1 ? "s" : ""} no total
      </Text>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, maxWidth: "100%" },
  rows: { gap: spacing.md },
  row: { gap: spacing.xs },
  rowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  label: {
    ...fontStyles.bodyMBold,
    fontSize: 13,
  },
  value: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.text,
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    minWidth: 0,
  },
  footer: {
    ...fontStyles.caption,
    marginTop: spacing.sm,
    textAlign: "right",
  },
});
