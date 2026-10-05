// Shared navigation helper for the volunteer screens
// (used by the bottom navigation bar and the side drawer).
// Owner: Dilshara

import { useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { HomeParams, RootStackParamList } from "@/navigation/types";

export type VolunteerTarget =
  | "home"
  | "map"
  | "assignments"
  | "preferences"
  | "profile";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function useVolunteerNavigation() {
  const navigation = useNavigation<Nav>();

  const goTo = useCallback(
    (target: VolunteerTarget) => {
      switch (target) {
        case "home": {
          // Reuse the params VolunteerHome already has so the name is kept.
          const homeRoute = navigation
            .getState()
            .routes.find((r) => r.name === "VolunteerHome");
          navigation.navigate(
            "VolunteerHome",
            (homeRoute?.params as HomeParams | undefined) ?? { fullName: "" },
          );
          break;
        }
        case "assignments":
          
          navigation.navigate("AssignmentStatus");
          break;
        case "preferences":
          navigation.navigate("VolunteerDeliveryPreferences");
          break;
        case "profile":
          navigation.navigate("Profile");
          break;
        case "map":
          // Map screen belongs to another member. When it exists, replace
          // this alert with navigation.navigate("<MapRouteName>").
          Alert.alert("Map", "The map view will be available soon.");
          break;
      }
    },
    [navigation],
  );

  return { navigation, goTo };
}