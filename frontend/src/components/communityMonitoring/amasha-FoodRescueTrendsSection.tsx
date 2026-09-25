import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "@/constants/theme";
import { Donation } from "@/types/amasha-donation";
import { EmergencyRequest } from "@/types/amasha-request";
import {
  getDonationsTrend,
  getFulfilledTrend,
  getFulfillmentRate,
  getAvgTimeToFulfillmentHours,
} from "@/utils/amasha-trendMetrics";
import TrendLineChart from "./amasha-TrendLineChart";
import api from "@/services/api";

export default function FoodRescueTrendsSection() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [donations, setDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      setError(false);
      const [donationsRes, requestsRes] = await Promise.all([
        api.get("/ngo/donations"),
        api.get("/ngo/emergency-requests"),
      ]);
      setDonations(donationsRes.data);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error("Failed to load food rescue trend data", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.two }]}>
          Couldn't load trend data.
        </Text>
        <Text style={[Typography.bodySmall, { color: colors.primary }]} onPress={load}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const donationsTrend = getDonationsTrend(donations, 7);
  const fulfilledTrend = getFulfilledTrend(requests, 7);
  const fulfillmentRate = getFulfillmentRate(requests);
  const avgHours = getAvgTimeToFulfillmentHours(requests);

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Food Rescue Trends
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
        <Text style={[Typography.labelStrong, { color: colors.text, marginBottom: Spacing.two }]}>
          Donations — Last 7 Days
        </Text>
        <TrendLineChart data={donationsTrend} color={colors.success} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
        <Text style={[Typography.labelStrong, { color: colors.text, marginBottom: Spacing.two }]}>
          Requests Fulfilled — Last 7 Days
        </Text>
        <TrendLineChart data={fulfilledTrend} color={colors.info} />
      </View>

      <View style={styles.statRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
          <Text style={[Typography.h2, { color: colors.text }]}>{fulfillmentRate}%</Text>
          <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
            Fulfillment Rate
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
          <Text style={[Typography.h2, { color: colors.text }]}>
            {avgHours !== null ? `${avgHours}h` : "—"}
          </Text>
          <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
            Avg. Time to Fulfillment
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
});