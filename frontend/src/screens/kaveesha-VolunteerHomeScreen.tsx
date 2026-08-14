import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import type { RootStackParamList } from "../navigation/types";

import HomeHeader from "../components/kaveesha-HomeHeader";
import StatCard from "../components/kaveesha-StatCard";
import LogoutButton from "../components/kaveesha-LogoutButton";

type Props = NativeStackScreenProps<RootStackParamList, "VolunteerHome">;

const ACCENT = "#F97316";

export default function VolunteerHomeScreen({ navigation, route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const { fullName } = route.params;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.six,
        paddingBottom: Spacing.seven,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <HomeHeader fullName={fullName} roleLabel="Volunteer" accentColor={ACCENT} />
        </View>
        <LogoutButton navigation={navigation} compact />
      </View>

      <View
        style={{
          backgroundColor: ACCENT,
          borderRadius: Radius.xl,
          padding: Spacing.four,
          marginTop: Spacing.five,
          marginBottom: Spacing.five,
          ...Shadows.card,
        }}
      >
        <Ionicons name="bicycle-outline" size={26} color="#fff" />
        <Text style={{ ...T.h1, color: "#fff", marginTop: Spacing.two, fontSize: 20 }}>
          Your help matters
        </Text>
        <Text style={{ ...T.bodySmall, color: "#FFEEDD", marginTop: 4 }}>
          Thanks for volunteering your time to move food from donors to those who need it.
        </Text>
      </View>

      <Text style={{ ...T.label, color: theme.text, marginBottom: Spacing.three }}>
        Your Activity
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard icon="navigate-outline" label="Assigned Deliveries" value="0" accentColor={ACCENT} />
        <StatCard icon="hourglass-outline" label="Hours Contributed" value="0" accentColor={ACCENT} />
        <StatCard icon="checkmark-circle-outline" label="Completed Tasks" value="0" accentColor={ACCENT} />
        <StatCard icon="calendar-outline" label="Upcoming Pickups" value="0" accentColor={ACCENT} />
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert("Coming soon", "Assignment tracking will be available in a future update.")
        }
        activeOpacity={0.85}
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
        <Ionicons name="navigate-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
        <Text style={{ ...T.button, color: theme.textOnPrimary }}>View Assignments</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}