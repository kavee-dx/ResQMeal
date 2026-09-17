// src/screens/kaveesha-DonationDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../styles/kaveesha-theme';

export default function DonationDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Donation Detail (coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
});