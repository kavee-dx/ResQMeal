import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "@/constants/theme";
import { TrendPoint, TrendSeries } from "@/types/amasha-chart";
import MultiSeriesTrendChart from "./amasha-MultiSeriesTrendChart";
import TrendBarChart from "./amasha-TrendBarChart";
import api from "@/services/api";

interface RawTrendPoint {
  date: string;
  count: number;
}

interface TrendSummary {
  fulfillmentRate: number;
  avgTimeToFulfillmentHours: number | null;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short" });
}

function toChartPoints(raw: RawTrendPoint[]): TrendPoint[] {
  return raw.map((p) => ({ label: dayLabel(p.date), count: p.count }));
}

export default function FoodRescueTrendsSection() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [donationsTrend, setDonationsTrend] = useState<TrendPoint[]>([]);
  const [fulfilledTrend, setFulfilledTrend] = useState<TrendPoint[]>([]);
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    try {
      setError(false);
      const [donationsRes, fulfilledRes, summaryRes] = await Promise.all([
        api.get("/ngo/trends/donations?days=7"),
        api.get("/ngo/trends/fulfilled?days=7"),
        api.get("/ngo/trends/summary"),
      ]);
      setDonationsTrend(toChartPoints(donationsRes.data));
      setFulfilledTrend(toChartPoints(fulfilledRes.data));
      setSummary(summaryRes.data);
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

  if (error || !summary) {
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

  const combinedSeries: TrendSeries[] = [
    { name: "Donations", color: colors.success, data: donationsTrend },
    { name: "Fulfilled", color: colors.info, data: fulfilledTrend },
  ];

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Food Rescue Trends
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
        <Text style={[Typography.labelStrong, { color: colors.text, marginBottom: Spacing.two }]}>
          Donations vs. Fulfilled — Last 7 Days
        </Text>
        <MultiSeriesTrendChart series={combinedSeries} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
        <Text style={[Typography.labelStrong, { color: colors.text, marginBottom: Spacing.two }]}>
          Donations by Day (This Week)
        </Text>
        <TrendBarChart data={donationsTrend} color={colors.success} />
      </View>

      <View style={styles.statRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
          <Text style={[Typography.h2, { color: colors.text }]}>{summary.fulfillmentRate}%</Text>
          <Text style={[Typography.bodySmall, { color: colors.textSecondary, marginTop: Spacing.half }]}>
            Fulfillment Rate
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.card]}>
          <Text style={[Typography.h2, { color: colors.text }]}>
            {summary.avgTimeToFulfillmentHours !== null ? `${summary.avgTimeToFulfillmentHours}h` : "—"}
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
  card: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.three },
  statRow: { flexDirection: "row", gap: Spacing.two },
  statCard: { flex: 1, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center" },
});