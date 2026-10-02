import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, ComponentSizes, Radius, Spacing, Typography } from '@/constants/theme';
import api from '@/services/api';
import {
  CAMPAIGN_CATEGORIES,
  CampaignFormErrors,
  CampaignFormValues,
} from '@/types/amasha-campaign';

const C = Colors.light; // FormTheme in theme.ts is also light-only

const TITLE_MAX = 100;
const DESC_MAX = 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const emptyForm: CampaignFormValues = {
  title: '',
  description: '',
  category: 'surplus_pickup',
  location: '',
  startDate: '',
  endDate: '',
  targetMeals: '',
  contactPhone: '',
  imageUri: null,
};

interface Props {
  onCreated?: (campaign: unknown) => void;
}

export default function AmashaCampaignPostForm({ onCreated }: Props) {
  const [form, setForm] = useState<CampaignFormValues>(emptyForm);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const fieldProps = (key: keyof CampaignFormValues) => ({
    onFocus: () => setFocused(key),
    onBlur: () => setFocused(null),
    placeholderTextColor: C.inputPlaceholder,
    style: [
      styles.input,
      focused === key && styles.inputFocused,
      errors[key] && styles.inputError,
    ],
  });

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a campaign image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) set('imageUri', result.assets[0].uri);
  };

  const validate = (): boolean => {
    const e: CampaignFormErrors = {};
    if (!form.title.trim()) e.title = 'Enter a title.';
    else if (form.title.length > TITLE_MAX) e.title = `Keep the title under ${TITLE_MAX} characters.`;

    if (!form.description.trim()) e.description = 'Describe the campaign.';
    else if (form.description.length > DESC_MAX)
      e.description = `Keep the description under ${DESC_MAX} characters.`;

    if (!form.location.trim()) e.location = 'Enter where this campaign takes place.';

    if (!DATE_RE.test(form.startDate)) e.startDate = 'Use the format YYYY-MM-DD.';
    if (!DATE_RE.test(form.endDate)) e.endDate = 'Use the format YYYY-MM-DD.';
    if (!e.startDate && !e.endDate && form.endDate < form.startDate)
      e.endDate = 'End date must be on or after the start date.';

    if (form.targetMeals && !/^\d+$/.test(form.targetMeals))
      e.targetMeals = 'Enter a whole number.';

    if (!/^\+?\d[\d\s-]{6,14}$/.test(form.contactPhone.trim()))
      e.contactPhone = 'Enter a valid phone number.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      data.append('category', form.category);
      data.append('location', form.location.trim());
      data.append('startDate', form.startDate);
      data.append('endDate', form.endDate);
      if (form.targetMeals) data.append('targetMeals', form.targetMeals);
      data.append('contactPhone', form.contactPhone.trim());

      if (form.imageUri) {
        const name = form.imageUri.split('/').pop() ?? 'campaign.jpg';
        const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase() ?? 'jpg';
        data.append('image', {
          uri: form.imageUri,
          name,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as any);
      }

      // Assumed endpoint; the JWT is attached by the existing API client
      const res = await api.post('/campaigns', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setForm(emptyForm);
      Alert.alert('Campaign posted', 'Your campaign is now live.');
      onCreated?.(res.data);
    } catch (err: any) {
      Alert.alert(
        'Could not post campaign',
        err?.response?.data?.message ?? 'Check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New campaign post</Text>

        <Field label="Title" error={errors.title} counter={`${form.title.length}/${TITLE_MAX}`}>
          <TextInput
            {...fieldProps('title')}
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Weekend surplus pickup in Negombo"
            maxLength={TITLE_MAX}
          />
        </Field>

        <Field
          label="Description"
          error={errors.description}
          counter={`${form.description.length}/${DESC_MAX}`}
        >
          <TextInput
            {...fieldProps('description')}
            style={[...fieldProps('description').style, styles.multiline]}
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="What is the campaign, who is it for, and how can people help?"
            multiline
            textAlignVertical="top"
            maxLength={DESC_MAX}
          />
        </Field>

        <Field label="Campaign type">
          <View style={styles.chipRow}>
            {CAMPAIGN_CATEGORIES.map((c) => {
              const active = form.category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set('category', c.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="Location" error={errors.location}>
          <TextInput
            {...fieldProps('location')}
            value={form.location}
            onChangeText={(v) => set('location', v)}
            placeholder="Town or pickup address"
          />
        </Field>

        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Start date" error={errors.startDate}>
              <TextInput
            {...fieldProps('startDate')}
                value={form.startDate}
                onChangeText={(v) => set('startDate', v)}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="End date" error={errors.endDate}>
              <TextInput
            {...fieldProps('endDate')}
                value={form.endDate}
                onChangeText={(v) => set('endDate', v)}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Field>
          </View>
        </View>

        <Field label="Target meals (optional)" error={errors.targetMeals}>
          <TextInput
            {...fieldProps('targetMeals')}
            value={form.targetMeals}
            onChangeText={(v) => set('targetMeals', v)}
            placeholder="e.g. 200"
            keyboardType="number-pad"
          />
        </Field>

        <Field label="Contact phone" error={errors.contactPhone}>
          <TextInput
            {...fieldProps('contactPhone')}
            value={form.contactPhone}
            onChangeText={(v) => set('contactPhone', v)}
            placeholder="+94 77 123 4567"
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Image (optional)">
          {form.imageUri ? (
            <View>
              <Image source={{ uri: form.imageUri }} style={styles.preview} />
              <View style={styles.row}>
                <TouchableOpacity onPress={pickImage}>
                  <Text style={styles.link}>Change image</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => set('imageUri', null)}>
                  <Text style={styles.link}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Text style={styles.imagePickerText}>Add an image</Text>
            </TouchableOpacity>
          )}
        </Field>

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={C.textOnPrimary} />
          ) : (
            <Text style={styles.submitText}>Post campaign</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  counter,
  children,
}: {
  label: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {counter ? <Text style={styles.counter}>{counter}</Text> : null}
      </View>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.three, paddingBottom: Spacing.six },
  heading: { ...Typography.h2, color: C.text, marginBottom: Spacing.three },
  field: { marginBottom: Spacing.three },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.two },
  label: { ...Typography.label, color: C.text },
  counter: { ...Typography.bodySmall, color: C.textMuted },
  input: {
    ...Typography.input,
    minHeight: ComponentSizes.inputHeight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    color: C.inputText,
    backgroundColor: C.inputBackground,
  },
  inputFocused: { borderColor: C.borderFocus },
  inputError: { borderColor: C.error },
  multiline: { minHeight: 120, paddingTop: Spacing.three },
  error: { ...Typography.bodySmall, marginTop: Spacing.one, color: C.error },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  half: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { ...Typography.bodyMedium, color: C.text },
  chipTextActive: { color: C.textOnPrimary },
  imagePicker: {
    height: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  imagePickerText: { ...Typography.button, color: C.primary },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  link: { ...Typography.buttonSmall, color: C.primary },
  submit: {
    height: ComponentSizes.buttonHeight,
    backgroundColor: C.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...Typography.button, color: C.textOnPrimary },
});