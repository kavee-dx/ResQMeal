// Hero banner (photo + headline + quote) for the volunteer dashboard.
// Owner: Dilshara

import React, { useState } from "react";
import { Image, LayoutChangeEvent, Text, View } from "react-native";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";

// File: frontend/assets/images/dilshara-volunteer-hero.jpg
const HERO_IMAGE = require("../../assets/images/dilshara-volunteer-hero.jpg");

// The photo area is half as tall as the card is wide, kept between these limits
// so it is never excessively tall on a tablet or in a desktop browser.
const HEIGHT_RATIO = 0.5;
const MIN_HEIGHT = 170;
const MAX_HEIGHT = 500;

export default function VolunteerHeroBanner() {
  const theme = Colors.light;
  const T = useAppTypography();
  const [width, setWidth] = useState(0);

  const imageHeight = Math.min(Math.max(width * HEIGHT_RATIO, MIN_HEIGHT), MAX_HEIGHT);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{
        borderRadius: Radius.xl,
        overflow: "hidden",
        backgroundColor: theme.primary,
        marginBottom: Spacing.four,
        ...Shadows.card,
      }}
    >
      <View style={{ height: imageHeight, backgroundColor: theme.surfaceSoft }}>
        <Image
          source={HERO_IMAGE}
          resizeMode="cover"
          accessibilityLabel="Volunteers sharing food with the community"
          style={{ width: "100%", height: "100%" }}
        />
      </View>

      <View style={{ padding: Spacing.four }}>
        <Text style={{ ...T.h1, fontSize: 22, lineHeight: 28, color: theme.textOnPrimary }}>
          Deliver kindness. Create change.
        </Text>
        <Text style={{ ...T.bodySmall, color: theme.secondaryLight, marginTop: Spacing.two }}>
          "Small acts of kindness can deliver a world of change."
        </Text>
      </View>
    </View>
  );
}