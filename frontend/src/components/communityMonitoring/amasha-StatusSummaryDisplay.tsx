import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Radius, Spacing, Typography } from "@/constants/theme";

export interface StatusSummaryItem {
  key: string;
  label: string;
  count: number;
  fg: string;
  bg: string;
}

interface Props {
  items: StatusSummaryItem[];
}

export default function StatusSummaryDisplay({ items }: Props) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.key} style={[styles.chip, { backgroundColor: item.bg }]}>
          <Text style={[Typography.labelStrong, { color: item.fg }]}>{item.count}</Text>
          <Text style={[Typography.caption, { color: item.fg, marginLeft: 4 }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});