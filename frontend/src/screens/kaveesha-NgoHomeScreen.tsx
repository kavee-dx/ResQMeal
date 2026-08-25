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

type Props = NativeStackScreenProps<RootStackParamList, "NgoHome">;

const ACCENT = "#8B5CF6";

export default function NgoHomeScreen({ navigation, route }: Props) {
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
       

        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={{ marginRight: Spacing.two, padding: 6 }}
        >
          <Ionicons name="person-circle-outline" size={28} color={ACCENT} />
        </TouchableOpacity>

        {/* <LogoutButton navigation={navigation} compact /> */}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <HomeHeader fullName={fullName} roleLabel="NGO" accentColor={ACCENT} />
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
        <Ionicons name="business-outline" size={26} color="#fff" />
        <Text style={{ ...T.h1, color: "#fff", marginTop: Spacing.two, fontSize: 20 }}>
          Coordinate your impact
        </Text>
        <Text style={{ ...T.bodySmall, color: "#F0E9FF", marginTop: 4 }}>
          Manage campaigns, connect with donors, and mobilize volunteers.
        </Text>
      </View>

      <Text style={{ ...T.label, color: theme.text, marginBottom: Spacing.three }}>
        Organization Overview
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard icon="megaphone-outline" label="Active Campaigns" value="0" accentColor={ACCENT} />
        <StatCard icon="people-outline" label="Partner Donors" value="0" accentColor={ACCENT} />
        <StatCard icon="walk-outline" label="Volunteers Assigned" value="0" accentColor={ACCENT} />
        <StatCard icon="cube-outline" label="Total Distributed" value="0" accentColor={ACCENT} />
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert("Coming soon", "Campaign creation will be available in a future update.")
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
        <Ionicons name="megaphone-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
        <Text style={{ ...T.button, color: theme.textOnPrimary }}>Create Campaign</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}