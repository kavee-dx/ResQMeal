import React from 'react';
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { RescueLocation } from '@/types/amasha-map';

const typeLabel: Record<string, string> = {
  donor: 'Donor',
  available_food: 'Available Food',
  recipient: 'Food Request',
  ngo: 'NGO',
  pickup: 'Pickup Point',
  delivery: 'Delivery Point',
};

interface Props {
  location: RescueLocation | null;
  onClose: () => void;
}

export default function AmashaLocationDetailsSheet({ location, onClose }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Modal visible={!!location} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {location && (
            <>
              <Text style={[styles.type, { color: colors.textSecondary }]}>
                {typeLabel[location.type] ?? location.type}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>{location.title}</Text>
              {!!location.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {location.description}
                </Text>
              )}
              <Pressable
                style={[styles.closeButton, { backgroundColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={[styles.closeButtonText, { color: colors.textOnPrimary }]}>Close</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  type: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  closeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeButtonText: {
    fontWeight: '600',
  },
});