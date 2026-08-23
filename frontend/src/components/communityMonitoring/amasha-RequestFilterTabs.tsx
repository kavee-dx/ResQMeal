// components/communityMonitoring/amasha-RequestFilterTabs.tsx
import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { RequestStatus } from "@/types/amasha-request";

export type RequestFilterValue = RequestStatus | "all" | "urgent";

const FILTERS: { value: RequestFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "expired", label: "Expired" },
];

interface Props {
  active: RequestFilterValue;
  onChange: (value: RequestFilterValue) => void;
}

export default function RequestFilterTabs({ active, onChange }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((f) => {
        const isActive = f.value === active;
        const isUrgentPill = f.value === "urgent";
        return (
          <TouchableOpacity
            key={f.value}
            onPress={() => onChange(f.value)}
            style={[
              styles.pill,
              { backgroundColor: isActive ? (isUrgentPill ? colors.error : colors.primary) : colors.backgroundElement },
            ]}
          >
            <Text style={[Typography.label, { color: isActive ? colors.textOnPrimary : colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingBottom: Spacing.two },
  pill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
});