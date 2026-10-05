// frontend/src/components/dilshara-RecipientCriteriaTabs.tsx
import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, Typography } from "@/constants/theme";
import type { SuggestionCriteria } from "../services/dilshara-recipientSuggestionService";

const TABS: { key: SuggestionCriteria; label: string }[] = [
  { key: "smart", label: "Smart Match" },
  { key: "location", label: "Location" },
  { key: "urgency", label: "Urgency" },
  { key: "food", label: "Food Need" },
  { key: "quantity", label: "Quantity" },
  { key: "people", label: "People" },
];

type Props = {
  selected: SuggestionCriteria;
  onSelect: (criteria: SuggestionCriteria) => void;
};

export default function RecipientCriteriaTabs({ selected, onSelect }: Props) {
  return (
    // The wrapper has a fixed height, so the tabs can never stretch vertically.
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {TABS.map((tab) => {
          const active = tab.key === selected;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              activeOpacity={0.8}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 56,
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: "center",
  },
  tab: {
    height: 38,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  label: {
    ...Typography.label,
    color: Colors.light.textSecondary,
  },
  labelActive: {
    color: Colors.light.textOnPrimary,
  },
});