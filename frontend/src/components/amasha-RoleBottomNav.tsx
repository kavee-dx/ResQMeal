// Reusable bottom navigation for role homes that don't ship their own tab
// bar (currently the recipient home). Mirrors the volunteer bar's pill look
// and points every role at the same Food Rescue Map screen.
// Owner: Amasha

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import type { RootStackParamList } from "../navigation/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Nav = NativeStackNavigationProp<RootStackParamList>;

export type RoleNavKey = "home" | "map" | "chat" | "profile";

type Tab = {
  key: RoleNavKey;
  label: string;
  icon: IconName;
  iconActive: IconName;
};

const TABS: Tab[] = [
  { key: "home", label: "Home", icon: "home-outline", iconActive: "home" },
  { key: "map", label: "Rescue Map", icon: "map-outline", iconActive: "map" },
  { key: "chat", label: "Chats", icon: "chatbubbles-outline", iconActive: "chatbubbles" },
  { key: "profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

type Props = {
  active?: RoleNavKey;
};

export default function AmashaRoleBottomNav({ active = "home" }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const goTo = (key: RoleNavKey) => {
    switch (key) {
      case "home":
        // The bar only renders on the Home screen, so there is nothing to
        // navigate to — pressing Home just stays put.
        break;
      case "map":
        navigation.navigate("FoodRescueMap");
        break;
      case "chat":
        navigation.navigate("ChatList");
        break;
      case "profile":
        navigation.navigate("Profile");
        break;
    }
  };

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
          const color = selected ? theme.primary : theme.textMuted;

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
