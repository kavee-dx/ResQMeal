import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, Alert } from 'react-native';
import { Colors, Spacing, Radius, Typography, ComponentSizes } from '@/constants/theme';

type Urgency = 'URGENT' | 'NORMAL';

const FOOD_TYPE_OPTIONS: { label: string; icon: string }[] = [
  { label: 'Rice', icon: '🍚' },
  { label: 'Fruits', icon: '🍎' },
  { label: 'Veg', icon: '🥦' },
  { label: 'Water', icon: '💧' },
];

interface Props {
  navigation?: any;
}

export default function FoodRequestScreen({ navigation }: Props) {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const toggleFoodType = (label: string) => {
    setFoodTypes((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  };

  const validate = () => {
    const nextErrors: { [key: string]: string } = {};
    if (foodTypes.length === 0) nextErrors.foodTypes = 'Select at least one food type';
    if (!quantity.trim()) nextErrors.quantity = 'Quantity is required';
    if (!location.trim()) nextErrors.location = 'Location is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Wire this to your real API base URL. See the matching backend route
      // at backend/src/routes/dushani-foodRequestRoutes.js.
      const response = await fetch('/api/recipient/food-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodType: foodTypes.join(', '), quantity, location, details, urgency }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      Alert.alert('Request submitted', 'Your food request has been posted.');
      navigation?.navigate?.('RequestStatus');
    } catch (error) {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ padding: Spacing.three }}
    >
      <Text style={[styles.title, { color: theme.text }]}>Create Request</Text>

      <Text style={[styles.label, { color: theme.text }]}>Food Type</Text>
      <View style={styles.foodTypeGrid}>
        {FOOD_TYPE_OPTIONS.map((option) => {
          const isActive = foodTypes.includes(option.label);
          return (
            <TouchableOpacity
              key={option.label}
              onPress={() => toggleFoodType(option.label)}
              style={[
                styles.foodTypeBox,
                {
                  backgroundColor: isActive ? theme.primary : theme.surfaceSoft,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={styles.foodTypeIcon}>{option.icon}</Text>
              <Text style={[styles.foodTypeLabel, { color: isActive ? theme.textOnPrimary : theme.textSecondary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.foodTypes && <Text style={[styles.errorText, { color: theme.error }]}>{errors.foodTypes}</Text>}

      <Field
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        theme={theme}
        error={errors.quantity}
        placeholder="e.g. 5 kg"
      />

      <Text style={[styles.label, { color: theme.text }]}>Urgency</Text>
      <View style={styles.urgencyRow}>
        {(['URGENT', 'NORMAL'] as Urgency[]).map((level) => {
          const isActive = urgency === level;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => setUrgency(level)}
              style={[
                styles.urgencyChip,
                {
                  backgroundColor: isActive ? theme.primary : theme.surfaceSoft,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.urgencyChipText, { color: isActive ? theme.textOnPrimary : theme.textSecondary }]}>
                {level === 'URGENT' ? 'Urgent (within 5 hours)' : 'Normal (5+ hours)'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field
        label="Location"
        value={location}
        onChangeText={setLocation}
        theme={theme}
        error={errors.location}
        placeholder="e.g. Colombo 05"
      />
      <Field
        label="Additional Details (optional)"
        value={details}
        onChangeText={setDetails}
        theme={theme}
        placeholder="Any other info"
        multiline
      />

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.primary }, submitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={[styles.submitButtonText, { color: theme.textOnPrimary }]}>
          {submitting ? 'Submitting...' : 'Submit'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, theme, error, placeholder, multiline }: any) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && { height: 90, textAlignVertical: 'top', paddingTop: Spacing.two },
          { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: error ? theme.error : theme.border },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.inputPlaceholder}
        multiline={multiline}
      />
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { ...Typography.h2, marginBottom: Spacing.four },
  label: { ...Typography.label, marginBottom: Spacing.two },
  foodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  foodTypeBox: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodTypeIcon: {
    fontSize: 22,
  },
  foodTypeLabel: {
    ...Typography.caption,
    textTransform: 'none',
    marginTop: 4,
  },
  input: {
    height: ComponentSizes.inputHeight,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    ...Typography.input,
  },
  errorText: { ...Typography.caption, textTransform: 'none', marginTop: Spacing.one, marginBottom: Spacing.two },
  urgencyRow: { flexDirection: 'row', marginBottom: Spacing.four },
  urgencyChip: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  urgencyChipText: { ...Typography.labelStrong, textAlign: 'center' },
  submitButton: {
    height: ComponentSizes.buttonHeight,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: { ...Typography.button },
});
