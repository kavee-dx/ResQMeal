import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "./types";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/dushani-RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/dilshara-ProfileScreen";


const Stack = createNativeStackNavigator<RootStackParamList>();


export default function AppNavigator() {
  return (
    <NavigationContainer>

      <Stack.Navigator
  initialRouteName="Profile"   // ← temporarily, instead of "Splash"
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
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}