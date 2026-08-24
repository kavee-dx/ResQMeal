import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ProfileAvatar } from "@/components/dilshara-ProfileAvatar";
import { CommonProfileFields } from "@/components/dilshara-CommonProfileFields";
import { DonorProfileDetails } from "@/components/dilshara-DonorProfileDetails";
import { VolunteerProfileDetails } from "@/components/dilshara-VolunteerProfileDetails";
import {
  getMyProfile,
  updateMyProfile,
} from "@/services/dilshara-profileService";
import { uploadProfilePicture } from "@/services/dilshara-uploadService";
import type { AnyProfile } from "@/types/dilshara-profileTypes";
import { Colors, Radius, Spacing, Shadows } from "@/constants/theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setError(
          "Could not load your profile. Check your connection and try again.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(field: string, value: string) {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handlePickImage() {
    console.log("picker triggered");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePicture(result.assets[0].uri);
      const updated = await updateMyProfile({
        ...profile,
        profilePicture: url,
      });
      setProfile(updated);
    } catch (err) {
      console.error("Upload failed:", err);
      // TODO: show an error toast/message to the user
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    const updated = await updateMyProfile(profile);
    setProfile(updated);
    setIsEditing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <ThemedText type="default" themeColor="error">
          {error || "Profile not found."}
        </ThemedText>
      </View>
    );
  }

  // RESQ-71: restricted accounts can view their profile but can't edit it
  const isRestricted = profile.accountStatus === "restricted";

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {navigation.canGoBack() && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      )}
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" themeColor="text" style={styles.heading}>
          {profile.fullName || "My Profile"}
        </ThemedText>

        {!isEditing && (
          <TouchableOpacity
            onPress={() => setMenuOpen((prev) => !prev)}
            style={styles.menuButton}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={Colors.light.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {menuOpen && !isEditing && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("NotificationSettings");
            }}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={Colors.light.text}
            />
            <ThemedText type="default" style={styles.menuItemText}>
              Notification Settings
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("PrivacySettings");
            }}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Colors.light.text}
            />
            <ThemedText type="default" style={styles.menuItemText}>
              Privacy Settings
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("DeleteAccount");
            }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={Colors.light.error}
            />
            <ThemedText type="default" style={styles.menuItemText}>
              Delete Account
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {isRestricted && (
        <View style={styles.restrictedBanner}>
          <ThemedText type="default" themeColor="error">
            Your account is restricted. Profile editing is disabled — contact
            support for help.
          </ThemedText>
        </View>
      )}

      <View style={styles.card}>
        <ProfileAvatar
          uri={profile.profilePicture}
          isEditing={isEditing && !isRestricted}
          onPickImage={handlePickImage}
        />

        <CommonProfileFields
          profile={profile}
          isEditing={isEditing && !isRestricted}
          onChange={handleChange}
        />

        {profile.role === "DONOR" && (
          <DonorProfileDetails
            profile={profile}
            isEditing={isEditing && !isRestricted}
            onChange={handleChange}
          />
        )}

        {profile.role === "VOLUNTEER" && (
          <VolunteerProfileDetails
            profile={profile}
            isEditing={isEditing && !isRestricted}
            onChange={handleChange}
          />
        )}

        <TouchableOpacity
          style={[styles.button, isRestricted && styles.buttonDisabled]}
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={uploadingPhoto || isRestricted}
        >
          <ThemedText type="default" themeColor="textOnPrimary">
            {isEditing ? "Save Changes" : "Edit Profile"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
    flexGrow: 1,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.three,
  },
  heading: { color: Colors.light.text },
  menuButton: {
    padding: 6,
  },
  menuDropdown: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
    ...Shadows.card,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  menuItemText: {
    color: Colors.light.text,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    ...Shadows.card,
  },
  button: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: Colors.light.border,
  },
  restrictedBanner: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
});
