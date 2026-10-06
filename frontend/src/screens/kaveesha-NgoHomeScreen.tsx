import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import { getGreeting } from "../utils/kaveesha-greeting";
import type { RootStackParamList } from "../navigation/types";
import LogoutButton from "../components/kaveesha-LogoutButton";
import { getMyProfile } from "@/services/dilshara-profileService";

type Props = NativeStackScreenProps<RootStackParamList, "NgoHome">;
type IconName = React.ComponentProps<typeof Ionicons>["name"];
type TabKey = "Home" | "Map" | "Create" | "Dashboard" | "Profile";

/* ---- Route names (must match RootStackParamList + AppNavigator) ---- */
const ROUTES = {
  dashboard: "NgoDashboard",
  map: "MonitoringMap",
  profile: "Profile",
  createCampaign: null as string | null, // set to a route name when it exists
} as const;

const SIDEBAR_WIDTH = 264;
const CONTENT_MAX = 1200;

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: IconName;
  iconActive: IconName;
}> = [
  { key: "Home", label: "Home", icon: "home-outline", iconActive: "home" },
  { key: "Map", label: "Map", icon: "map-outline", iconActive: "map" },
  {
    key: "Create",
    label: "Campaign",
    icon: "megaphone-outline",
    iconActive: "megaphone",
  },
  {
    key: "Dashboard",
    label: "Dashboard",
    icon: "stats-chart-outline",
    iconActive: "stats-chart",
  },
  {
    key: "Profile",
    label: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
];

/* ---------------------------------------------------------- */
/* Small components                                            */
/* ---------------------------------------------------------- */

function Brand({ onDark }: { onDark?: boolean }) {
  const theme = Colors.light;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: onDark ? theme.secondary : theme.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="leaf"
          size={20}
          color={onDark ? theme.textOnSecondary : "#FFFFFF"}
        />
      </View>
      <Text
        style={{
          fontSize: 21,
          fontWeight: "800",
          letterSpacing: -0.4,
          color: onDark ? "#FFFFFF" : theme.text,
        }}
      >
        ResQMeal
      </Text>
    </View>
  );
}

function WelcomeHeader({ name }: { name: string }) {
  const theme = Colors.light;
  const T = useAppTypography();
  const initial = name.charAt(0).toUpperCase() || "N";

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: Spacing.three,
        }}
      >
        <Text style={{ ...T.h1, fontSize: 22, color: theme.primary }}>
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...T.body, color: theme.textSecondary }}>
          {getGreeting()},
        </Text>
        <Text style={{ ...T.h1, color: theme.text }} numberOfLines={2}>
          {name}
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: theme.primarySoft,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.two,
            paddingVertical: 3,
            marginTop: 4,
          }}
        >
          <Text style={{ ...T.bodySmall, color: theme.primary, fontSize: 11 }}>
            NGO
          </Text>
        </View>
      </View>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  width,
}: {
  icon: IconName;
  label: string;
  value: string;
  width: number | string;
}) {
  const theme = Colors.light;
  return (
    <View
      style={[
        styles.statCard,
        {
          width: width as any,
          backgroundColor: theme.surface,
          borderColor: theme.borderLight,
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={21} color={theme.primary} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = Colors.light;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.quickTile,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={23} color={theme.primary} />
      </View>
      <Text
        style={{ color: theme.text, fontWeight: "600", flexShrink: 1 }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Sidebar({
  fullName,
  onNavigate,
}: {
  fullName: string;
  onNavigate: (t: TabKey) => void;
}) {
  const theme = Colors.light;
  return (
    <LinearGradient
      colors={[theme.primaryDark, theme.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.sidebar}
    >
      <Brand onDark />

      <View style={{ marginTop: 40, gap: 6 }}>
        {TABS.map((t) => {
          const active = t.key === "Home";
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              onPress={() => onNavigate(t.key)}
              style={[
                styles.sidebarItem,
                active && { backgroundColor: "rgba(255,255,255,0.12)" },
              ]}
            >
              <Ionicons
                name={active ? t.iconActive : t.icon}
                size={21}
                color={active ? theme.secondary : "rgba(255,255,255,0.74)"}
              />
              <Text
                style={{
                  color: active ? "#FFFFFF" : "rgba(255,255,255,0.74)",
                  fontWeight: active ? "700" : "500",
                  fontSize: 15,
                }}
              >
                {t.key === "Create" ? "Create campaign" : t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.sidebarUser}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.textOnSecondary, fontWeight: "700" }}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "#FFFFFF", fontWeight: "700" }}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
            NGO
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function BottomTabBar({
  active,
  onNavigate,
}: {
  active: TabKey;
  onNavigate: (t: TabKey) => void;
}) {
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.tabBarInner}>
        {TABS.map((t) => {
          const isActive = t.key === active;

          if (t.key === "Create") {
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.85}
                style={styles.tabItem}
                onPress={() => onNavigate("Create")}
              >
                <View
                  style={[styles.tabFab, { backgroundColor: theme.secondary }]}
                >
                  <Ionicons
                    name="megaphone"
                    size={24}
                    color={theme.textOnSecondary}
                  />
                </View>
                <Text
                  style={[styles.tabLabel, { color: theme.textSecondary }]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => onNavigate(t.key)}
            >
              <View
                style={[
                  styles.tabIconPill,
                  isActive && { backgroundColor: theme.primarySoft },
                ]}
              >
                <Ionicons
                  name={isActive ? t.iconActive : t.icon}
                  size={22}
                  color={isActive ? theme.primary : theme.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.primary : theme.textMuted },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------- */
/* Screen                                                      */
/* ---------------------------------------------------------- */

export default function NgoHomeScreen({ navigation, route }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();
  const { width } = useWindowDimensions();

  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        console.log("NGO profile:", p);
        setProfileName(p?.fullName ?? "");
      })
      .catch((err) => console.error("Failed to load NGO profile:", err));
  }, []);

  const fullName = profileName || route.params?.fullName || "";
  const displayName = fullName.trim() || "NGO";

  const isDesktop = width >= 1024;
  const isTablet = width >= 700 && !isDesktop;
  const isMobile = !isDesktop && !isTablet;
  const pad = isDesktop ? Spacing.five : isTablet ? Spacing.four : Spacing.three;

  const [activeTab] = useState<TabKey>("Home");

  const goCreateCampaign = () => {
    if (ROUTES.createCampaign) {
      (navigation as any).navigate(ROUTES.createCampaign);
    } else {
      Alert.alert(
        "Coming soon",
        "Campaign creation will be available in a future update.",
      );
    }
  };

  const handleNavigate = (tab: TabKey) => {
    switch (tab) {
      case "Home":
        break;
      case "Map":
        navigation.navigate(ROUTES.map);
        break;
      case "Create":
        goCreateCampaign();
        break;
      case "Dashboard":
        navigation.navigate(ROUTES.dashboard);
        break;
      case "Profile":
        navigation.navigate(ROUTES.profile);
        break;
    }
  };

  const statWidth = isMobile ? "48%" : isTablet ? "48.5%" : "23.5%";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column" }}>
        {isDesktop && (
          <Sidebar fullName={displayName} onNavigate={handleNavigate} />
        )}

        {!isDesktop && (
          <View
            style={[
              styles.mobileHeader,
              { paddingHorizontal: pad, backgroundColor: theme.background },
            ]}
          >
            <Brand />
            <LogoutButton navigation={navigation} compact />
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: isDesktop ? Spacing.six : 130,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: CONTENT_MAX,
              paddingHorizontal: pad,
              paddingTop: isDesktop ? 36 : 8,
            }}
          >
            {/* Welcome */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <WelcomeHeader name={displayName} />
              </View>
              {isDesktop && <LogoutButton navigation={navigation} compact />}
            </View>

            {/* Hero */}
            <View style={[styles.heroWrap, { marginTop: Spacing.four }]}>
              <LinearGradient
                colors={[theme.primaryDark, theme.primary, theme.info]}
                locations={[0, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: isDesktop ? 40 : isTablet ? 32 : 20,
                  minHeight: isDesktop ? 280 : isTablet ? 230 : 190,
                  flexDirection: "row",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.heroPill}>
                    <MaterialCommunityIcons
                      name="handshake-outline"
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text
                      style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}
                    >
                      Coordinate your impact
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "800",
                      letterSpacing: -0.8,
                      fontSize: isDesktop ? 40 : isTablet ? 32 : 24,
                      marginTop: 14,
                    }}
                  >
                    Mobilize meals.
                  </Text>
                  <Text
                    style={{
                      color: theme.secondary,
                      fontWeight: "800",
                      letterSpacing: -0.8,
                      fontSize: isDesktop ? 40 : isTablet ? 32 : 24,
                    }}
                  >
                    Reach more people.
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.86)",
                      fontSize: isMobile ? 12 : 15,
                      marginTop: 8,
                      marginBottom: 16,
                      maxWidth: 460,
                    }}
                  >
                    Manage campaigns, connect with donors, and mobilize
                    volunteers.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={goCreateCampaign}
                    style={[styles.heroCta, { backgroundColor: theme.secondary }]}
                  >
                    <Text
                      style={{
                        color: theme.textOnSecondary,
                        fontWeight: "700",
                      }}
                    >
                      Create campaign
                    </Text>
                    <View style={styles.heroCtaArrow}>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={theme.textOnSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {!isMobile && (
                  <View
                    style={{
                      width: isDesktop ? 200 : 140,
                      height: isDesktop ? 200 : 140,
                      borderRadius: 100,
                      backgroundColor: "rgba(255,255,255,0.11)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={isDesktop ? 90 : 64}
                      color="rgba(255,255,255,0.92)"
                    />
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Overview */}
            <Text
              style={[
                T.h3,
                { color: theme.text, marginTop: Spacing.five, marginBottom: 14 },
              ]}
            >
              Organization overview
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 12,
              }}
            >
              <Stat icon="megaphone-outline" label="Active campaigns" value="0" width={statWidth} />
              <Stat icon="people-outline" label="Partner donors" value="0" width={statWidth} />
              <Stat icon="walk-outline" label="Volunteers assigned" value="0" width={statWidth} />
              <Stat icon="cube-outline" label="Total distributed" value="0" width={statWidth} />
            </View>

            {/* Quick actions */}
            <Text
              style={[
                T.h3,
                { color: theme.text, marginTop: Spacing.five, marginBottom: 14 },
              ]}
            >
              What would you like to do?
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <QuickAction
                icon="megaphone-outline"
                label="Create campaign"
                onPress={goCreateCampaign}
              />
              <QuickAction
                icon="map-outline"
                label="Monitoring map"
                onPress={() => handleNavigate("Map")}
              />
              <QuickAction
                icon="stats-chart-outline"
                label="Community dashboard"
                onPress={() => handleNavigate("Dashboard")}
              />
              <QuickAction
                icon="person-outline"
                label="My profile"
                onPress={() => handleNavigate("Profile")}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {!isDesktop && (
        <BottomTabBar active={activeTab} onNavigate={handleNavigate} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 22,
  },
  sidebarItem: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  sidebarUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  heroWrap: {
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadows.card,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    ...Shadows.button,
  },
  heroCtaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    minHeight: 120,
    borderRadius: Radius.xl,
    padding: 18,
    borderWidth: 1,
    ...Shadows.card,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  quickTile: {
    flexGrow: 1,
    flexBasis: 170,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    ...Shadows.card,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: "#023047",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBarInner: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
  },
  tabIconPill: {
    width: 48,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
  tabFab: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    ...Shadows.button,
  },
});