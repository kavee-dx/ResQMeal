import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Colors, Radius, Shadows, Spacing, Typography } from "../constants/theme";
import type { RootStackParamList } from "../navigation/types";
import {
  assignSuggestedVolunteer,
  getVolunteerSuggestions,
  type VolunteerSuggestion,
  type VolunteerSuggestionsResult,
} from "../services/dilshara-volunteerSuggestions.service";

type Props = NativeStackScreenProps<RootStackParamList, "VolunteerSuggestions">;
type FactorKey = keyof VolunteerSuggestion["breakdown"];

const FACTORS: { key: FactorKey; label: string }[] = [
  { key: "distance", label: "Distance" },
  { key: "area", label: "Preferred area" },
  { key: "time", label: "Availability" },
  { key: "urgency", label: "Urgency fit" },
];

function errorMessage(error: unknown, fallback: string): string {
  const responseMessage = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;
  return responseMessage || (error instanceof Error ? error.message : fallback);
}

function routeText(volunteer: VolunteerSuggestion): string {
  const distance =
    volunteer.locationPrecision === "APPROXIMATE"
      ? `~${Math.round(volunteer.routeDistanceKm)} km (approximate)`
      : `${volunteer.routeDistanceKm.toFixed(1)} km`;
  return distance;
}

function VolunteerCard({
  volunteer,
  busy,
  onAssign,
}: {
  volunteer: VolunteerSuggestion;
  busy: boolean;
  onAssign: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Ionicons name="bicycle-outline" size={22} color={Colors.light.primary} />
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{volunteer.displayName}</Text>
          <Text style={styles.meta}>
            {volunteer.vehicleType?.replaceAll("_", " ") || "Delivery volunteer"}
            {volunteer.preferredDeliveryArea
              ? ` · ${volunteer.preferredDeliveryArea}`
              : ""}
          </Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.score}>{Math.round(volunteer.score)}</Text>
          <Text style={styles.scoreLabel}>MATCH</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="navigate-outline" size={16} color={Colors.light.textSecondary} />
        <Text style={styles.routeText}>{routeText(volunteer)}</Text>
      </View>

      <View style={styles.factorGrid}>
        {FACTORS.map(({ key, label }) => (
          <View key={key} style={styles.factor}>
            <Text style={styles.factorLabel}>{label}</Text>
            <Text style={styles.factorValue}>
              {Math.round(volunteer.breakdown[key].score)}%
            </Text>
          </View>
        ))}
      </View>

      {volunteer.reasons.length > 0 && (
        <View style={styles.reasons}>
          {volunteer.reasons.slice(0, 3).map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={Colors.light.success}
              />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        disabled={busy}
        onPress={onAssign}
        style={[styles.assignButton, busy && styles.buttonDisabled]}
      >
        {busy ? (
          <ActivityIndicator color={Colors.light.textOnPrimary} />
        ) : (
          <Text style={styles.assignText}>Choose this volunteer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function VolunteerSuggestionsScreen({ route, navigation }: Props) {
  const { donationId } = route.params;
  const [result, setResult] = useState<VolunteerSuggestionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningVolunteerId, setAssigningVolunteerId] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(false);
  const [needsRecipient, setNeedsRecipient] = useState(false);
  // True when another donor action has already created an active assignment.
  const [alreadyAssigned, setAlreadyAssigned] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAlreadyAssigned(false);
    setNeedsRecipient(false);
    try {
      setResult(await getVolunteerSuggestions(donationId));
    } catch (loadError) {
      setResult(null);
      const code = (loadError as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "ALREADY_ASSIGNED") {
        setAlreadyAssigned(true);
      } else if (code === "REQUEST_NOT_FOUND") {
        setNeedsRecipient(true);
      } else {
        setError(errorMessage(loadError, "Could not load volunteer suggestions."));
      }
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useEffect(() => {
    load();
  }, [load]);

  const chooseVolunteer = async (volunteer: VolunteerSuggestion) => {
    setAssigningVolunteerId(volunteer.volunteerId);
    setError(null);
    try {
      await assignSuggestedVolunteer(donationId, volunteer.volunteerId);
      setAssigned(true);
    } catch (assignError) {
      setError(errorMessage(assignError, "Could not assign this volunteer."));
      if (
        (assignError as { response?: { status?: number } })?.response?.status === 409 ||
        (assignError as { response?: { status?: number } })?.response?.status === 422
      ) {
        await load();
      }
    } finally {
      setAssigningVolunteerId(null);
    }
  };

  const donation = result?.donation;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={21} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Suggested volunteers</Text>
          <Text style={styles.subtitle}>
            {donation?.foodType || "Choose a delivery volunteer"}
          </Text>
        </View>
      </View>

      {donation && (
        <View style={styles.deliverySummary}>
          <Ionicons name="location-outline" size={17} color={Colors.light.primary} />
          <Text style={styles.summaryText}>
            {donation.pickupDistrict || "Pickup area"} →{" "}
            {donation.dropoffDistrict || "Recipient area"}
          </Text>
          {donation.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          {!assigned && (
            <TouchableOpacity onPress={load} style={styles.retryButton}>
              <Text style={styles.retryText}>Refresh suggestions</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {assigned ? (
        <View style={styles.centerState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={Colors.light.success} />
          </View>
          <Text style={styles.stateTitle}>Volunteer assigned</Text>
          <Text style={styles.stateBody}>
            The volunteer has been offered the delivery. The assignment will continue
            through the volunteer delivery status flow.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate("MyDonations")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Continue</Text>
          </TouchableOpacity>
        </View>
      ) : alreadyAssigned ? (
        <View style={styles.centerState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={Colors.light.success} />
          </View>
          <Text style={styles.stateTitle}>A volunteer has already been selected</Text>
          <Text style={styles.stateBody}>
            This delivery is awaiting the selected volunteer's acceptance. You will
            be notified when they accept and start the pickup.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate("MyDonations")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Continue</Text>
          </TouchableOpacity>
        </View>
      ) : needsRecipient ? (
        <View style={styles.centerState}>
          <Ionicons name="people-outline" size={34} color={Colors.light.textMuted} />
          <Text style={styles.stateTitle}>Confirm a recipient first</Text>
          <Text style={styles.stateBody}>
            Volunteer matching starts after you choose a live recipient request
            and link it to this donation. No volunteer assignment has been made.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate("RecipientSuggestions", { donationId })}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Choose a recipient</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.stateBody}>Finding eligible volunteers…</Text>
        </View>
      ) : result?.volunteers.length ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            {result.eligibleCount} eligible volunteer
            {result.eligibleCount === 1 ? "" : "s"}, ranked by the matching score.
            Choose one to create the delivery assignment.
          </Text>
          {result.volunteers.map((volunteer) => (
            <VolunteerCard
              key={volunteer.volunteerId}
              volunteer={volunteer}
              busy={assigningVolunteerId !== null}
              onAssign={() => chooseVolunteer(volunteer)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.centerState}>
          <Ionicons name="people-outline" size={34} color={Colors.light.textMuted} />
          <Text style={styles.stateTitle}>No eligible volunteers right now</Text>
          <Text style={styles.stateBody}>
            You can refresh the list later. No assignment has been created.
          </Text>
          <TouchableOpacity onPress={load} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.light.surface,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.surfaceSoft,
  },
  headerText: { flex: 1 },
  title: { ...Typography.h2, color: Colors.light.text },
  subtitle: { ...Typography.bodySmall, color: Colors.light.textSecondary, marginTop: 2 },
  deliverySummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: Colors.light.surfaceSoft,
  },
  summaryText: { ...Typography.bodySmall, color: Colors.light.text, flex: 1 },
  urgentBadge: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.errorSoft,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  urgentText: { ...Typography.label, color: Colors.light.error, fontSize: 10 },
  list: { padding: Spacing.three, gap: Spacing.three },
  intro: { ...Typography.bodySmall, color: Colors.light.textSecondary, marginBottom: 2 },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Shadows.card,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.primarySoft,
    borderRadius: Radius.pill,
  },
  identity: { flex: 1 },
  name: { ...Typography.label, color: Colors.light.text },
  meta: { ...Typography.caption, color: Colors.light.textSecondary, marginTop: 3 },
  scoreBadge: {
    minWidth: 54,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.successSoft,
  },
  score: { ...Typography.h3, color: Colors.light.success },
  scoreLabel: { ...Typography.caption, color: Colors.light.success, fontSize: 9 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.three },
  routeText: { ...Typography.bodySmall, color: Colors.light.textSecondary },
  factorGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: Spacing.three },
  factor: { width: "50%", paddingVertical: 7 },
  factorLabel: { ...Typography.caption, color: Colors.light.textMuted },
  factorValue: { ...Typography.label, color: Colors.light.text, marginTop: 2 },
  reasons: { gap: 7, marginTop: Spacing.two },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  reasonText: { ...Typography.caption, color: Colors.light.textSecondary, flex: 1 },
  assignButton: {
    height: 46,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.three,
    backgroundColor: Colors.light.primary,
    ...Shadows.button,
  },
  buttonDisabled: { opacity: 0.7 },
  assignText: { ...Typography.button, color: Colors.light.textOnPrimary },
  centerState: {
    flex: 1,
    padding: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.successSoft,
    marginBottom: Spacing.three,
  },
  stateTitle: { ...Typography.h3, color: Colors.light.text, textAlign: "center", marginTop: Spacing.two },
  stateBody: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.two,
  },
  errorBox: {
    margin: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Colors.light.errorSoft,
    borderRadius: Radius.md,
  },
  errorText: { ...Typography.bodySmall, color: Colors.light.error },
  retryButton: { marginTop: Spacing.two, alignSelf: "flex-start" },
  retryText: { ...Typography.label, color: Colors.light.primary },
  secondaryButton: {
    minHeight: 44,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: Radius.md,
  },
  secondaryText: { ...Typography.button, color: Colors.light.primary },
});
