import "./global.css";

import { useCallback, useEffect, useState } from "react";
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
import { getToken, getRole, getFullName } from "./src/utils/kaveesha-authStorage";
import type { Role } from "./src/navigation/types";

// Keep the native splash screen visible until fonts are ready.
SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op: safe to ignore if already prevented / not supported on web
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [authChecked, setAuthChecked] = useState(false);
  const [initialAuth, setInitialAuth] = useState<{
    token: string | null;
    role: Role | null;
    fullName: string | null;
  }>({ token: null, role: null, fullName: null });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const role = await getRole();
      const fullName = await getFullName();
      setInitialAuth({ token, role, fullName });
      setAuthChecked(true);
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && authChecked) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authChecked]);

  // Render nothing until Poppins is loaded and the stored session
  // has been checked, so no screen ever flashes with the wrong
  // initial route or the fallback system font.
  if (!fontsLoaded || !authChecked) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppNavigator initialAuth={initialAuth} />
    </View>
  );
}