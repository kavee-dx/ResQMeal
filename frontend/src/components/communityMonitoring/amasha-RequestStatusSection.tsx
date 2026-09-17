import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { EmergencyRequest, RequestStatus } from "@/types/amasha-request";
import RequestCard from "./amasha-RequestCard";
import RequestFilterTabs, { RequestFilterValue } from "./amasha-RequestFilterTabs";
import StatusSummaryDisplay, { StatusSummaryItem } from "./amasha-StatusSummaryDisplay";
import api from "@/services/api";

const URGENCY_RANK = { urgent: 0, soon: 1, fresh: 2 };
const STATUS_ORDER: RequestStatus[] = ["pending", "accepted", "fulfilled", "expired"];
const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  fulfilled: "Fulfilled",
  expired: "Expired",
};

export default function RequestStatusSection() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestFilterValue>("all");
  const [error, setError] = useState(false);

  async function loadRequests() {
    try {
      setError(false);
      const res = await api.get("/ngo/emergency-requests");
      setRequests(res.data);
    } catch (err) {
      console.error("Failed to load emergency requests", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    let list = requests;
    if (filter === "urgent") {
      list = requests.filter((r) => r.urgency === "urgent" && (r.status === "pending" || r.status === "accepted"));
    } else if (filter !== "all") {
      list = requests.filter((r) => r.status === filter);
    }
    if (filter === "all") {
      list = [...list].sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
    }
    return list;
  }, [requests, filter]);

  const summaryItems: StatusSummaryItem[] = useMemo(() => {
    const counts: Record<RequestStatus, number> = { pending: 0, accepted: 0, fulfilled: 0, expired: 0 };
    let urgentCount = 0;
    requests.forEach((r) => {
      counts[r.status]++;
      if (r.urgency === "urgent" && (r.status === "pending" || r.status === "accepted")) urgentCount++;
    });

    const colorFor = (status: RequestStatus) => {
      switch (status) {
        case "pending":
          return { fg: colors.warning, bg: colors.warningSoft };
        case "accepted":
          return { fg: colors.info, bg: colors.infoSoft };
        case "fulfilled":
          return { fg: colors.success, bg: colors.successSoft };
        case "expired":
          return { fg: colors.error, bg: colors.errorSoft };
      }
    };

    const items: StatusSummaryItem[] = STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status],
      ...colorFor(status),
    }));

    // Urgent goes first — it's the number the coordinator needs to see fastest.
    items.unshift({ key: "urgent", label: "Urgent", count: urgentCount, fg: colors.error, bg: colors.errorSoft });
    return items;
  }, [requests, colors]);

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Request Status Monitoring
      </Text>

      {!loading && !error && requests.length > 0 && <StatusSummaryDisplay items={summaryItems} />}

      <RequestFilterTabs active={filter} onChange={setFilter} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.two }]}>
            Couldn't load requests.
          </Text>
          <Text style={[Typography.bodySmall, { color: colors.primary }]} onPress={loadRequests}>
            Tap to retry
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textMuted }]}>
            No requests in this category right now.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: Spacing.three }}>
          {filtered.map((item) => (
            <RequestCard key={item.id} request={item} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
});