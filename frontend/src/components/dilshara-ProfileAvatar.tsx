import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export function ProfileAvatar({
  uri,
  isEditing,
  onPickImage,
}: {
  uri?: string;
  isEditing: boolean;
  onPickImage: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.circle}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <Ionicons name="person" size={48} color={Colors.light.textMuted} />
        )}
      </View>

      {isEditing && (
        <TouchableOpacity style={styles.editBadge} onPress={onPickImage}>
          <Ionicons name="camera" size={16} color={Colors.light.textOnPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center', marginBottom: 20 },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.light.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.light.primaryLight,
  },
  image: { width: '100%', height: '100%' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
});