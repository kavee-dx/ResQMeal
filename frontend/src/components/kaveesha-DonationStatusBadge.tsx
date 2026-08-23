import { View, Text } from 'react-native';
import { DonationStatus } from '@/types/kaveesha-donation.types';

interface Props {
  status: DonationStatus;
}

const STATUS_CONFIG: Record<DonationStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  expiring: { label: 'Expiring Soon', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  completed: { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

export default function DonationStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <View className={`flex-row items-center self-start rounded-full px-3 py-1 ${config.bg}`}>
      <View className={`mr-1.5 h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <Text className={`text-xs font-semibold ${config.text}`}>{config.label}</Text>
    </View>
  );
}