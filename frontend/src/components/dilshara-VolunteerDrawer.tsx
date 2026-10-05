// Slide-in side menu for the volunteer screens (no extra dependencies).
// Owner: Dilshara

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { useVolunteerNavigation } from "../hooks/dilshara-useVolunteerNavigation";
import type { VolunteerTarget } from "../hooks/dilshara-useVolunteerNavigation";
import LogoutButton from "./kaveesha-LogoutButton";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEMS: { key: VolunteerTarget; label: string; icon: IconName }[] = [
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "map", label: "Map", icon: "location-outline" },
  { key: "assignments", label: "My Assignments", icon: "cube-outline" },
  { key: "preferences", label: "Delivery Preferences", icon: "options-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  active?: VolunteerTarget;
};

export default function VolunteerDrawer({ visible, onClose, fullName, active }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { navigation, goTo } = useVolunteerNavigation();

  const drawerWidth = Math.min(320, width * 0.82);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const [mounted, setMounted] = useState(false);

  // Mount first, then animate, so the animated view exists when it starts.
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(translateX, {
      toValue: visible ? 0 : -drawerWidth,
      duration: visible ? 220 : 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [mounted, visible, drawerWidth, translateX]);

  const overlayOpacity = translateX.interpolate({
    inputRange: [-drawerWidth, 0],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  if (!mounted) return null;

  const displayName = fullName.trim() || "Volunteer";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSelect = (target: VolunteerTarget) => {
    onClose();
    // Let the drawer finish closing before navigating.
    setTimeout(() => goTo(target), 200);
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.primaryDark,
            opacity: overlayOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerWidth,
            backgroundColor: theme.primary,
            paddingTop: insets.top + Spacing.three,
            paddingBottom: Math.max(insets.bottom, Spacing.three),
            paddingHorizontal: Spacing.three,
            transform: [{ translateX }],
            ...Shadows.card,
          }}
        >
          {/* Brand */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.four }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: Radius.sm,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: Spacing.two,
              }}
            >
              <Ionicons name="leaf-outline" size={22} color={theme.textOnSecondary} />
            </View>
            <Text style={{ ...T.h1, fontSize: 22, lineHeight: 28, color: theme.textOnPrimary }}>
              ResQMeal
            </Text>
          </View>

          {/* Menu items */}
          {ITEMS.map((item) => {
            const selected = item.key === active;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleSelect(item.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: Spacing.three,
                  borderRadius: Radius.md,
                  marginBottom: Spacing.one,
                  backgroundColor: selected ? theme.primaryDark : "transparent",
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={selected ? theme.secondary : theme.primaryLight}
                />
                <Text
                  style={{
                    ...T.label,
                    fontSize: 15,
                    lineHeight: 20,
                    marginLeft: Spacing.three,
                    color: selected ? theme.textOnPrimary : theme.primaryLight,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ flex: 1 }} />

          {/* User card */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primaryDark,
              borderRadius: Radius.lg,
              padding: Spacing.three,
              marginBottom: Spacing.three,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: Spacing.three,
              }}
            >
              <Text style={{ ...T.button, color: theme.textOnSecondary }}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ ...T.label, fontSize: 14, color: theme.textOnPrimary }}>
                {displayName}
              </Text>
              <Text style={{ ...T.bodySmall, color: theme.primaryLight }}>Volunteer</Text>
            </View>
          </View>

          {/* The ONE logout action */}
          <LogoutButton navigation={navigation} />
        </Animated.View>
      </View>
    </Modal>
  );
}