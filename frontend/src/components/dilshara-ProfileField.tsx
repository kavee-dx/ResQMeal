import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export function ProfileField({
  label,
  value,
  isEditing,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.wrapper}>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>

      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={styles.input}
          placeholderTextColor={Colors.light.inputPlaceholder}
        />
      ) : (
        <ThemedText type="default" style={styles.value}>
          {value || '—'}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  label: {
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.light.inputBackground,
    color: Colors.light.inputText,
    ...Typography.input,
  },
});