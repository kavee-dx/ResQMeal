import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList, Role } from "./types";

import SplashScreen from "../screens/kaveesha-SplashScreen";
import LoginScreen from "../screens/kaveesha-LoginScreen";
import ForgotPasswordScreen from "../screens/kaveesha-ForgotPasswordScreen";
import RegisterScreen from "../screens/dushani-RegisterScreen";
import ProfileScreen from "../screens/dilshara-ProfileScreen";
import VerifyAccountScreen from "../screens/dushani-VerifyAccountScreen";
import DonorHomeScreen from "../screens/kaveesha-DonorHomeScreen";
import RecipientHomeScreen from "../screens/dushani-RecipientHomeScreen";
import NgoHomeScreen from "../screens/kaveesha-NgoHomeScreen";
import VolunteerHomeScreen from "../screens/kaveesha-VolunteerHomeScreen";
import VerifyResetOtpScreen from "../screens/kaveesha-VerifyResetOtpScreen";
import ResetPasswordScreen from "../screens/kaveesha-ResetPasswordScreen";
import DeleteAccountScreen from "../screens/amasha-DeleteAccountScreen";
import NotificationSettingsScreen from "../screens/amasha-NotificationSettingsScreen";
import PrivacySettingsScreen from "../screens/amasha-PrivacySettingsScreen";
import AdminLoginScreen from "../screens/amasha-AdminLoginScreen";
import AdminDashboardScreen from "../screens/amasha-AdminDashboardScreen";
import RegistrationPendingScreen from "../screens/amasha-RegistrationPendingScreen";
import CreateDonationScreen from "@/navigation/kaveesha-CreateDonationNavigator";
import MyDonationsScreen from "@/screens/kaveesha-MyDonationsScreen";
import DonationDetailScreen from "@/screens/kaveesha-DonationDetailScreen";
import OnboardingScreen from "../screens/kaveesha-OnboardingScreen";
import AvailableFoodScreen from "../screens/dushani-availableFoodScreen";
import FoodRequestScreen from "../screens/dushani-foodRequestScreen";
import RequestStatusScreen from "../screens/dushani-requestStatusScreen";
import VolunteerAvailabilityScreen from "../screens/dilshara-volunteerAvailabilityScreen"; // NEW
import FoodRescueRequestsScreen from "../screens/kaveesha-FoodRescueRequestsScreen";
import NGOCommunitiesScreen from "../screens/kaveesha-NGOCommunitiesScreen";
import RequestProgressScreen from "../screens/dushani-requestProgressScreen";
import RequestBoardScreen from "../screens/dushani-requestBoardScreen";
import AssignmentStatusScreen from "../screens/dilshara-AssignmentStatusScreen"; // NEW

const Stack = createNativeStackNavigator<RootStackParamList>();

type InitialAuth = {
  token: string | null;
  role: Role | null;
  fullName: string | null;
};

type Props = {
  initialAuth: InitialAuth;
};

export default function AppNavigator({ initialAuth }: Props) {
  const hasSession = Boolean(initialAuth.token && initialAuth.role);

  const initialRouteName = "Splash";

  const homeInitialParams = hasSession
    ? { fullName: initialAuth.fullName ?? "" }
    : undefined;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {/* Startup / Authentication */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        <Stack.Screen name="Login" component={LoginScreen} />

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

        <Stack.Screen name="Register" component={RegisterScreen} />

        <Stack.Screen
          name="VerifyAccount"
          component={VerifyAccountScreen}
        />

        <Stack.Screen name="Profile" component={ProfileScreen} />

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

        {/* NEW — volunteer availability screen */}
        <Stack.Screen
          name="VolunteerAvailability"
          component={VolunteerAvailabilityScreen}
        />

        {/* NEW — volunteer assignment status screen */}
        <Stack.Screen
          name="AssignmentStatus"
          component={AssignmentStatusScreen}
        />

        {/* Main Dashboards */}
        <Stack.Screen
          name="DonorHome"
          component={DonorHomeScreen}
          initialParams={homeInitialParams}
        />

        <Stack.Screen
          name="RecipientHome"
          component={RecipientHomeScreen}
          initialParams={homeInitialParams}
        />

        <Stack.Screen
          name="NgoHome"
          component={NgoHomeScreen}
          initialParams={homeInitialParams}
        />

        <Stack.Screen
          name="VolunteerHome"
          component={VolunteerHomeScreen}
          initialParams={homeInitialParams}
        />

        {/* Food Rescue */}
        <Stack.Screen
          name="FoodRescueRequests"
          component={FoodRescueRequestsScreen}
        />

        <Stack.Screen
          name="NGOCommunities"
          component={NGOCommunitiesScreen}
        />

        {/* Donor */}
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

        {/* Recipient */}

        <Stack.Screen name="AvailableFood" component={AvailableFoodScreen} />
        <Stack.Screen name="FoodRequest" component={FoodRequestScreen} />
        <Stack.Screen name="RequestStatus" component={RequestStatusScreen} />
        <Stack.Screen name="RequestProgress" component={RequestProgressScreen} />
        <Stack.Screen name="RequestBoard" component={RequestBoardScreen} />

        

        

        {/* Admin */}
        <Stack.Screen
          name="AdminLogin"
          component={AdminLoginScreen}
        />

        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
        />

        <Stack.Screen
          name="RegistrationPending"
          component={RegistrationPendingScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}