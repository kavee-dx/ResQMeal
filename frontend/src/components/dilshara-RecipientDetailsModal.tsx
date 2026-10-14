// frontend/src/components/dilshara-RecipientDetailsModal.tsx
import React from "react";
import { ActivityIndicator, Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, Radius, Typography } from "@/constants/theme";
import type { RecipientSuggestion } from "../services/dilshara-recipientSuggestionService";
import { formatExpiresIn } from "./dilshara-RecipientSuggestionCard";

type Props = {
  item: RecipientSuggestion | null;
  onClose: () => void;
  onSuggest: (item: RecipientSuggestion) => void;
  // True while the selection is being confirmed with the server, so the sheet
  // cannot be dismissed or double-submitted mid-request.
  busy?: boolean;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function RecipientDetailsModal({ item, onClose, onSuggest, busy = false }: Props) {
  return (
    <Modal visible={!!item} animationType="slide" transparent onRequestClose={busy ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {item ? (
            <>
              <ScrollView contentContainerStyle={{ paddingBottom: Spacing.three }}>
                <Text style={styles.title}>{item.displayName}</Text>
                <Text style={styles.reason}>{item.matchReason}</Text>

                <Row label="Recipient type" value={item.recipientType ? pretty(item.recipientType) : null} />
                <Row label="Food needed" value={item.foodType} />
                <Row label="Quantity" value={item.quantity} />
                <Row label="Quantity note" value={item.quantityNote} />
                <Row label="Location" value={item.location} />
                <Row label="People needing food" value={item.peopleNeedingFood ? String(item.peopleNeedingFood) : null} />
                <Row label="Urgency" value={`${item.urgency} (${item.priority} priority)`} />
                <Row label="Food requirements" value={item.foodRequirements.map(pretty).join(", ")} />
                <Row label="Special requirements" value={item.specialRequirements} />
                <Row label="Extra details" value={item.details} />
                <Row
                  label="Preferred time"
                  value={item.preferredAt ? new Date(item.preferredAt).toLocaleString() : "As soon as possible"}
                />
                <Row label="Expiry" value={formatExpiresIn(item.expiresAt)} />
              </ScrollView>

              <TouchableOpacity
                style={[styles.primary, busy && styles.primaryBusy]}
                onPress={() => onSuggest(item)}
                disabled={busy}
                accessibilityState={{ busy, disabled: busy }}
              >
                {busy ? (
                  <ActivityIndicator color={Colors.light.textOnSecondary} />
                ) : (
                  <Text style={styles.primaryText}>Select Recipient</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={onClose} disabled={busy}>
                <Text style={[styles.secondaryText, busy && styles.secondaryTextBusy]}>Close</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.four,
    maxHeight: "85%",
  },
  title: { ...Typography.h2, color: Colors.light.text },
  reason: { ...Typography.bodySmall, color: Colors.light.success, marginBottom: Spacing.three },
  row: { marginBottom: Spacing.three },
  label: { ...Typography.caption, color: Colors.light.textMuted },
  value: { ...Typography.body, color: Colors.light.text },
  primary: {
    height: 52, borderRadius: Radius.md, backgroundColor: Colors.light.secondary,
    alignItems: "center", justifyContent: "center",
  },
  primaryBusy: { opacity: 0.7 },
  primaryText: { ...Typography.button, color: Colors.light.textOnSecondary },
  secondary: { height: 44, alignItems: "center", justifyContent: "center", marginTop: Spacing.two },
  secondaryText: { ...Typography.button, color: Colors.light.textSecondary },
  secondaryTextBusy: { opacity: 0.5 },
});