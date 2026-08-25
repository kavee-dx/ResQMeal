import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IconName;
  label: string;
  value: string;
  accentColor: string;
};

export default function StatCard({
  icon,
  label,
  value,
  accentColor,
}: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  return (
    <View
      style={{
        flexBasis: "48%",
        backgroundColor: theme.formBackground,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: theme.border,
        padding: Spacing.three,
        marginBottom: Spacing.three,
        ...Shadows.card,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: `${accentColor}20`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: Spacing.two,
        }}
      >
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>

      <Text style={{ ...T.h1, fontSize: 22, color: theme.text }}>
        {value}
      </Text>

      <Text
        style={{ ...T.bodySmall, color: theme.textSecondary, marginTop: 2 }}
      >
        {label}
      </Text>
    </View>
  );
}