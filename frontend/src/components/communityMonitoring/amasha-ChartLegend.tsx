import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Spacing, Typography } from "@/constants/theme";
import { TrendSeries } from "@/types/amasha-chart";

export default function ChartLegend({ series }: { series: TrendSeries[] }) {
  return (
    <View style={styles.row}>
      {series.map((s) => (
        <View key={s.name} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: s.color }]} />
          <Text style={Typography.caption}>{s.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.three, marginTop: Spacing.two },
  item: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
});