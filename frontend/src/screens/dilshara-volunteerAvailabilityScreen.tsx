import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';

type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

const ALL_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface AvailabilityFormState {
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE';
  availableDays: Day[];
  availableFrom: string; // "HH:mm"
  availableTo: string;   // "HH:mm"
  maxDeliveryDistance: string; // kept as string for the input, parsed on save
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function VolunteerAvailabilityScreen() {
  const [form, setForm] = useState<AvailabilityFormState>({
    availabilityStatus: 'UNAVAILABLE',
    availableDays: [],
    availableFrom: '16:00',
    availableTo: '22:00',
    maxDeliveryDistance: '5',
  });

  const [saving, setSaving] = useState(false);

  const toggleDay = (day: Day) => {
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
    if (form.availabilityStatus === 'AVAILABLE') {
      if (form.availableDays.length === 0) {
        return 'Select at least one available day.';
      }
      if (!TIME_REGEX.test(form.availableFrom) || !TIME_REGEX.test(form.availableTo)) {
        return 'Enter time in HH:mm format (e.g. 16:00).';
      }
      if (form.availableFrom >= form.availableTo) {
        return '"Available from" must be earlier than "available to".';
      }
      const distance = Number(form.maxDeliveryDistance);
      if (!Number.isFinite(distance) || distance <= 0) {
        return 'Enter a valid maximum delivery distance.';
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
      maxDeliveryDistance: Number(form.maxDeliveryDistance),
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Availability</Text>

      <View style={styles.row}>
        <Text style={styles.label}>
          {form.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Unavailable'}
        </Text>
        <Switch
          value={form.availabilityStatus === 'AVAILABLE'}
          onValueChange={toggleAvailabilityStatus}
        />
      </View>

      <Text style={styles.sectionLabel}>Available Days</Text>
      <View style={styles.dayRow}>
        {ALL_DAYS.map((day) => {
          const selected = form.availableDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
              onPress={() => toggleDay(day)}
            >
              <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Available Time</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={styles.timeInput}
          value={form.availableFrom}
          onChangeText={(text) => setForm((prev) => ({ ...prev, availableFrom: text }))}
          placeholder="16:00"
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.timeSeparator}>to</Text>
        <TextInput
          style={styles.timeInput}
          value={form.availableTo}
          onChangeText={(text) => setForm((prev) => ({ ...prev, availableTo: text }))}
          placeholder="22:00"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <Text style={styles.sectionLabel}>Maximum Delivery Distance (km)</Text>
      <TextInput
        style={styles.distanceInput}
        value={form.maxDeliveryDistance}
        onChangeText={(text) =>
          setForm((prev) => ({ ...prev, maxDeliveryDistance: text.replace(/[^0-9.]/g, '') }))
        }
        keyboardType="numeric"
        placeholder="5"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
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
  dayChipText: {
    color: '#333',
    fontWeight: '500',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 90,
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 12,
    color: '#666',
  },
  distanceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 100,
  },
  saveButton: {
    marginTop: 28,
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