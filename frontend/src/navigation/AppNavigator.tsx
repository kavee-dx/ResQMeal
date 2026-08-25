import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "./types";

import SplashScreen from "../screens/kaveesha-SplashScreen";
import LoginScreen from "../screens/kaveesha-LoginScreen";
import ForgotPasswordScreen from "../screens/kaveesha-ForgotPasswordScreen";
import RegisterScreen from "../screens/dushani-RegisterScreen";
import ProfileScreen from "../screens/dilshara-ProfileScreen";
import VerifyAccountScreen from "../screens/dushani-VerifyAccountScreen";
import DonorHomeScreen from "../screens/kaveesha-DonorHomeScreen";
import RecipientHomeScreen from "../screens/kaveesha-RecipientHomeScreen";
import NgoHomeScreen from "../screens/kaveesha-NgoHomeScreen";
import VolunteerHomeScreen from "../screens/kaveesha-VolunteerHomeScreen";
import VerifyResetOtpScreen from "../screens/kaveesha-VerifyResetOtpScreen";
import ResetPasswordScreen from "../screens/kaveesha-ResetPasswordScreen";
import DeleteAccountScreen from "../screens/amasha-DeleteAccountScreen";
import NotificationSettingsScreen from "../screens/amasha-NotificationSettingsScreen";
import PrivacySettingsScreen from "../screens/amasha-PrivacySettingsScreen";
import CreateDonationScreen from "@/screens/kaveesha-CreateDonationScreen";
import MyDonationsScreen from "@/screens/kaveesha-MyDonationsScreen";
import DonationDetailScreen from "@/screens/kaveesha-DonationDetailScreen";

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
          name="VerifyResetOtp"
          component={VerifyResetOtpScreen}
        />

        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="VerifyAccount"
          component={VerifyAccountScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

        <Stack.Screen
          name="DeleteAccount"
          component={DeleteAccountScreen}
        />

        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
        />

        <Stack.Screen
          name="PrivacySettings"
          component={PrivacySettingsScreen}
        />

        <Stack.Screen
          name="DonorHome"
          component={DonorHomeScreen}
        />

        <Stack.Screen
          name="RecipientHome"
          component={RecipientHomeScreen}
        />

        <Stack.Screen
          name="NgoHome"
          component={NgoHomeScreen}
        />

        <Stack.Screen
          name="VolunteerHome"
          component={VolunteerHomeScreen}
        />

        <Stack.Screen
          name="CreateDonation"
          component={CreateDonationScreen}
        />

        <Stack.Screen
          name="MyDonations"
          component={MyDonationsScreen}
        />

        <Stack.Screen
          name="DonationDetail"
          component={DonationDetailScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}