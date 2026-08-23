import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import { Donation } from '@/types/kaveesha-donation.types';
import { getDonationById } from '@/services/kaveesha-donationApi';
import DonationStatusBadge from '@/components/kaveesha-DonationStatusBadge';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DonationDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { donationId } = route.params ?? {};

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getDonationById(donationId)
      .then((data) => mounted && setDonation(data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [donationId]);

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-50">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  if (!donation) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-slate-50">
        <Text className="text-sm text-slate-500">Donation not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="px-5 pb-10 pt-6">
      <Pressable onPress={() => navigation.goBack()} className="flex-row items-center mb-4">
        <Text className="text-lg text-slate-400">‹ </Text>
        <Text className="text-sm font-semibold text-slate-500">Back</Text>
      </Pressable>

      <View className="p-5 mb-5 bg-white shadow-sm rounded-3xl shadow-slate-200">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-extrabold text-slate-900">{donation.foodType}</Text>
            <Text className="mt-0.5 text-xs text-slate-400">#{donation.donationCode ?? donation._id.slice(-6)}</Text>
          </View>
          <DonationStatusBadge status={donation.status} />
        </View>

        <InfoRow label="Category" value={donation.foodCategory} />
        <InfoRow label="Quantity" value={`${donation.quantity}`} />
        <InfoRow label="Portions" value={`${donation.numberOfPortions}`} />
        <InfoRow label="Prepared" value={formatDate(donation.preparationTime)} />
        <InfoRow label="Expiry" value={formatDate(donation.expiryTime)} />
        <InfoRow label="Priority" value={donation.priority.toUpperCase()} />
      </View>

      <View className="p-5 mb-5 bg-white shadow-sm rounded-3xl shadow-slate-200">
        <Text className="mb-3 text-sm font-bold tracking-wide uppercase text-emerald-700">Food Safety</Text>
        <InfoRow label="Storage" value={donation.storageCondition} />
        <InfoRow label="Allergen info" value={donation.allergenInfo || '—'} />
        <InfoRow label="Packaging" value={donation.packagingCondition || '—'} />
      </View>

      <View className="p-5 bg-white shadow-sm rounded-3xl shadow-slate-200">
        <Text className="mb-3 text-sm font-bold tracking-wide uppercase text-emerald-700">Pickup</Text>
        <InfoRow label="District" value={donation.pickupDistrict || '—'} />
        <InfoRow label="Address" value={donation.pickupAddress || '—'} />
        <InfoRow
          label="Window"
          value={
            donation.pickupWindowStart && donation.pickupWindowEnd
              ? `${formatDate(donation.pickupWindowStart)} – ${formatDate(donation.pickupWindowEnd)}`
              : '—'
          }
        />
      </View>
    </ScrollView>
  );
}