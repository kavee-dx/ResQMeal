import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { EmergencyRequest } from "@/types/amasha-request";
import RequestCard from "./amasha-RequestCard";
import RequestFilterTabs, { RequestFilterValue } from "./amasha-RequestFilterTabs";
import api from "@/services/api";

const URGENCY_RANK = { urgent: 0, soon: 1, fresh: 2 };

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

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Request Status Monitoring
      </Text>

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