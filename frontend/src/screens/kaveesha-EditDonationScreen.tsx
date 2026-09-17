import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import {
  DonationFormValues, emptyDonationForm, DonationFormErrors, StorageCondition,
  donationToFormValues,
} from '@/types/kaveesha-donation.types';
import { validateDonationForm, isFormValid } from './kaveesha-donationValidation';
import { getDonationById, updateDonation } from '@/services/kaveesha-donationApi';

const STORAGE_OPTIONS: StorageCondition[] = ['Refrigerated', 'Frozen', 'Room Temperature', 'Other'];

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</Text>;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1 text-xs font-medium text-red-500">{message}</Text>;
}

interface InputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}

function FormInput({ label, value, onChangeText, placeholder, error, keyboardType = 'default', multiline }: InputProps) {
  return (
    <View className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        className={`rounded-2xl border bg-white px-4 py-3.5 text-base text-slate-900 ${
          error ? 'border-red-300' : 'border-slate-200'
        } ${multiline ? 'min-h-[80px] text-top' : ''}`}
      />
      <ErrorText message={error} />
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="p-5 mb-5 bg-white shadow-sm rounded-3xl shadow-slate-200">
      <Text className="mb-4 text-sm font-bold tracking-wide uppercase text-emerald-700">{title}</Text>
      {children}
    </View>
  );
}

export default function EditDonationScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { donationId } = route.params ?? {};

  const [values, setValues] = useState<DonationFormValues>(emptyDonationForm);
  const [errors, setErrors] = useState<DonationFormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getDonationById(donationId)
      .then((donation) => {
        if (mounted) setValues(donationToFormValues(donation));
      })
      .catch((err) => Alert.alert('Could not load donation', err?.message ?? 'Please try again.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [donationId]);

  const setField = (field: keyof DonationFormValues) => (text: string) => {
    setValues((prev: DonationFormValues) => ({ ...prev, [field]: text }));
    if (errors[field]) setErrors((prev: DonationFormErrors) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateDonationForm(values);
    setErrors(validationErrors);
    if (!isFormValid(validationErrors)) return;

    try {
      setSubmitting(true);
      await updateDonation(donationId, values);
      Alert.alert('Donation updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-50">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-extrabold text-slate-900">Edit Donation</Text>
        <Text className="mb-6 text-sm text-slate-500">Update the details below and save your changes.</Text>

        <SectionCard title="Food Information">
          <FormInput label="Food type" value={values.foodType} onChangeText={setField('foodType')} error={errors.foodType} />
          <FormInput label="Food category" value={values.foodCategory} onChangeText={setField('foodCategory')} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput label="Quantity" value={values.quantity} onChangeText={setField('quantity')} keyboardType="numeric" error={errors.quantity} />
            </View>
            <View className="flex-1">
              <FormInput label="Portions" value={values.numberOfPortions} onChangeText={setField('numberOfPortions')} keyboardType="numeric" error={errors.numberOfPortions} />
            </View>
          </View>
          <FormInput label="Preparation time" value={values.preparationTime} onChangeText={setField('preparationTime')} error={errors.preparationTime} />
          <FormInput label="Expiry time" value={values.expiryTime} onChangeText={setField('expiryTime')} error={errors.expiryTime} />
        </SectionCard>

        <SectionCard title="Food Safety Information">
          <FieldLabel>Storage condition</FieldLabel>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {STORAGE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setValues((prev: DonationFormValues) => ({ ...prev, storageCondition: option }))}
                className={`rounded-full border px-3.5 py-2 ${
                  values.storageCondition === option ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-xs font-semibold ${values.storageCondition === option ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormInput label="Allergen information" value={values.allergenInfo} onChangeText={setField('allergenInfo')} multiline />
          <FormInput label="Packaging condition" value={values.packagingCondition} onChangeText={setField('packagingCondition')} />
        </SectionCard>

        <SectionCard title="Pickup Information">
          <FormInput label="Address" value={values.pickupAddress} onChangeText={setField('pickupAddress')} />
          <FormInput label="District" value={values.pickupDistrict} onChangeText={setField('pickupDistrict')} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput label="Available from" value={values.pickupWindowStart} onChangeText={setField('pickupWindowStart')} />
            </View>
            <View className="flex-1">
              <FormInput label="Available until" value={values.pickupWindowEnd} onChangeText={setField('pickupWindowEnd')} />
            </View>
          </View>
        </SectionCard>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="flex-row items-center justify-center py-4 mt-2 shadow-lg rounded-2xl bg-emerald-600 shadow-emerald-200 active:bg-emerald-700"
        >
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-bold text-white">Save Changes</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}