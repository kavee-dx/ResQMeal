import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { RequestStatus, RequestUrgency } from "@/types/amasha-request";

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  fulfilled: "Fulfilled",
  expired: "Expired",
};

const URGENCY_LABELS: Record<RequestUrgency, string> = {
  fresh: "Fresh",
  soon: "Going soon",
  urgent: "Urgent",
};

function getBadgeColors(
  status: RequestStatus,
  urgency: RequestUrgency,
  colors: typeof Colors.light | typeof Colors.dark
) {
  if (status === "fulfilled") return { fg: colors.success, bg: colors.successSoft, label: STATUS_LABELS.fulfilled };
  if (status === "expired") return { fg: colors.error, bg: colors.errorSoft, label: STATUS_LABELS.expired };
  if (status === "accepted") return { fg: colors.info, bg: colors.infoSoft, label: STATUS_LABELS.accepted };

  switch (urgency) {
    case "urgent":
      return { fg: colors.error, bg: colors.errorSoft, label: URGENCY_LABELS.urgent };
    case "soon":
      return { fg: colors.warning, bg: colors.warningSoft, label: URGENCY_LABELS.soon };
    case "fresh":
      return { fg: colors.textSecondary, bg: colors.backgroundElement, label: URGENCY_LABELS.fresh };
  }
}

interface Props {
  status: RequestStatus;
  urgency: RequestUrgency;
}

export default function RequestStatusBadge({ status, urgency }: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { fg, bg, label } = getBadgeColors(status, urgency, colors);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[Typography.caption, { color: fg, fontWeight: "600" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
});