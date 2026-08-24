import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Typography, Spacing, Radius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../services/api";
import type { NotificationSettings } from "../types/amasha-notificationSettings";

type Props = NativeStackScreenProps<any, "NotificationSettings">;

const DEFAULT_SETTINGS: NotificationSettings = {
  nearbyFoodAlerts: true,
  requestUpdates: true,
  deliveryUpdates: true,
  expiryReminders: true,
  emailNotifications: false,
};

export default function NotificationSettingsScreen({ navigation }: Props) {
  const theme = useTheme();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotificationSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await getNotificationSettings();
        console.log("[NotificationSettings] load response:", res);
        if (mounted && res.success && res.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...res.data });
        }
      } catch (err) {
        console.error("Failed to load notification settings", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    console.log("[NotificationSettings] current settings:", settings);
  }, [settings]);

  async function toggle(field: keyof NotificationSettings) {
    console.log("[NotificationSettings] toggle called for", field, "current value:", settings[field]);
    const previous = settings;
    const next = { ...settings, [field]: !settings[field] };
    setSettings(next); // optimistic update
    setSaving(field);

    try {
      const res = await updateNotificationSettings(next);
      console.log("[NotificationSettings] save response:", res);
      if (!res.success) {
        setSettings(previous);
        Alert.alert("Couldn't save", res.message ?? "Please try again.");
      }
    } catch (err) {
      console.error("[NotificationSettings] save error:", err);
      setSettings(previous);
      Alert.alert("Couldn't save", "Please check your connection and try again.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const ROWS: {
    field: keyof NotificationSettings;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    description: string;
  }[] = [
    {
      field: "nearbyFoodAlerts",
      icon: "restaurant-outline",
      title: "Nearby Food Alerts",
      description: "Get notified when new surplus food is posted near you.",
    },
    {
      field: "requestUpdates",
      icon: "hand-left-outline",
      title: "Request Updates",
      description: "Get notified about the status of your food requests.",
    },
    {
      field: "deliveryUpdates",
      icon: "bicycle-outline",
      title: "Delivery Updates",
      description: "Get notified about pickup and delivery progress.",
    },
    {
      field: "expiryReminders",
      icon: "time-outline",
      title: "Expiry Reminders",
      description: "Get reminded before donated food is about to expire.",
    },
    {
      field: "emailNotifications",
      icon: "mail-outline",
      title: "Email Notifications",
      description: "Also receive these updates by email, not just in-app.",
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.four }}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: Spacing.three,
        }}
      >
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>

      <Text style={{ ...Typography.h2, color: theme.text, marginBottom: Spacing.one }}>
        Notification Settings
      </Text>
      <Text
        style={{
          ...Typography.body,
          color: theme.textSecondary,
          marginBottom: Spacing.four,
        }}
      >
        Choose which notifications you want to receive.
      </Text>

      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: Radius.lg,
          ...Shadows.card,
        }}
      >
        {ROWS.map((row, index) => (
          <View
            key={row.field}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: Spacing.three,
              paddingHorizontal: Spacing.three,
              borderBottomWidth: index < ROWS.length - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: theme.primaryLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: Spacing.three,
              }}
            >
              <Ionicons name={row.icon} size={17} color={theme.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.label, color: theme.text }}>
                {row.title}
              </Text>
              <Text
                style={{
                  ...Typography.bodySmall,
                  color: theme.textSecondary,
                  marginTop: 2,
                }}
              >
                {row.description}
              </Text>
            </View>

            {saving === row.field ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                testID={`switch-${row.field}`}
                value={Boolean(settings[row.field])}
                onValueChange={() => toggle(row.field)}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings[row.field] ? theme.primary : theme.surface}
              />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}