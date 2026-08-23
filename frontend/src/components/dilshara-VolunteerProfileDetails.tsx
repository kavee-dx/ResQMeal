import React from 'react';
import { View } from 'react-native';
import { ProfileField } from './dilshara-ProfileField';
import type { VolunteerProfile } from '@/types/dilshara-profileTypes';

export function VolunteerProfileDetails({
  profile,
  isEditing,
  onChange,
}: {
  profile: VolunteerProfile;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <View>
      <ProfileField
        label="Vehicle Type"
        value={profile.vehicleType ?? ''}
        isEditing={isEditing}
        onChangeText={(v) => onChange('vehicleType', v)}
      />
      <ProfileField
        label="Vehicle Number"
        value={profile.vehicleNumber ?? ''}
        isEditing={isEditing}
        onChangeText={(v) => onChange('vehicleNumber', v)}
      />
      <ProfileField
        label="Preferred Delivery Area"
        value={profile.preferredDeliveryArea ?? ''}
        isEditing={isEditing}
        onChangeText={(v) => onChange('preferredDeliveryArea', v)}
      />
      <ProfileField
        label="Preferred Delivery Time"
        value={profile.preferredDeliveryTime ?? ''}
        isEditing={isEditing}
        onChangeText={(v) => onChange('preferredDeliveryTime', v)}
      />
    </View>
  );
}