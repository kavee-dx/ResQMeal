//Shared fields across all four roles.

import React from 'react';
import { View } from 'react-native';
// import { ProfileField } from './dilshara-ProfileField';
import type { AnyProfile } from '@/types/dilshara-profileTypes';
import { ProfileField } from './dilshara-ProfileField';
console.log('ProfileField is:', ProfileField);

export function CommonProfileFields({
  profile,
  isEditing,
  onChange,
}: {
  profile: AnyProfile;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <View>
      {profile.fullName !== undefined && (
        <ProfileField
          label="Full Name"
          value={profile.fullName ?? ''}
          isEditing={isEditing}
          onChangeText={(v) => onChange('fullName', v)}
        />
      )}
      <ProfileField
        label="Email"
        value={profile.email ?? ''}
        isEditing={isEditing}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
      />
      <ProfileField
        label="Phone Number"
        value={profile.phoneNumber}
        isEditing={isEditing}
        onChangeText={(v) => onChange('phoneNumber', v)}
        keyboardType="phone-pad"
      />
      <ProfileField
        label="Address"
        value={profile.address}
        isEditing={isEditing}
        onChangeText={(v) => onChange('address', v)}
      />
      <ProfileField
        label="District"
        value={profile.district}
        isEditing={isEditing}
        onChangeText={(v) => onChange('district', v)}
      />
      <ProfileField
        label="City"
        value={profile.city}
        isEditing={isEditing}
        onChangeText={(v) => onChange('city', v)}
      />
    </View>
  );
}