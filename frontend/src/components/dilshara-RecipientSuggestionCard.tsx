// frontend/src/components/dilshara-RecipientSuggestionCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, Typography, Shadows } from "@/constants/theme";
import type { RecipientSuggestion } from "../services/dilshara-recipientSuggestionService";

export function formatExpiresIn(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

type Props = {
  item: RecipientSuggestion;
  onViewDetails: (item: RecipientSuggestion) => void;
};

export default function RecipientSuggestionCard({ item, onViewDetails }: Props) {
  const urgent = item.urgency === "URGENT";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
        <View style={[styles.badge, urgent ? styles.badgeUrgent : styles.badgeNormal]}>
          <Text style={[styles.badgeText, urgent ? styles.badgeTextUrgent : styles.badgeTextNormal]}>
            {item.urgency}
          </Text>
        </View>
      </View>

      <Text style={styles.reason}>{item.matchReason}</Text>

      <Text style={styles.line}>📍 {item.location}</Text>
      <Text style={styles.line}>🍚 {item.foodType}</Text>
      <Text style={styles.line}>⚖️ {item.quantity}</Text>
      {item.quantityNote ? <Text style={styles.note}>{item.quantityNote}</Text> : null}
      {item.peopleNeedingFood ? <Text style={styles.line}>👥 {item.peopleNeedingFood} people</Text> : null}
      <Text style={styles.expiry}>⏱ {formatExpiresIn(item.expiresAt)}</Text>

      <TouchableOpacity style={styles.button} onPress={() => onViewDetails(item)}>
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.card,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { ...Typography.h3, color: Colors.light.text, flex: 1, marginRight: Spacing.two },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  badgeUrgent: { backgroundColor: Colors.light.errorSoft },
  badgeNormal: { backgroundColor: Colors.light.infoSoft },
  badgeText: { ...Typography.caption },
  badgeTextUrgent: { color: Colors.light.error },
  badgeTextNormal: { color: Colors.light.info },
  reason: { ...Typography.bodySmall, color: Colors.light.success, marginVertical: Spacing.one },
  line: { ...Typography.body, color: Colors.light.text },
  note: { ...Typography.bodySmall, color: Colors.light.warning, marginLeft: Spacing.four },
  expiry: { ...Typography.bodySmall, color: Colors.light.textSecondary, marginTop: Spacing.one },
  button: {
    marginTop: Spacing.three,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...Typography.buttonSmall, color: Colors.light.primary },
});