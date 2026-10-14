import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  ComponentSizes,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';

const C = Colors.light;

interface Props {
  label: string;
  /** Currently picked date as YYYY-MM-DD, '' when unset */
  value: string;
  error?: string;
  /** Earliest date the calendar allows, as YYYY-MM-DD */
  minDate?: string;
  /** Latest date the calendar allows, as YYYY-MM-DD */
  maxDate?: string;
  onChange: (yyyyMmDd: string) => void;
}

// Local-midnight parsing keeps the picked calendar date stable across timezones.
const parseLocal = (v: string) => new Date(`${v}T00:00:00`);
const fmtLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
const pretty = (v: string) =>
  parseLocal(v).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function AmashaCampaignDatePicker({
  label,
  value,
  error,
  minDate,
  maxDate,
  onChange,
}: Props) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date | null>(null);

  const openDate = value
    ? parseLocal(value)
    : minDate
      ? parseLocal(minDate)
      : new Date();
  const min = minDate ? parseLocal(minDate) : undefined;
  const max = maxDate ? parseLocal(maxDate) : undefined;

  const applyAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (event.type === 'set' && date) onChange(fmtLocal(date));
  };

  const handleIosChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setTemp(date);
  };

  const confirmIos = () => {
    setShow(false);
    if (temp) onChange(fmtLocal(temp));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={() => {
          setTemp(openDate);
          setShow(true);
        }}
        accessibilityLabel={`${label} calendar`}
        accessibilityRole="button"
      >
        <Text style={value ? styles.valueText : styles.placeholder} numberOfLines={1}>
          {value ? pretty(value) : 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={19} color={C.inputPlaceholder} />
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Android: rendering the picker opens the calendar dialog */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={openDate}
          mode="date"
          display="calendar"
          minimumDate={min}
          maximumDate={max}
          onChange={applyAndroid}
        />
      )}

      {/* iOS: spinner in a sheet with explicit confirm */}
      <Modal
        visible={Platform.OS === 'ios' && show}
        transparent
        animationType="slide"
        onRequestClose={() => setShow(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <DateTimePicker
              value={temp ?? openDate}
              mode="date"
              display="spinner"
              minimumDate={min}
              maximumDate={max}
              onChange={handleIosChange}
              style={styles.iosSpinner}
            />
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.sheetButton}
                onPress={() => setShow(false)}
              >
                <Text style={styles.sheetButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetButton, styles.sheetButtonPrimary]}
                onPress={confirmIos}
              >
                <Text style={styles.sheetButtonTextPrimary}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.three },
  label: { ...Typography.label, color: C.text, marginBottom: Spacing.two },
  input: {
    ...Typography.input,
    minHeight: ComponentSizes.inputHeight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingRight: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: C.inputBackground,
  },
  inputError: { borderColor: C.error },
  valueText: { ...Typography.inputMedium, color: C.inputText, flex: 1 },
  placeholder: { ...Typography.input, color: C.inputPlaceholder, flex: 1 },
  error: { ...Typography.bodySmall, marginTop: Spacing.one, color: C.error },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 48, 71, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  iosSpinner: { alignSelf: 'center' },
  sheetButtons: { flexDirection: 'row', gap: Spacing.two },
  sheetButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetButtonText: { ...Typography.buttonSmall, color: C.textSecondary },
  sheetButtonPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  sheetButtonTextPrimary: { ...Typography.buttonSmall, color: C.textOnPrimary },
});
