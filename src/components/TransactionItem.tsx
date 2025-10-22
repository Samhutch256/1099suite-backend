import React from 'react';
import { Txn } from '../types/transactions';
import { View, Text, Image, Pressable } from 'react-native';

export function TransactionItem({ txn, onPress }: { txn: Txn; onPress: () => void }) {
  const title = txn.merchant_name || txn.name;
  const sub = [txn.category?.join(' • '), txn.account_name, new Date(txn.date).toLocaleDateString()].filter(Boolean).join(' • ');
  const amount = (txn.amount ?? 0).toFixed(2);
  return (
    <Pressable onPress={onPress} className="px-4 py-3 flex-row items-center">
      {txn.logo_url ? (
        <Image source={{ uri: txn.logo_url }} className="w-9 h-9 rounded-full mr-3" />
      ) : (
        <View className="w-9 h-9 rounded-full mr-3 bg-gray-200 items-center justify-center">
          <Text className="text-xs">{(title ?? '??').slice(0,2).toUpperCase()}</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-medium" numberOfLines={1}>{title}</Text>
        <Text className="text-xs text-gray-500" numberOfLines={1}>{sub}</Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-semibold">{`-$${amount}`}</Text>
        {txn.pending ? <Text className="text-[10px] text-gray-500">Pending</Text> : null}
      </View>
    </Pressable>
  );
}
