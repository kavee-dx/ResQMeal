// frontend/src/navigation/kaveesha-CreateDonationNavigator.tsx
// Create Donation flow navigator
// Owner: Kaveesha

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateDonationFlowParamList } from './kaveesha-createDonationFlow.types';
import { CreateDonationProvider } from '../context/kaveesha-CreateDonationContext';

import TypeSelectScreen from '../screens/donation-flow/kaveesha-TypeSelectScreen';
import DetailsScreen from '../screens/donation-flow/kaveesha-DetailsScreen';
import AnalysisScreen from '../screens/donation-flow/kaveesha-AnalysisScreen';
import SafetyCheckScreen from '../screens/donation-flow/kaveesha-SafetyCheckScreen';
import ReviewScreen from '../screens/donation-flow/kaveesha-ReviewScreen';

const Stack =
  createNativeStackNavigator<CreateDonationFlowParamList>();

export default function KaveeshaCreateDonationNavigator() {
  return (
    <CreateDonationProvider>
      <Stack.Navigator
        initialRouteName="Details"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="TypeSelect"
          component={TypeSelectScreen}
        />

        <Stack.Screen
          name="Details"
          component={DetailsScreen}
        />

        <Stack.Screen
          name="Analysis"
          component={AnalysisScreen}
        />

        <Stack.Screen
          name="Safety"
          component={SafetyCheckScreen}
        />

        <Stack.Screen
          name="Review"
          component={ReviewScreen}
        />
      </Stack.Navigator>
    </CreateDonationProvider>
  );
}