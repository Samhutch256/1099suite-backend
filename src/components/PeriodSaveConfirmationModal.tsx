import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PeriodSaveConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  periodTitle: string;
  scope: string;
}

export const PeriodSaveConfirmationModal: React.FC<PeriodSaveConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  periodTitle,
  scope,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          alignItems: 'center',
        }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FFF3CD',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="warning" size={30} color="#856404" />
          </View>

          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1a1f2e',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            Confirm Period Save
          </Text>

          <Text style={{
            fontSize: 16,
            color: '#4a5568',
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 8,
          }}>
            Apply these totals to{' '}
            <Text style={{ fontWeight: '600' }}>{periodTitle}</Text>?
          </Text>

          <Text style={{
            fontSize: 14,
            color: '#718096',
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 24,
          }}>
            This will overwrite existing entries for that {scope}. Period entries are saved as daily records to keep reports accurate.
          </Text>

          <View style={{
            flexDirection: 'row',
            gap: 12,
            width: '100%',
          }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                backgroundColor: '#E2E8F0',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#4A5568',
                fontWeight: '600',
                fontSize: 16,
              }}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1,
                backgroundColor: '#FF9900',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: 'white',
                fontWeight: '600',
                fontSize: 16,
              }}>
                Apply
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
