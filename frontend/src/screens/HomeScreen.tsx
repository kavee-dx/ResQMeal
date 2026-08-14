import React from "react";
import {
  View,
  Text,
} from "react-native";

import type {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import type {
  RootStackParamList,
} from "../navigation/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Home"
>;

export default function HomeScreen({
  route,
}: Props) {
  const { role } = route.params;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        Home Screen
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 16,
        }}
      >
        Role: {role}
      </Text>
    </View>
  );
}