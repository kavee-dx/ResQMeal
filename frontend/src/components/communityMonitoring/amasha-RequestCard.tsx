import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "@/constants/theme";
import { EmergencyRequest } from "@/types/amasha-request";
import RequestStatusBadge from "./amasha-RequestStatusBadge";

function timeLeftLabel(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export default function RequestCard({ request }: { request: EmergencyRequest }) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const isOpen = request.status === "pending" || request.status === "accepted";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
      <View style={styles.headerRow}>
        <Text style={[Typography.labelStrong, { color: colors.text }]} numberOfLines={1}>
          {request.foodNeeded}
        </Text>
        <RequestStatusBadge status={request.status} urgency={request.urgency} />
      </View>

      <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
        {request.quantity}
      </Text>

      <View style={styles.footerRow}>
        <Text style={[Typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {request.requesterName}
          {request.location ? ` · ${request.location}` : ""}
        </Text>
        {isOpen && (
          <Text
            style={[
              Typography.caption,
              { color: request.urgency === "urgent" ? colors.error : colors.textMuted, fontWeight: "600" },
            ]}
          >
            {timeLeftLabel(request.expiresAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.two },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.two },
});