import React from "react";
import {
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import { RootStackParamList, Role, getHomeRouteForRole } from "./types";

import SplashScreen from "../screens/kaveesha-SplashScreen";
import LoginScreen from "../screens/kaveesha-LoginScreen";
import ForgotPasswordScreen from "../screens/kaveesha-ForgotPasswordScreen";
import RegisterScreen from "../screens/dushani-RegisterScreen";
import VerifyAccountScreen from "../screens/dushani-VerifyAccountScreen";
import DonorHomeScreen from "../screens/kaveesha-DonorHomeScreen";
import RecipientHomeScreen from "../screens/kaveesha-RecipientHomeScreen";
import NgoHomeScreen from "../screens/kaveesha-NgoHomeScreen";
import VolunteerHomeScreen from "../screens/kaveesha-VolunteerHomeScreen";
import VerifyResetOtpScreen from '../screens/kaveesha-VerifyResetOtpScreen';
import ResetPasswordScreen from '../screens/kaveesha-ResetPasswordScreen';

const Stack =
  createNativeStackNavigator<RootStackParamList>();

type InitialAuth = {
  token: string | null;
  role: Role | null;
  fullName: string | null;
};

type Props = {
  initialAuth: InitialAuth;
};

export default function AppNavigator({ initialAuth }: Props) {
  // If a valid token + role are already stored, skip straight to
  // that role's Home screen instead of Splash → Login.
  const hasSession = Boolean(initialAuth.token && initialAuth.role);

  const initialRouteName = hasSession && initialAuth.role
    ? getHomeRouteForRole(initialAuth.role)
    : "Splash";

  const homeInitialParams = hasSession
    ? { fullName: initialAuth.fullName ?? "" }
    : undefined;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
        }}
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

        <Stack.Screen name="VerifyResetOtp" component={VerifyResetOtpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="VerifyAccount"
          component={VerifyAccountScreen}
        />

        <Stack.Screen
          name="DonorHome"
          component={DonorHomeScreen}
          initialParams={
            initialRouteName === "DonorHome" ? homeInitialParams : undefined
          }
        />

        <Stack.Screen
          name="RecipientHome"
          component={RecipientHomeScreen}
          initialParams={
            initialRouteName === "RecipientHome" ? homeInitialParams : undefined
          }
        />

        <Stack.Screen
          name="NgoHome"
          component={NgoHomeScreen}
          initialParams={
            initialRouteName === "NgoHome" ? homeInitialParams : undefined
          }
        />

        <Stack.Screen
          name="VolunteerHome"
          component={VolunteerHomeScreen}
          initialParams={
            initialRouteName === "VolunteerHome" ? homeInitialParams : undefined
          }
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}