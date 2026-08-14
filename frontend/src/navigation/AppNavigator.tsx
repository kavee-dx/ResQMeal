import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "./types";

import SplashScreen from "../screens/kaveesha-SplashScreen";
import LoginScreen from "../screens/kaveesha-LoginScreen";
import ForgotPasswordScreen from "../screens/kaveesha-ForgotPasswordScreen";
import RegisterScreen from "../screens/dushani-RegisterScreen";
import HomeScreen from "../screens/HomeScreen";


const Stack = createNativeStackNavigator<RootStackParamList>();


export default function AppNavigator() {
  return (
    <NavigationContainer>

      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}