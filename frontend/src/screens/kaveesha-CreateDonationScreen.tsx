import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  DonationFormValues,
  emptyDonationForm,
  DonationFormErrors,
  StorageCondition,
} from '@/types/kaveesha-donation.types';

import {
  validateDonationForm,
  isFormValid,
} from './kaveesha-donationValidation';

import { createDonation } from '@/services/kaveesha-donationApi';

const STORAGE_OPTIONS: StorageCondition[] = [
  'Refrigerated',
  'Frozen',
  'Room Temperature',
  'Other',
];

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </Text>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <Text className="mt-1 text-xs font-medium text-red-500">
      {message}
    </Text>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  multiline = false,
}: InputProps) {
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
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-2xl border bg-white px-4 py-3.5 text-base text-slate-900 ${
          error ? 'border-red-300' : 'border-slate-200'
        } ${multiline ? 'min-h-[80px]' : ''}`}
      />

      <ErrorText message={error} />
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="p-5 mb-5 bg-white shadow-sm rounded-3xl shadow-slate-200">
      <Text className="mb-4 text-sm font-bold tracking-wide uppercase text-emerald-700">
        {title}
      </Text>

      {children}
    </View>
  );
}

export default function CreateDonationScreen() {
  const navigation = useNavigation<any>();

  const [donationType, setDonationType] =
    useState<'normal' | 'urgent'>('normal');

  const [values, setValues] =
    useState<DonationFormValues>(emptyDonationForm);

  const [errors, setErrors] =
    useState<DonationFormErrors>({});

  const [submitting, setSubmitting] =
    useState(false);

  // =========================================================
  // Update form field
  // =========================================================

  const setField =
    (field: keyof DonationFormValues) =>
    (text: string) => {
      setValues((previous) => ({
        ...previous,
        [field]: text,
      }));

      if (errors[field]) {
        setErrors((previous) => ({
          ...previous,
          [field]: undefined,
        }));
      }
    };

  // =========================================================
  // Submit donation
  // =========================================================

  const handleSubmit = async () => {
    const validationErrors =
      validateDonationForm(values);

    setErrors(validationErrors);

    if (!isFormValid(validationErrors)) {
      return;
    }

    try {
      setSubmitting(true);

      /*
       * Keep donationType in the submitted object if your
       * backend supports it.
       *
       * The cast prevents this screen from breaking if
       * donationType is not yet part of DonationFormValues.
       */

      const donationData = {
        ...values,
        donationType,
      };

      await createDonation(donationData as DonationFormValues);

      Alert.alert(
        'Donation submitted',
        'Your food donation has been recorded.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Something went wrong',
        error?.message ?? 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
      className="flex-1 bg-slate-50"
    >
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* ================================================= */}
        {/* Header */}
        {/* ================================================= */}

        <Text className="mb-1 text-2xl font-extrabold text-slate-900">
          New Food Donation
        </Text>

        <Text className="mb-6 text-sm text-slate-500">
          Share your surplus food details below — it only
          takes a minute.
        </Text>

        {/* ================================================= */}
        {/* Donation Type */}
        {/* ================================================= */}

        <SectionCard title="Donation Type">
          <View className="flex-row gap-3">
            {(['normal', 'urgent'] as const).map(
              (type) => (
                <Pressable
                  key={type}
                  onPress={() =>
                    setDonationType(type)
                  }
                  className={`flex-1 flex-row items-center justify-center rounded-2xl border py-3 ${
                    donationType === type
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      donationType === type
                        ? 'text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {type === 'normal'
                      ? 'Normal'
                      : '⚡ Urgent'}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </SectionCard>

        {/* ================================================= */}
        {/* Food Information */}
        {/* ================================================= */}

        <SectionCard title="Food Information">
          <FormInput
            label="Food type"
            value={values.foodType}
            onChangeText={setField('foodType')}
            placeholder="e.g. Rice & Curry"
            error={errors.foodType}
          />

          <FormInput
            label="Food category"
            value={values.foodCategory}
            onChangeText={setField('foodCategory')}
            placeholder="e.g. Cooked meals"
            error={errors.foodCategory}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput
                label="Quantity"
                value={values.quantity}
                onChangeText={setField('quantity')}
                placeholder="30"
                keyboardType="numeric"
                error={errors.quantity}
              />
            </View>

            <View className="flex-1">
              <FormInput
                label="Portions"
                value={values.numberOfPortions}
                onChangeText={setField(
                  'numberOfPortions'
                )}
                placeholder="30"
                keyboardType="numeric"
                error={errors.numberOfPortions}
              />
            </View>
          </View>

          <FormInput
            label="Preparation time"
            value={values.preparationTime}
            onChangeText={setField(
              'preparationTime'
            )}
            placeholder="e.g. 2026-08-22T18:00"
            error={errors.preparationTime}
          />

          <FormInput
            label="Expiry time"
            value={values.expiryTime}
            onChangeText={setField('expiryTime')}
            placeholder="e.g. 2026-08-22T22:00"
            error={errors.expiryTime}
          />
        </SectionCard>

        {/* ================================================= */}
        {/* Food Safety */}
        {/* ================================================= */}

        <SectionCard title="Food Safety Information">
          <FieldLabel>
            Storage condition
          </FieldLabel>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {STORAGE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setValues((previous) => ({
                    ...previous,
                    storageCondition: option,
                  }));

                  if (errors.storageCondition) {
                    setErrors((previous) => ({
                      ...previous,
                      storageCondition:
                        undefined,
                    }));
                  }
                }}
                className={`rounded-full border px-3.5 py-2 ${
                  values.storageCondition === option
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    values.storageCondition === option
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <ErrorText
            message={errors.storageCondition}
          />

          <FormInput
            label="Allergen information"
            value={values.allergenInfo}
            onChangeText={setField('allergenInfo')}
            placeholder="e.g. Contains nuts, dairy"
            error={errors.allergenInfo}
            multiline
          />

          <FormInput
            label="Packaging condition"
            value={values.packagingCondition}
            onChangeText={setField(
              'packagingCondition'
            )}
            placeholder="e.g. Sealed container"
            error={errors.packagingCondition}
          />
        </SectionCard>

        {/* ================================================= */}
        {/* Pickup Information */}
        {/* ================================================= */}

        <SectionCard title="Pickup Information">
          <FormInput
            label="Address"
            value={values.pickupAddress}
            onChangeText={setField('pickupAddress')}
            placeholder="e.g. 12 Galle Road"
            error={errors.pickupAddress}
          />

          <FormInput
            label="District"
            value={values.pickupDistrict}
            onChangeText={setField(
              'pickupDistrict'
            )}
            placeholder="e.g. Colombo"
            error={errors.pickupDistrict}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput
                label="Available from"
                value={values.pickupWindowStart}
                onChangeText={setField(
                  'pickupWindowStart'
                )}
                placeholder="5:30 PM"
                error={errors.pickupWindowStart}
              />
            </View>

            <View className="flex-1">
              <FormInput
                label="Available until"
                value={values.pickupWindowEnd}
                onChangeText={setField(
                  'pickupWindowEnd'
                )}
                placeholder="6:00 PM"
                error={errors.pickupWindowEnd}
              />
            </View>
          </View>
        </SectionCard>

        {/* ================================================= */}
        {/* Submit */}
        {/* ================================================= */}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="flex-row items-center justify-center py-4 mt-2 shadow-lg rounded-2xl bg-emerald-600 shadow-emerald-200 active:bg-emerald-700"
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-bold text-white">
              Submit Donation
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}