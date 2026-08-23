import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

interface DeliveryPreferencesFormState {
  preferredDeliveryArea: string;
  preferredDeliveryTime: string;
  maxDeliveryDistance: string; // kept as string for the input, parsed on save
}

export default function VolunteerDeliveryPreferencesScreen() {
  const [form, setForm] = useState<DeliveryPreferencesFormState>({
    preferredDeliveryArea: '',
    preferredDeliveryTime: '',
    maxDeliveryDistance: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // TODO(RESQ-137): replace with GET /api/volunteer-profile/delivery-preferences
  // once the API exists and this branch is merged with user-management, so the
  // screen restores saved values instead of opening blank every time.
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // const response = await api.get('/volunteer-profile/delivery-preferences');
        // setForm({
        //   preferredDeliveryArea: response.data.preferredDeliveryArea ?? '',
        //   preferredDeliveryTime: response.data.preferredDeliveryTime ?? '',
        //   maxDeliveryDistance: response.data.maxDeliveryDistance?.toString() ?? '',
        // });
      } catch (err) {
        Alert.alert('Error', 'Could not load your saved delivery preferences.');
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const validate = (): string | null => {
    if (!form.preferredDeliveryArea.trim()) {
      return 'Enter your preferred delivery area.';
    }
    if (!form.preferredDeliveryTime.trim()) {
      return 'Enter your preferred delivery time.';
    }
    const distance = Number(form.maxDeliveryDistance);
    if (!Number.isFinite(distance) || distance <= 0) {
      return 'Enter a valid maximum delivery distance.';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Check your input', error);
      return;
    }

    const payload = {
      preferredDeliveryArea: form.preferredDeliveryArea.trim(),
      preferredDeliveryTime: form.preferredDeliveryTime.trim(),
      maxDeliveryDistance: Number(form.maxDeliveryDistance),
    };

    setSaving(true);
    try {
      // TODO(RESQ-137): replace with the real Delivery Preferences Update API
      // call once it exists, e.g.:
      // await api.patch('/volunteer-profile/delivery-preferences', payload);
      console.log('Delivery preferences payload (stub):', payload);
      Alert.alert('Saved', 'Your delivery preferences have been updated.');
    } catch (err) {
      Alert.alert('Error', 'Could not save your delivery preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Delivery Preferences</Text>
      <Text style={styles.subtitle}>
        Tell us the conditions you prefer for delivery requests.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Preferred Delivery Area</Text>
        <TextInput
          style={styles.input}
          value={form.preferredDeliveryArea}
          onChangeText={(text) =>
            setForm((prev) => ({ ...prev, preferredDeliveryArea: text }))
          }
          placeholder="e.g. Malabe, Kaduwela"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Preferred Delivery Time</Text>
        <TextInput
          style={styles.input}
          value={form.preferredDeliveryTime}
          onChangeText={(text) =>
            setForm((prev) => ({ ...prev, preferredDeliveryTime: text }))
          }
          placeholder="e.g. 4PM - 10PM"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Maximum Delivery Distance (km)</Text>
        <TextInput
          style={styles.input}
          value={form.maxDeliveryDistance}
          onChangeText={(text) =>
            setForm((prev) => ({
              ...prev,
              maxDeliveryDistance: text.replace(/[^0-9.]/g, ''),
            }))
          }
          keyboardType="numeric"
          placeholder="e.g. 5"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});