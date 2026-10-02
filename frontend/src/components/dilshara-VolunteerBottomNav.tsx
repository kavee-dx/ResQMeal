// Bottom navigation bar shared by the volunteer screens.
// Owner: Dilshara

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { useVolunteerNavigation } from "../hooks/dilshara-useVolunteerNavigation";
import type { VolunteerTarget } from "../hooks/dilshara-useVolunteerNavigation";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Tab = {
  key: VolunteerTarget;
  label: string;
  icon: IconName;
  iconActive: IconName;
};

const TABS: Tab[] = [
  { key: "home", label: "Home", icon: "home-outline", iconActive: "home" },
  { key: "map", label: "Map", icon: "location-outline", iconActive: "location" },
  { key: "assignments", label: "My Deliveries", icon: "cube-outline", iconActive: "cube" },
  { key: "profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

type Props = {
  active?: VolunteerTarget;
};

export default function VolunteerBottomNav({ active }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();
  const { goTo } = useVolunteerNavigation();

  return (
    <View
      style={{
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.two,
        paddingBottom: Math.max(insets.bottom, Spacing.two),
        backgroundColor: theme.background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.surface,
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: theme.borderLight,
          paddingVertical: Spacing.two,
          ...Shadows.card,
        }}
      >
        {TABS.map((tab) => {
          const selected = tab.key === active;
          const color = selected ? theme.secondary : theme.textMuted;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => goTo(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              style={{ flex: 1, alignItems: "center", paddingVertical: Spacing.one }}
            >
              <Ionicons name={selected ? tab.iconActive : tab.icon} size={22} color={color} />
              <Text
                numberOfLines={1}
                style={{ ...T.label, fontSize: 11, lineHeight: 15, color, marginTop: 2 }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}