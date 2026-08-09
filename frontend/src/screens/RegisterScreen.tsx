import React from "react";
import { View, Text, TextInput } from "react-native";

export default function RegisterScreen() {
  return (
    <View>
      <Text>Register Screen</Text>
      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        className="px-4 py-4 mb-4 text-gray-800 bg-gray-100 rounded-xl"
      />
    </View>
  );
}
