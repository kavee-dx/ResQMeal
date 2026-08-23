import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

const ALL_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface AvailabilityFormState {
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE';
  availableDays: Day[];
  availableFrom: string; // "HH:mm"
  availableTo: string;   // "HH:mm"
}

// System-controlled — never edited by the volunteer, only displayed.
type CurrentDeliveryStatus = 'IDLE' | 'DELIVERY_ASSIGNED' | 'PICKING_UP' | 'IN_TRANSIT';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DELIVERY_STATUS_LABEL: Record<CurrentDeliveryStatus, string> = {
  IDLE: 'Not currently delivering',
  DELIVERY_ASSIGNED: 'Delivery assigned',
  PICKING_UP: 'Picking up',
  IN_TRANSIT: 'Delivery in progress',
};

export default function VolunteerAvailabilityScreen() {
  const [form, setForm] = useState<AvailabilityFormState>({
    availabilityStatus: 'UNAVAILABLE',
    availableDays: [],
    availableFrom: '16:00',
    availableTo: '22:00',
  });

  const [currentDeliveryStatus, setCurrentDeliveryStatus] =
    useState<CurrentDeliveryStatus>('IDLE');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // TODO(RESQ-132/133): replace with GET /api/volunteer/availability once
  // the data model + API exist, so the screen restores saved state instead
  // of resetting to defaults every time it opens.
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        // const response = await api.get('/volunteer-profile/availability');
        // setForm(response.data.availability);
        // setCurrentDeliveryStatus(response.data.currentDeliveryStatus);
      } catch (err) {
        Alert.alert('Error', 'Could not load your saved availability.');
      } finally {
        setLoading(false);
      }
    };
    loadAvailability();
  }, []);

  const isAvailable = form.availabilityStatus === 'AVAILABLE';

  const toggleDay = (day: Day) => {
    if (!isAvailable) return;
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const toggleAvailabilityStatus = (value: boolean) => {
    setForm((prev) => ({
      ...prev,
      availabilityStatus: value ? 'AVAILABLE' : 'UNAVAILABLE',
    }));
  };

  const validate = (): string | null => {
    if (isAvailable) {
      if (form.availableDays.length === 0) {
        return 'Select at least one available day.';
      }
      if (!TIME_REGEX.test(form.availableFrom) || !TIME_REGEX.test(form.availableTo)) {
        return 'Enter time in HH:mm format (e.g. 16:00).';
      }
      if (form.availableFrom >= form.availableTo) {
        return '"Available from" must be earlier than "available to".';
      }
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
      availabilityStatus: form.availabilityStatus,
      availableDays: form.availableDays,
      availableFrom: form.availableFrom,
      availableTo: form.availableTo,
    };

    setSaving(true);
    try {
      // TODO(RESQ-133): replace with the real Availability Update API call
      // once it exists, e.g.:
      // await api.patch('/volunteer-profile/availability', payload);
      console.log('Availability payload (stub):', payload);
      Alert.alert('Saved', 'Your availability has been updated.');
    } catch (err) {
      Alert.alert('Error', 'Could not save your availability. Please try again.');
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
      <Text style={styles.title}>Delivery Availability</Text>
      <Text style={styles.subtitle}>Manage when you're available for food deliveries.</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{isAvailable ? 'Available' : 'Unavailable'}</Text>
          <Switch value={isAvailable} onValueChange={toggleAvailabilityStatus} />
        </View>
        <Text style={styles.helperText}>
          {isAvailable
            ? "You may receive delivery requests."
            : "Your profile will not be considered for delivery matching."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Available Days</Text>
        <View style={styles.dayRow}>
          {ALL_DAYS.map((day) => {
            const selected = form.availableDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  selected && styles.dayChipSelected,
                  !isAvailable && styles.dayChipDisabled,
                ]}
                onPress={() => toggleDay(day)}
                disabled={!isAvailable}
              >
                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Available Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.timeFieldLabel}>From</Text>
            <TextInput
              style={[styles.timeInput, !isAvailable && styles.inputDisabled]}
              value={form.availableFrom}
              onChangeText={(text) => setForm((prev) => ({ ...prev, availableFrom: text }))}
              placeholder="16:00"
              keyboardType="numbers-and-punctuation"
              editable={isAvailable}
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.timeFieldLabel}>To</Text>
            <TextInput
              style={[styles.timeInput, !isAvailable && styles.inputDisabled]}
              value={form.availableTo}
              onChangeText={(text) => setForm((prev) => ({ ...prev, availableTo: text }))}
              placeholder="22:00"
              keyboardType="numbers-and-punctuation"
              editable={isAvailable}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Current Delivery Status</Text>
        <Text style={styles.readOnlyValue}>{DELIVERY_STATUS_LABEL[currentDeliveryStatus]}</Text>
        <Text style={styles.helperText}>This is controlled by the system, not editable here.</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Availability'}</Text>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  dayChipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  dayChipDisabled: {
    opacity: 0.4,
  },
  dayChipText: {
    color: '#333',
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 20,
  },
  timeField: {
    flex: 1,
  },
  timeFieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  inputDisabled: {
    backgroundColor: '#f2f2f2',
    color: '#999',
  },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2E7D32',
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