import React from "react";
import { View, Text } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { getGreeting } from "../utils/kaveesha-greeting";

type Props = {
  fullName: string;
  roleLabel: string;
  accentColor: string;
};

export default function HomeHeader({
  fullName,
  roleLabel,
  accentColor,
}: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const firstName = fullName?.trim()
    ? fullName.trim().split(" ")[0]
    : "there";

  const initial = firstName.charAt(0).toUpperCase() || "R";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: `${accentColor}25`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: Spacing.three,
        }}
      >
        <Text style={{ ...T.h1, fontSize: 22, color: accentColor }}>
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...T.body, color: theme.textSecondary }}>
          {getGreeting()},
        </Text>

        <Text
          style={{ ...T.h1, color: theme.text }}
          numberOfLines={1}
        >
          {firstName}
        </Text>

        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: `${accentColor}20`,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.two,
            paddingVertical: 3,
            marginTop: 4,
          }}
        >
          <Text style={{ ...T.bodySmall, color: accentColor, fontSize: 11 }}>
            {roleLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}