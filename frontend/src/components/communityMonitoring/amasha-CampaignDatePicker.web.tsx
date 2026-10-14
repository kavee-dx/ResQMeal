import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

// Web version (the native DateTimePicker has no web support).
// The browser renders its own calendar popup for <input type="date">.
export default function AmashaCampaignDatePicker({
  label,
  value,
  error,
  minDate,
  maxDate,
  onChange,
}: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <input
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={inputStyle}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: ComponentSizes.inputHeight,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: C.border,
  borderRadius: Radius.md,
  backgroundColor: C.inputBackground,
  color: C.inputText,
  fontSize: 15,
  lineHeight: '20px',
  fontFamily: 'inherit',
  padding: '0 16px',
  boxSizing: 'border-box',
  outline: 'none',
};

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.three },
  label: { ...Typography.label, color: C.text, marginBottom: Spacing.two },
  error: { ...Typography.bodySmall, marginTop: Spacing.one, color: C.error },
});
