import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Donation, DonationStatus } from '@/types/kaveesha-donation.types';
import { getDonations } from '@/services/kaveesha-donationApi';
import DonationStatusBadge from '@/components/kaveesha-DonationStatusBadge';

type FilterValue = 'all' | DonationStatus;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Expiring', value: 'expiring' },
  { label: 'Completed', value: 'completed' },
];

function formatExpiry(expiryTime: string): string {
  const diffMs = new Date(expiryTime).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Expires soon';
  return `Expires in ${hours}h`;
}

function DonationCard({ donation, onPress }: { donation: Donation; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 p-4 mb-3 bg-white shadow-sm rounded-3xl shadow-slate-200 active:bg-slate-50"
    >
      <View className="items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50">
        <Text className="text-xl">🍛</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-900">{donation.foodType}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          {donation.numberOfPortions} portions · {formatExpiry(donation.expiryTime)}
        </Text>
       <View className="mt-2">
         <DonationStatusBadge status={donation.status} />
        </View>
      </View>
      <Text className="text-lg text-slate-300">›</Text>
    </Pressable>
  );
}

export default function MyDonationsScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status: FilterValue) => {
    const data = await getDonations(status);
    setDonations(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter).finally(() => setLoading(false));
  }, [filter, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  };

  return (
    <View className="flex-1 px-5 pt-6 bg-slate-50">
      <Text className="mb-4 text-2xl font-extrabold text-slate-900">My Donations</Text>

      <View className="flex-row flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 ${
              filter === f.value ? 'bg-emerald-600' : 'bg-white border border-slate-200'
            }`}
          >
            <Text className={`text-xs font-semibold ${filter === f.value ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator color="#059669" />
        </View>
      ) : donations.length === 0 ? (
        <View className="items-center justify-center flex-1 pb-20">
          <Text className="text-3xl">🍽️</Text>
          <Text className="mt-3 text-sm text-slate-500">No donations in this category yet.</Text>
        </View>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
          contentContainerClassName="pb-10"
          renderItem={({ item }) => (
            <DonationCard
              donation={item}
              onPress={() => navigation.navigate('DonationDetail', { donationId: item._id })}
            />
          )}
        />
      )}
    </View>
  );
}