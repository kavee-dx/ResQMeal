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

type Props = NativeStackScreenProps<RootStackParamList, "RecipientHome">;

const ACCENT = "#3B82F6";

export default function RecipientHomeScreen({ navigation, route }: Props) {
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

        <LogoutButton navigation={navigation} compact />
      </View>


      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <HomeHeader fullName={fullName} roleLabel="Recipient" accentColor={ACCENT} />
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
        <Ionicons name="basket-outline" size={26} color="#fff" />
        <Text style={{ ...T.h1, color: "#fff", marginTop: Spacing.two, fontSize: 20 }}>
          Fresh food, nearby
        </Text>
        <Text style={{ ...T.bodySmall, color: "#E6F0FF", marginTop: 4 }}>
          Browse available donations from generous donors around you.
        </Text>
      </View>

      <Text style={{ ...T.label, color: theme.text, marginBottom: Spacing.three }}>
        Overview
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard icon="location-outline" label="Available Nearby" value="0" accentColor={ACCENT} />
        <StatCard icon="paper-plane-outline" label="My Requests" value="0" accentColor={ACCENT} />
        <StatCard icon="time-outline" label="Pending Pickups" value="0" accentColor={ACCENT} />
        <StatCard icon="gift-outline" label="Received This Month" value="0" accentColor={ACCENT} />
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert("Coming soon", "Browsing donations will be available in a future update.")
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
        <Ionicons name="search-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
        <Text style={{ ...T.button, color: theme.textOnPrimary }}>Browse Donations</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}