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
import { getPrivacySettings, updatePrivacySettings } from "../services/api";
import type { PrivacySettings } from "../types/amasha-privacySettings";

type Props = NativeStackScreenProps<any, "PrivacySettings">;

const DEFAULT_SETTINGS: PrivacySettings = {
  profileVisible: true,
  showLocation: true,
  showDonationHistory: false,
  showContactInfo: false,
};

export default function PrivacySettingsScreen({ navigation }: Props) {
  const theme = useTheme();

  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof PrivacySettings | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await getPrivacySettings();
        console.log("[PrivacySettings] load response:", res);
        if (mounted && res.success && res.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...res.data });
        }
      } catch (err) {
        console.error("Failed to load privacy settings", err);
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
    console.log("[PrivacySettings] current settings:", settings);
  }, [settings]);

  async function toggle(field: keyof PrivacySettings) {
    console.log("[PrivacySettings] toggle called for", field, "current value:", settings[field]);
    const previous = settings;
    const next = { ...settings, [field]: !settings[field] };
    setSettings(next); // optimistic update
    setSaving(field);

    try {
      const res = await updatePrivacySettings(next);
      console.log("[PrivacySettings] save response:", res);
      if (!res.success) {
        setSettings(previous);
        Alert.alert("Couldn't save", res.message ?? "Please try again.");
      }
    } catch (err) {
      console.error("[PrivacySettings] save error:", err);
      setSettings(previous);
      Alert.alert(
        "Couldn't save",
        "Please check your connection and try again.",
      );
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
    field: keyof PrivacySettings;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    description: string;
  }[] = [
    {
      field: "profileVisible",
      icon: "person-circle-outline",
      title: "Public Profile",
      description: "Let other users view your profile.",
    },
    {
      field: "showLocation",
      icon: "location-outline",
      title: "Show Location",
      description: "Display your approximate location on donations/requests.",
    },
    {
      field: "showDonationHistory",
      icon: "time-outline",
      title: "Show Donation History",
      description: "Let others see your past donations or requests.",
    },
    {
      field: "showContactInfo",
      icon: "call-outline",
      title: "Show Contact Info",
      description: "Allow matched users to see your phone/email.",
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

      <Text
        style={{
          ...Typography.h2,
          color: theme.text,
          marginBottom: Spacing.one,
        }}
      >
        Privacy Settings
      </Text>
      <Text
        style={{
          ...Typography.body,
          color: theme.textSecondary,
          marginBottom: Spacing.four,
        }}
      >
        Control what other users can see about you.
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