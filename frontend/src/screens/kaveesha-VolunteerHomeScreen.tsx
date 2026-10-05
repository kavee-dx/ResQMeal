import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { useVolunteerNavigation } from "../hooks/dilshara-useVolunteerNavigation";
import type { RootStackParamList } from "../navigation/types";
import {
  getCurrentAssignment,
  getAssignmentSummary,
} from "@/services/dilshara-assignmentService";
import type { AssignmentSummary } from "@/services/dilshara-assignmentService";

import VolunteerHeroBanner from "../components/dilshara-VolunteerHeroBanner";
import VolunteerStatCard from "../components/dilshara-VolunteerStatCard";
import VolunteerBottomNav from "../components/dilshara-VolunteerBottomNav";
import VolunteerDrawer from "../components/dilshara-VolunteerDrawer";

type Props = NativeStackScreenProps<RootStackParamList, "VolunteerHome">;

export default function VolunteerHomeScreen({ route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();
  const { goTo } = useVolunteerNavigation();
  const { fullName } = route.params;

  const displayName = fullName.trim() || "Volunteer";

  const [drawerOpen, setDrawerOpen] = useState(false);

  // null = not loaded (or unavailable) -> shown as "–", never as a fake number.
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);

  // Refetched every time Home regains focus, so the numbers stay correct
  // after accepting/completing a delivery and coming back.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getCurrentAssignment()
        .then((assignment) => {
          if (active) setAssignedCount(assignment ? 1 : 0);
        })
        .catch(() => {
          // Summary stat only — fail quietly on the dashboard.
        });

      getAssignmentSummary()
        .then((result) => {
          if (active) setSummary(result);
        })
        .catch(() => {
          if (active) setSummary(null);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingTop: insets.top + Spacing.three,
          paddingBottom: Spacing.four,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.four }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.secondarySoft,
              alignItems: "center",
              justifyContent: "center",
              marginRight: Spacing.three,
            }}
          >
            <Ionicons name="person-outline" size={22} color={theme.secondary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ ...T.bodySmall, color: theme.textSecondary }}>Welcome back,</Text>
            <Text
              numberOfLines={1}
              style={{ ...T.h1, fontSize: 20, lineHeight: 26, color: theme.text }}
            >
              {displayName}
            </Text>
            <Text style={{ ...T.bodySmall, color: theme.textMuted }}>Volunteer</Text>
          </View>

          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="menu-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <VolunteerHeroBanner />

        <Text style={{ ...T.label, fontSize: 15, color: theme.text, marginBottom: Spacing.three }}>
          Your Activity
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          <VolunteerStatCard
            icon="navigate-outline"
            label="Assigned Deliveries"
            value={assignedCount === null ? "–" : String(assignedCount)}
            onPress={() => goTo("assignments")}
          />
          <VolunteerStatCard
            icon="hourglass-outline"
            label="Hours Contributed"
            value={summary ? String(summary.hoursContributed) : "–"}
          />
          <VolunteerStatCard
            icon="checkmark-circle-outline"
            label="Completed Deliveries"
            value={summary ? String(summary.completedCount) : "–"}
          />
          <VolunteerStatCard
            icon="options-outline"
            label="Delivery Preferences"
            value="Manage"
            smallValue
            onPress={() => goTo("preferences")}
          />
        </View>

        <TouchableOpacity
          onPress={() => goTo("assignments")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View my assignments"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 54,
            borderRadius: Radius.md,
            backgroundColor: theme.primary,
            marginTop: Spacing.two,
            ...Shadows.button,
          }}
        >
          <Ionicons
            name="navigate-outline"
            size={20}
            color={theme.textOnPrimary}
            style={{ marginRight: 8 }}
          />
          <Text style={{ ...T.button, color: theme.textOnPrimary }}>View My Assignments</Text>
        </TouchableOpacity>
      </ScrollView>

      <VolunteerBottomNav active="home" />

      <VolunteerDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        fullName={fullName}
        active="home"
      />
    </View>
  );
}