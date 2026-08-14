import React from 'react';
import { View } from 'react-native';
import { ProfileField } from './dilshara-ProfileField';
import type { DonorProfile } from '@/types/dilshara-profileTypes';

export function DonorProfileDetails({
  profile,
  isEditing,
  onChange,
}: {
  profile: DonorProfile;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}) {
  const isBusiness = profile.donorType !== 'INDIVIDUAL';

  return (
    <View>
      <ProfileField label="Donor Type" value={profile.donorType} isEditing={false} onChangeText={() => {}} />
      {isBusiness && (
        <>
          <ProfileField label="Business Name" value={profile.businessName ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('businessName', v)} />
          <ProfileField label="Authorized Person" value={profile.authorizedPerson ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('authorizedPerson', v)} />
          <ProfileField label="Position" value={profile.position ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('position', v)} />
          <ProfileField label="Business Registration Number" value={profile.businessRegistrationNumber ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('businessRegistrationNumber', v)} />
          <ProfileField label="Business Contact Number" value={profile.businessContactNumber ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('businessContactNumber', v)} keyboardType="phone-pad" />
          <ProfileField label="Description" value={profile.description ?? ''} isEditing={isEditing} onChangeText={(v) => onChange('description', v)} />
        </>
      )}
    </View>
  );
}