import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { Donation, DonationStatus } from "@/types/amasha-donation";
import DonationCard from "./amasha-DonationCard";
import DonationFilterTabs, { FilterValue } from "./amasha-DonationFilterTabs";
import StatusSummaryDisplay, { StatusSummaryItem } from "./amasha-StatusSummaryDisplay";
import api from "@/services/api";

const STATUS_ORDER: DonationStatus[] = ["available", "pending", "accepted", "expired", "delivered"];
const STATUS_LABELS: Record<DonationStatus, string> = {
  available: "Available",
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  delivered: "Delivered",
};

export default function DonationStatusSection() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [error, setError] = useState(false);

  async function loadDonations() {
    try {
      setError(false);
      const res = await api.get("/ngo/donations");
      setDonations(res.data);
    } catch (err) {
      console.error("Failed to load donations", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDonations();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? donations : donations.filter((d) => d.status === filter)),
    [donations, filter]
  );

  const summaryItems: StatusSummaryItem[] = useMemo(() => {
    const counts: Record<DonationStatus, number> = {
      available: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
      delivered: 0,
    };
    donations.forEach((d) => {
      counts[d.status]++;
    });

    const colorFor = (status: DonationStatus) => {
      switch (status) {
        case "available":
          return { fg: colors.success, bg: colors.successSoft };
        case "pending":
          return { fg: colors.warning, bg: colors.warningSoft };
        case "expired":
          return { fg: colors.error, bg: colors.errorSoft };
        case "accepted":
          return { fg: colors.info, bg: colors.infoSoft };
        case "delivered":
          return { fg: colors.primary, bg: colors.backgroundElement };
      }
    };

    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status],
      ...colorFor(status),
    }));
  }, [donations, colors]);

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Donation Status Monitoring
      </Text>

      {!loading && !error && donations.length > 0 && <StatusSummaryDisplay items={summaryItems} />}

      <DonationFilterTabs active={filter} onChange={setFilter} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.two }]}>
            Couldn't load donations.
          </Text>
          <Text style={[Typography.bodySmall, { color: colors.primary }]} onPress={loadDonations}>
            Tap to retry
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[Typography.body, { color: colors.textMuted }]}>
            No donations in this category yet.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: Spacing.three }}>
          {filtered.map((item) => (
            <DonationCard key={item.id} donation={item} />
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