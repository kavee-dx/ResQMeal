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

type Props = NativeStackScreenProps<RootStackParamList, "DonorHome">;

const ACCENT = "#22C55E";

export default function DonorHomeScreen({ navigation, route }: Props) {
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
          <HomeHeader fullName={fullName} roleLabel="Donor" accentColor={ACCENT} />
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
        <Ionicons name="heart" size={26} color="#fff" />
        <Text style={{ ...T.h1, color: "#fff", marginTop: Spacing.two, fontSize: 20 }}>
          Thank you for giving back
        </Text>
        <Text style={{ ...T.bodySmall, color: "#EAFBEF", marginTop: 4 }}>
          Every donation helps a family in need and keeps good food out of landfill.
        </Text>
      </View>

      <Text style={{ ...T.label, color: theme.text, marginBottom: Spacing.three }}>
        Your Impact
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <StatCard icon="fast-food-outline" label="Active Listings" value="0" accentColor={ACCENT} />
        <StatCard icon="checkmark-done-outline" label="Completed Donations" value="0" accentColor={ACCENT} />
        <StatCard icon="people-outline" label="People Helped" value="0" accentColor={ACCENT} />
        <StatCard icon="leaf-outline" label="Meals Saved" value="0" accentColor={ACCENT} />
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert("Coming soon", "Food donation posting will be available in a future update.")
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
        <Ionicons name="add-circle-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
        <Text style={{ ...T.button, color: theme.textOnPrimary }}>Donate Food</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}