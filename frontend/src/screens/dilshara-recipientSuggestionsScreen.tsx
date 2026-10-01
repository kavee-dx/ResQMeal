// frontend/src/screens/dilshara-recipientSuggestionsScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Colors, Spacing, Typography } from "@/constants/theme";

import type { RootStackParamList } from "../navigation/types";
import RecipientCriteriaTabs from "../components/dilshara-RecipientCriteriaTabs";
import RecipientSuggestionCard from "../components/dilshara-RecipientSuggestionCard";
import RecipientDetailsModal from "../components/dilshara-RecipientDetailsModal";
import {
  getRecipientSuggestions,
  type RecipientSuggestion,
  type SuggestionCriteria,
} from "../services/dilshara-recipientSuggestionService";
type Props = NativeStackScreenProps<RootStackParamList, "RecipientSuggestions">;

export default function RecipientSuggestionsScreen({ route, navigation }: Props) {
  const { donationId } = route.params;

  const [selectedCriteria, setSelectedCriteria] = useState<SuggestionCriteria>("smart");
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecipientSuggestion | null>(null);

  // Ignores late responses if the donor switches tabs quickly.
  const requestSeq = useRef(0);

  const load = useCallback(
    async (criteria: SuggestionCriteria) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const data = await getRecipientSuggestions(donationId, criteria);
        if (seq !== requestSeq.current) return;
        setSuggestions(data);
      } catch (e: any) {
        if (seq !== requestSeq.current) return;
        setSuggestions([]);
        setError(e?.response?.data?.message ?? "Could not load suggestions. Please try again.");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [donationId],
  );

  useEffect(() => {
    load(selectedCriteria);
  }, [selectedCriteria, load]);

  const handleSuggest = (item: RecipientSuggestion) => {
    // TODO: hand item.requestId (and optionally item.recipientId) to the
    // teammate's flow once the endpoint/action is agreed.
    console.log("Suggest Recipient ->", { donationId, requestId: item.requestId });
    setSelectedItem(null);
    Alert.alert("Recipient selected", `${item.displayName} has been selected for this donation.`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recipient Suggestions</Text>
      </View>

      {/* Tabs stay mounted; only the list below reloads */}
      <RecipientCriteriaTabs selected={selectedCriteria} onSelect={setSelectedCriteria} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load(selectedCriteria)}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.requestId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecipientSuggestionCard item={item} onViewDetails={setSelectedItem} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No matching requests right now.</Text>
            </View>
          }
        />
      )}

      <RecipientDetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSuggest={handleSuggest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingTop: Spacing.six, paddingHorizontal: Spacing.three },
  back: { ...Typography.label, color: Colors.light.primary, marginBottom: Spacing.two },
  title: { ...Typography.h2, color: Colors.light.text },
  list: { padding: Spacing.three },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.five },
  empty: { ...Typography.body, color: Colors.light.textSecondary },
  errorText: { ...Typography.body, color: Colors.light.error, textAlign: "center" },
  retry: { ...Typography.button, color: Colors.light.primary, marginTop: Spacing.three },
});