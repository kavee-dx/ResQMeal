import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function LoginScreen() {
  return (
    <View className="justify-center flex-1 px-6 bg-green-600">

      {/* Logo / App Name */}
      <View className="items-center mb-12">

        <View className="items-center justify-center w-24 h-24 mb-5 bg-white rounded-full">
          <Text className="text-5xl">
            🍱
          </Text>
        </View>

        <Text className="text-4xl font-bold text-white">
          ResQMeal
        </Text>

        <Text className="mt-2 text-base text-white opacity-90">
          Rescue food. Reduce waste.
        </Text>

      </View>


      {/* Login Card */}
      <View className="p-6 bg-white shadow-lg rounded-3xl">

        <Text className="mb-6 text-2xl font-bold text-gray-800">
          Welcome Back 👋
        </Text>


        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          className="px-4 py-4 mb-4 text-gray-800 bg-gray-100 rounded-xl"
        />


        <TextInput
          placeholder="Password"
          secureTextEntry
          className="px-4 py-4 mb-6 text-gray-800 bg-gray-100 rounded-xl"
        />


        <TouchableOpacity className="items-center py-4 bg-green-600 rounded-xl">
          <Text className="text-lg font-bold text-white">
            Login
          </Text>
        </TouchableOpacity>


        <TouchableOpacity className="items-center mt-5">
          <Text className="font-semibold text-green-600">
            Don't have an account? Register
          </Text>
        </TouchableOpacity>

      </View>


    </View>
  );
}