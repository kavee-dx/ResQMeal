import React, { useEffect, useState } from "react";
import { ScrollView, useColorScheme } from "react-native";
import CommunityStatsSection from "@/components/communityMonitoring/amasha-CommunityStatsSection";
import DonationStatusSection from "@/components/communityMonitoring/amasha-DonationStatusSection";
import RequestStatusSection from "@/components/communityMonitoring/amasha-RequestStatusSection";
import { Colors, Spacing } from "@/constants/theme";
import api from "@/services/api";

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
      <CommunityStatsSection stats={stats} loading={loading} />
      <RequestStatusSection />
      <DonationStatusSection />
    </ScrollView>
  );
}