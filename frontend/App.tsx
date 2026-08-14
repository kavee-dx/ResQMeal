import "./global.css";

import { useCallback } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import AppNavigator from "./src/navigation/AppNavigator";

// Keep the native Expo splash screen visible
// until the application fonts are completely loaded.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore if the splash screen has already
  // been prevented or the platform does not support it.
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render the application until the fonts
  // are ready. This prevents a system-font flash.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View
      style={{ flex: 1 }}
      onLayout={onLayoutRootView}
    >
      <AppNavigator />
    </View>
  );
}