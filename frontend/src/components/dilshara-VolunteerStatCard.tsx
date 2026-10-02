// Tappable statistic card for the volunteer dashboard.
// Owner: Dilshara

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
  /** Smaller value text, for words such as "Manage" instead of numbers. */
  smallValue?: boolean;
};

export default function VolunteerStatCard({ icon, label, value, onPress, smallValue }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const style = {
    width: "48%" as const,
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.card,
  };

  const content = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.secondarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={20} color={theme.secondary} />
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
      </View>

      <Text
        numberOfLines={1}
        style={{
          ...T.h1,
          fontSize: smallValue ? 20 : 28,
          lineHeight: smallValue ? 28 : 36,
          color: theme.text,
          marginTop: Spacing.three,
        }}
      >
        {value}
      </Text>
      <Text numberOfLines={2} style={{ ...T.bodySmall, color: theme.textSecondary, marginTop: 2 }}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={style}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {content}
    </TouchableOpacity>
  );
}