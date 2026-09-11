import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Radius, Shadows, Spacing } from "@/constants/theme";
import adminApi from "../services/amasha-adminApi";
import {
  clearAdminSession,
  getAdminSession,
} from "../utils/amasha-admin-authStorage";
import { useAppTypography } from "../hooks/kaveesha-useAppTypography";
import type { RootStackParamList } from "../navigation/types";

const WARNING = "#E0A526";
const WARNING_SOFT = "#FBF1DC";

type Props = NativeStackScreenProps<RootStackParamList, "AdminDashboard">;

type PendingEntry = {
  user: {
    _id: string;
    fullName?: string;
    email?: string;
    phoneNumber: string;
    role: "DONOR" | "RECIPIENT" | "NGO" | "VOLUNTEER";
    district: string;
    city: string;
    createdAt: string;
  };
  profile: Record<string, any> | null;
};

const ROLE_FILTERS = ["ALL", "DONOR", "RECIPIENT", "NGO", "VOLUNTEER"] as const;

function profileFields(
  entry: PendingEntry,
): { label: string; value: string }[] {
  const { user, profile } = entry;

  const fields: { label: string; value: string }[] = [
    {
      label: "Phone",
      value: user.phoneNumber,
    },
    {
      label: "Location",
      value: `${user.city}, ${user.district}`,
    },
  ];

  if (!profile) return fields;

  if (user.role === "NGO") {
    fields.push(
      {
        label: "Organization",
        value: profile.organizationName ?? "—",
      },
      {
        label: "Registration no.",
        value: profile.ngoRegistrationNumber ?? "—",
      },
      {
        label: "Type",
        value:
          profile.specifiedOrganizationType ?? profile.organizationType ?? "—",
      },
      {
        label: "Authorized person",
        value: profile.authorizedPerson ?? "—",
      },
      {
        label: "Position",
        value: profile.position ?? "—",
      },
    );

    if (profile.website) {
      fields.push({
        label: "Website",
        value: profile.website,
      });
    }
  } else if (user.role === "DONOR") {
    fields.push(
      {
        label: "Donor type",
        value: profile.specifiedDonorType ?? profile.donorType ?? "—",
      },
      {
        label: "Business name",
        value: profile.businessName ?? "—",
      },
      {
        label: "Registration no.",
        value: profile.businessRegistrationNumber ?? "—",
      },
    );
  } else if (user.role === "RECIPIENT") {
    fields.push(
      {
        label: "Recipient type",
        value: profile.specifiedRecipientType ?? profile.recipientType ?? "—",
      },
      {
        label: "Organization",
        value: profile.organizationName ?? user.fullName ?? "—",
      },
      {
        label: "People needing food",
        value: String(profile.peopleNeedingFood ?? "—"),
      },
      {
        label: "Food requirements",
        value: (profile.foodRequirements ?? []).join(", ") || "—",
      },
    );
  } else if (user.role === "VOLUNTEER") {
    fields.push(
      {
        label: "Vehicle type",
        value: profile.vehicleType ?? "—",
      },
      {
        label: "Vehicle number",
        value: profile.vehicleNumber ?? "—",
      },
      {
        label: "Delivery area",
        value: profile.preferredDeliveryArea ?? "—",
      },
    );
  }

  return fields;
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const theme = Colors.light;
  const T = useAppTypography();

  const [adminName, setAdminName] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<(typeof ROLE_FILTERS)[number]>("ALL");

  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actingId, setActingId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getAdminSession().then(({ fullName }) => {
      setAdminName(fullName ?? "Admin");
    });
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const response = await adminApi.get("/admin/users/pending", {
        params: roleFilter !== "ALL" ? { role: roleFilter } : undefined,
      });

      setEntries(response.data?.results ?? []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        Alert.alert("Session expired", "Please log in again.");

        navigation.reset({
          index: 0,
          routes: [{ name: "AdminLogin" }],
        });

        return;
      }

      Alert.alert("Error", "Could not load pending requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, navigation]);

  useEffect(() => {
    setLoading(true);
    fetchPending();
  }, [fetchPending]);

  async function handleApprove(id: string) {
    setActingId(id);

    try {
      await adminApi.post(`/admin/users/${id}/approve`);

      setEntries((prev) => prev.filter((e) => e.user._id !== id));

      Alert.alert("Approved", "The user has been notified by email.");
    } catch {
      Alert.alert("Error", "Could not approve this user. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);

    try {
      await adminApi.post(`/admin/users/${id}/reject`, {
        reason: rejectReason.trim() || undefined,
      });

      setEntries((prev) => prev.filter((e) => e.user._id !== id));

      setRejectingId(null);
      setRejectReason("");

      Alert.alert("Rejected", "The user has been notified by email.");
    } catch {
      Alert.alert("Error", "Could not reject this user. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  async function handleLogout() {
    await clearAdminSession();

    navigation.reset({
      index: 0,
      routes: [{ name: "AdminLogin" }],
    });
  }

  const roleCounts = useMemo(() => {
    return {
      all: entries.length,
      donor: entries.filter((e) => e.user.role === "DONOR").length,
      recipient: entries.filter((e) => e.user.role === "RECIPIENT").length,
      ngo: entries.filter((e) => e.user.role === "NGO").length,
      volunteer: entries.filter((e) => e.user.role === "VOLUNTEER").length,
    };
  }, [entries]);

  function getRoleIcon(role: PendingEntry["user"]["role"]) {
    switch (role) {
      case "DONOR":
        return "restaurant-outline";
      case "RECIPIENT":
        return "people-outline";
      case "NGO":
        return "business-outline";
      case "VOLUNTEER":
        return "car-outline";
      default:
        return "person-outline";
    }
  }

  function getRoleColor(role: PendingEntry["user"]["role"]) {
    switch (role) {
      case "DONOR":
        return theme.primary;
      case "RECIPIENT":
        return "#5B7CFA";
      case "NGO":
        return "#8B5CF6";
      case "VOLUNTEER":
        return "#0EA5A4";
      default:
        return theme.textSecondary;
    }
  }

  function renderSidebar() {
    if (!sidebarOpen) return null;

    return (
      <>
        {/* Overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            zIndex: 20,
          }}
        />

        {/* Sidebar */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 285,
            backgroundColor: theme.formBackground,
            zIndex: 21,
            paddingTop: 55,
            paddingHorizontal: 20,
            ...Shadows.card,
          }}
        >
          {/* Brand */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 35,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={25}
                color={theme.textOnPrimary}
              />
            </View>

            <View>
              <Text
                style={{
                  ...T.h3,
                  color: theme.text,
                }}
              >
                ResQMeal
              </Text>

              <Text
                style={{
                  ...T.caption,
                  color: theme.textSecondary,
                  marginTop: 2,
                }}
              >
                Admin Panel
              </Text>
            </View>
          </View>

          {/* Admin profile */}
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: Radius.lg,
              padding: 14,
              marginBottom: 25,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: theme.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 11,
                }}
              >
                <Ionicons name="person" size={20} color={theme.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    ...T.body,
                    color: theme.text,
                    fontWeight: "700",
                  }}
                >
                  {adminName || "Admin"}
                </Text>

                <Text
                  style={{
                    ...T.caption,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Administrator
                </Text>
              </View>
            </View>
          </View>

          {/* Navigation */}
          <Text
            style={{
              ...T.caption,
              color: theme.textSecondary,
              marginBottom: 10,
              marginLeft: 4,
              letterSpacing: 0.8,
            }}
          >
            MAIN MENU
          </Text>

          <TouchableOpacity
            onPress={() => setSidebarOpen(false)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.primaryLight,
              borderRadius: Radius.md,
              paddingVertical: 13,
              paddingHorizontal: 13,
              marginBottom: 8,
            }}
          >
            <Ionicons name="grid-outline" size={20} color={theme.primary} />

            <Text
              style={{
                ...T.body,
                color: theme.primary,
                fontWeight: "700",
                marginLeft: 13,
              }}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSidebarOpen(false)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 13,
              paddingHorizontal: 13,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={theme.textSecondary}
            />

            <Text
              style={{
                ...T.body,
                color: theme.textSecondary,
                marginLeft: 13,
              }}
            >
              User Verification
            </Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 13,
              paddingHorizontal: 13,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="analytics-outline"
              size={20}
              color={theme.textSecondary}
            />

            <Text
              style={{
                ...T.body,
                color: theme.textSecondary,
                marginLeft: 13,
              }}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 13,
              paddingHorizontal: 13,
            }}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={theme.textSecondary}
            />

            <Text
              style={{
                ...T.body,
                color: theme.textSecondary,
                marginLeft: 13,
              }}
            >
              Settings
            </Text>
          </TouchableOpacity> */}

          <View style={{ flex: 1 }} />

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 15,
              paddingHorizontal: 13,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <Ionicons name="log-out-outline" size={21} color={theme.error} />

            <Text
              style={{
                ...T.body,
                color: theme.error,
                fontWeight: "600",
                marginLeft: 13,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderStatCard(
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    value: number,
    subtitle: string,
  ) {
    return (
      <View
        style={{
          width: 155,
          backgroundColor: theme.formBackground,
          borderRadius: Radius.lg,
          padding: 16,
          marginRight: 12,
          borderWidth: 1,
          borderColor: theme.border,
          ...Shadows.card,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: theme.primaryLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>

        <Text
          style={{
            fontSize: 25,
            fontWeight: "800",
            color: theme.text,
          }}
        >
          {value}
        </Text>

        <Text
          style={{
            ...T.bodySmall,
            color: theme.text,
            fontWeight: "700",
            marginTop: 3,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            ...T.caption,
            color: theme.textSecondary,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
    );
  }

  function renderItem({ item }: { item: PendingEntry }) {
    const id = item.user._id;
    const isExpanded = expandedId === id;
    const isRejecting = rejectingId === id;
    const isActing = actingId === id;

    const title =
      item.profile?.organizationName ??
      item.profile?.businessName ??
      item.user.fullName ??
      item.user.email ??
      "Unnamed applicant";

    const roleColor = getRoleColor(item.user.role);

    return (
      <View
        style={{
          backgroundColor: theme.formBackground,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: isExpanded ? theme.primary : theme.border,
          marginBottom: 14,
          overflow: "hidden",
          ...Shadows.card,
        }}
      >
        {/* Card header */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setExpandedId(isExpanded ? null : id)}
          style={{
            padding: 17,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              backgroundColor: `${roleColor}18`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 13,
            }}
          >
            <Ionicons
              name={getRoleIcon(item.user.role)}
              size={22}
              color={roleColor}
            />
          </View>

          {/* Applicant info */}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                ...T.h3,
                color: theme.text,
                fontSize: 16,
              }}
            >
              {title}
            </Text>

            <Text
              numberOfLines={1}
              style={{
                ...T.caption,
                color: theme.textSecondary,
                marginTop: 3,
              }}
            >
              {item.user.email ?? item.user.phoneNumber}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: `${roleColor}18`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: Radius.pill ?? 999,
                  marginRight: 7,
                }}
              >
                <Text
                  style={{
                    ...T.caption,
                    color: roleColor,
                    fontWeight: "700",
                  }}
                >
                  {item.user.role}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: WARNING_SOFT,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: Radius.pill ?? 999,
                }}
              >
                <Text
                  style={{
                    ...T.caption,
                    color: WARNING,
                    fontWeight: "700",
                  }}
                >
                  Pending
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: theme.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              padding: 17,
              paddingTop: 15,
            }}
          >
            {/* Details */}
            <Text
              style={{
                ...T.bodySmall,
                color: theme.textSecondary,
                fontWeight: "700",
                marginBottom: 12,
                letterSpacing: 0.5,
              }}
            >
              APPLICANT DETAILS
            </Text>

            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: Radius.md,
                padding: 13,
                marginBottom: 14,
              }}
            >
              {profileFields(item).map((field, index) => (
                <View
                  key={field.label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 7,
                    borderBottomWidth:
                      index === profileFields(item).length - 1 ? 0 : 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      ...T.bodySmall,
                      color: theme.textSecondary,
                    }}
                  >
                    {field.label}
                  </Text>

                  <Text
                    style={{
                      ...T.bodySmall,
                      color: theme.text,
                      maxWidth: "58%",
                      textAlign: "right",
                      fontWeight: "600",
                    }}
                  >
                    {field.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Reject form */}
            {isRejecting ? (
              <View>
                <Text
                  style={{
                    ...T.bodySmall,
                    color: theme.text,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  REJECTION REASON
                </Text>

                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Enter reason for rejection (optional)"
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  style={{
                    ...T.bodySmall,
                    color: theme.inputText,
                    backgroundColor: theme.inputBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: Radius.md,
                    padding: 12,
                    minHeight: 75,
                    textAlignVertical: "top",
                    marginBottom: 10,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    style={{
                      flex: 1,
                      marginRight: 8,
                      minHeight: 46,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        ...T.button,
                        color: theme.textSecondary,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleReject(id)}
                    disabled={isActing}
                    style={{
                      flex: 1,
                      minHeight: 46,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: Radius.md,
                      backgroundColor: theme.error,
                      opacity: isActing ? 0.7 : 1,
                    }}
                  >
                    {isActing ? (
                      <ActivityIndicator color={theme.textOnPrimary} />
                    ) : (
                      <Text
                        style={{
                          ...T.button,
                          color: theme.textOnPrimary,
                        }}
                      >
                        Confirm Reject
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Action buttons */
              <View
                style={{
                  flexDirection: "row",
                }}
              >
                <TouchableOpacity
                  onPress={() => setRejectingId(id)}
                  disabled={isActing}
                  style={{
                    flex: 1,
                    marginRight: 8,
                    minHeight: 46,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: theme.error,
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={theme.error}
                    style={{
                      marginRight: 6,
                    }}
                  />

                  <Text
                    style={{
                      ...T.button,
                      color: theme.error,
                    }}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleApprove(id)}
                  disabled={isActing}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: Radius.md,
                    backgroundColor: theme.success,
                    opacity: isActing ? 0.7 : 1,
                  }}
                >
                  {isActing ? (
                    <ActivityIndicator color={theme.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={theme.textOnPrimary}
                        style={{
                          marginRight: 6,
                        }}
                      />

                      <Text
                        style={{
                          ...T.button,
                          color: theme.textOnPrimary,
                        }}
                      >
                        Approve
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      {/* Main dashboard */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPending();
            }}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingTop: 55,
            paddingHorizontal: 20,
            paddingBottom: 22,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              backgroundColor: theme.formBackground,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="menu-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              marginLeft: 13,
            }}
          >
            <Text
              style={{
                ...T.caption,
                color: theme.textSecondary,
              }}
            >
              Welcome back,
            </Text>

            <Text
              numberOfLines={1}
              style={{
                ...T.h2,
                color: theme.text,
                marginTop: 2,
              }}
            >
              {adminName || "Admin"}
            </Text>
          </View>

          {/* <TouchableOpacity
            onPress={handleLogout}
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              backgroundColor:
                theme.formBackground,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color={theme.textSecondary}
            />
          </TouchableOpacity> */}
        </View>

        {/* Hero */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 22,
            backgroundColor: theme.primary,
            borderRadius: Radius.xl ?? 22,
            padding: 20,
            overflow: "hidden",
            ...Shadows.card,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...T.h2,
                  color: theme.textOnPrimary,
                  fontSize: 22,
                }}
              >
                Verification Center
              </Text>

              <Text
                style={{
                  ...T.bodySmall,
                  color: theme.textOnPrimary,
                  opacity: 0.85,
                  marginTop: 6,
                  lineHeight: 20,
                }}
              >
                Review and manage pending user registrations.
              </Text>
            </View>

            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={31}
                color={theme.textOnPrimary}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: Radius.pill ?? 999,
                paddingHorizontal: 11,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: theme.textOnPrimary,
                  marginRight: 7,
                }}
              />

              <Text
                style={{
                  ...T.caption,
                  color: theme.textOnPrimary,
                  fontWeight: "700",
                }}
              >
                {entries.length} pending
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View
          style={{
            paddingLeft: 20,
            marginBottom: 25,
          }}
        >
          <Text
            style={{
              ...T.h3,
              color: theme.text,
              marginBottom: 13,
            }}
          >
            Overview
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderStatCard(
              "time-outline",
              "Pending",
              roleCounts.all,
              "All requests",
            )}

            {renderStatCard(
              "restaurant-outline",
              "Donors",
              roleCounts.donor,
              "Awaiting review",
            )}

            {renderStatCard(
              "people-outline",
              "Recipients",
              roleCounts.recipient,
              "Awaiting review",
            )}

            {renderStatCard(
              "business-outline",
              "NGOs",
              roleCounts.ngo,
              "Awaiting review",
            )}

            {renderStatCard(
              "car-outline",
              "Volunteers",
              roleCounts.volunteer,
              "Awaiting review",
            )}
          </ScrollView>
        </View>

        {/* Requests section */}
        <View
          style={{
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 13,
            }}
          >
            <View>
              <Text
                style={{
                  ...T.h3,
                  color: theme.text,
                }}
              >
                Verification Requests
              </Text>

              <Text
                style={{
                  ...T.caption,
                  color: theme.textSecondary,
                  marginTop: 3,
                }}
              >
                Review applicant information
              </Text>
            </View>

            <View
              style={{
                backgroundColor: WARNING_SOFT,
                borderRadius: Radius.pill ?? 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text
                style={{
                  ...T.caption,
                  color: WARNING,
                  fontWeight: "700",
                }}
              >
                {entries.length} Pending
              </Text>
            </View>
          </View>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              marginBottom: 17,
            }}
          >
            {ROLE_FILTERS.map((role) => {
              const active = role === roleFilter;

              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => setRoleFilter(role)}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 9,
                    borderRadius: Radius.pill ?? 999,
                    backgroundColor: active
                      ? theme.primary
                      : theme.formBackground,
                    borderWidth: 1,
                    borderColor: active ? theme.primary : theme.border,
                    marginRight: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {role !== "ALL" && (
                    <Ionicons
                      name={getRoleIcon(role as PendingEntry["user"]["role"])}
                      size={15}
                      color={active ? theme.textOnPrimary : theme.textSecondary}
                      style={{
                        marginRight: 6,
                      }}
                    />
                  )}

                  <Text
                    style={{
                      ...T.bodySmall,
                      color: active ? theme.textOnPrimary : theme.text,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {role === "ALL"
                      ? "All"
                      : role.charAt(0) + role.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Loading */}
          {loading ? (
            <View
              style={{
                height: 300,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.primary} />

              <Text
                style={{
                  ...T.bodySmall,
                  color: theme.textSecondary,
                  marginTop: 12,
                }}
              >
                Loading requests...
              </Text>
            </View>
          ) : entries.length === 0 ? (
            /* Empty state */
            <View
              style={{
                minHeight: 300,
                backgroundColor: theme.formBackground,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                padding: 30,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 25,
                  backgroundColor: theme.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="checkmark-done"
                  size={35}
                  color={theme.primary}
                />
              </View>

              <Text
                style={{
                  ...T.h3,
                  color: theme.text,
                  textAlign: "center",
                }}
              >
                All caught up!
              </Text>

              <Text
                style={{
                  ...T.bodySmall,
                  color: theme.textSecondary,
                  textAlign: "center",
                  marginTop: 7,
                  lineHeight: 20,
                }}
              >
                There are no pending verification requests for this filter.
              </Text>
            </View>
          ) : (
            <View>
              {entries.map((entry) => (
                <View key={entry.user._id}>
                  {renderItem({
                    item: entry,
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 35 }} />
      </ScrollView>

      {/* Sidebar */}
      {renderSidebar()}
    </View>
  );
}
