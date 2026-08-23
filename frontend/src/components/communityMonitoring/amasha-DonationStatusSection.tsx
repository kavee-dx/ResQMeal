import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { Donation } from "@/types/amasha-donation";
import DonationCard from "./amasha-DonationCard";
import DonationFilterTabs, { FilterValue } from "./amasha-DonationFilterTabs";
import api from "@/services/api";

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

  return (
    <View style={styles.section}>
      <Text style={[Typography.h3, { color: colors.text, marginBottom: Spacing.three }]}>
        Donation Status Monitoring
      </Text>

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
  section: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
  },
});