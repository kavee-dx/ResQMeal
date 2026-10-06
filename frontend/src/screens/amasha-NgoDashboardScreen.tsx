import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CommunityStatsSection from "@/components/communityMonitoring/amasha-CommunityStatsSection";
import DonationStatusSection from "@/components/communityMonitoring/amasha-DonationStatusSection";
import RequestStatusSection from "@/components/communityMonitoring/amasha-RequestStatusSection";
import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import api from "@/services/api";
import FoodRescueTrendsSection from "@/components/communityMonitoring/amasha-FoodRescueTrendsSection";
import { RootStackParamList } from "@/navigation/types";

interface CommunityStats {
  activeCampaigns: number;
  emergencyRequests: number;
  activeVolunteers: number;
  activeDonors: number;
  expiringSoon: number;
}

export default function NgoDashboardScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get("/ngo/community-stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load community stats", err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Spacing.six }}
    >
      <Pressable
        style={[styles.mapButton, { backgroundColor: colors.primary }, Shadows.button]}
        onPress={() => navigation.navigate("FoodRescueMap")}
      >
        <Text style={[Typography.button, { color: colors.textOnPrimary }]}>
          Food Rescue Map
        </Text>
        <Text style={[Typography.bodySmall, { color: colors.textOnPrimary }]}>
          View donors, available food, recipients and NGOs nearby
        </Text>
      </Pressable>
      <CommunityStatsSection stats={stats} loading={loading} />
      <RequestStatusSection />
      <DonationStatusSection />
      <FoodRescueTrendsSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapButton: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: 2,
    alignItems: "center",
  },
});