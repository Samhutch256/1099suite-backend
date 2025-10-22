import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';
import type { Txn } from '../types/transactions';

const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';

export default function TransactionEditorSheet({ visible, onClose, txn, onSaved }:{
  visible: boolean; onClose: () => void; txn: Txn | null; onSaved: (t: Partial<Txn>) => void;
}) {
  const [classification, setClassification] = useState<Txn['classification']>(txn?.classification || 'unreviewed');
  const [notes, setNotes] = useState(txn?.notes || '');

  const save = async () => {
    if (!txn) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses/upsert`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id: txn.id, classification, notes })
      });
      
      if (!response.ok) {
        console.error('[TransactionEditorSheet] Upsert failed:', response.status);
        return;
      }
      
      console.log('[TransactionEditorSheet] Transaction updated successfully');
      onSaved({ id: txn.id, classification, notes });
      onClose();
    } catch (error) {
      console.error('[TransactionEditorSheet] Save error:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white p-4 rounded-t-2xl">
          <Text className="text-lg font-semibold mb-2">{txn?.merchant_name || txn?.name}</Text>
          <View className="flex-row gap-3 mb-3">
            {(['business','personal','unreviewed'] as const).map(k => (
              <Pressable key={k} onPress={() => setClassification(k)} className={`px-3 py-2 rounded-full ${classification===k?'bg-black':'bg-gray-200'}`}>
                <Text className={classification===k?'text-white':'text-black'}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-sm mb-1">Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note…" className="border rounded-lg p-2 mb-4" />
          <Pressable onPress={save} className="bg-black rounded-xl py-3 items-center">
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
          <Pressable onPress={onClose} className="mt-2 items-center"><Text>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
