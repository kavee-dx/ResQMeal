// frontend/src/components/kaveesha-BottomTabBar.tsx
// Bottom navigation bar, reused across the donor screens.
// Owner: Kaveesha

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow } from '../styles/kaveesha-theme';

export type TabKey = 'Home' | 'Donations' | 'Create' | 'Impact' | 'Profile';

interface Props {
  active: TabKey;
  onNavigate: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Home', label: 'Home', icon: 'home-outline' },
  { key: 'Donations', label: 'Donations', icon: 'fast-food-outline' },
  { key: 'Create', label: 'Donate', icon: 'add' },
  { key: 'Impact', label: 'Impact', icon: 'leaf-outline' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline' },
];

export default function KaveeshaBottomTabBar({ active, onNavigate }: Props) {
  return (
    <View style={styles.wrapper}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const isCenter = tab.key === 'Create';

        if (isCenter) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.centerButtonWrapper}
              onPress={() => onNavigate(tab.key)}
              activeOpacity={0.85}
            >
              <View style={styles.centerButton}>
                <Ionicons name="add" size={28} color={colors.white} />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 10,
    paddingBottom: 22,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    ...shadow.card,
  },
  tabButton: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  centerButtonWrapper: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -30 },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 4,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  labelActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
});