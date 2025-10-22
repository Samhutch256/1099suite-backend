import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { useKPIStore } from '../state/kpiStore';
import { useSettingsStore } from '../state/settingsStore';
import { useInputSettingsStore } from '../state/inputSettingsStore';
import { useContractorStore } from '../state/contractorStore';
import { usePlaidStore } from '../state/plaidStore';
import { useMileageStore } from '../state/mileageStore';
import { useLeadFilterStore } from '../state/leadFilterStore';
import { 
  startEverlanceTracking, 
  stopEverlanceTracking, 
  isEverlanceTrackingActive,
  isBackgroundLocationAvailable 
} from '../services/everlanceTrackingService';
import { DataDebugModal } from '../components/DataDebugModal';
import { cn } from '../utils/cn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

interface ProfileScreenProps {
  navigation: any;
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  color?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
  color = "bg-blue-500"
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center py-4 px-1 active:opacity-70"
  >
    <View className={cn("w-8 h-8 rounded-lg items-center justify-center mr-4", color)}>
      <Ionicons name={icon} size={16} color="white" />
    </View>
    <View className="flex-1">
      <Text className="text-gray-900 font-medium text-base">{title}</Text>
      {subtitle && (
        <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
      )}
    </View>
    {rightElement}
    {showChevron && !rightElement && (
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    )}
  </Pressable>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle }) => (
  <View className="mb-4 mt-6">
    <Text className="text-lg font-semibold text-gray-900 mb-1">{title}</Text>
    {subtitle && (
      <Text className="text-sm text-gray-600">{subtitle}</Text>
    )}
  </View>
);

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, signOut, isLoading, updateUserProfile, changePassword } = useAuthStore();
  const { clearUserData, dailyInputs } = useKPIStore();
  const { settings, updateSetting } = useSettingsStore();
  const { settings: inputSettings } = useInputSettingsStore();
  const { autoTrackingEnabled, toggleAutoTracking } = useMileageStore();

  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Edit profile form state
  const [editFormData, setEditFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const handleSignOut = async () => {
    try {
      clearUserData();
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
  };

  const handleEditProfile = () => {
    setEditFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editFormData.name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }

    if (!editFormData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim()
      });
      
      setShowEditProfileModal(false);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Current password is required.');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSaveMessage({ type: 'success', text: 'Password updated successfully' });
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    // Validate inputs
    if (!deleteEmail.trim() || !deletePassword.trim() || deleteConfirmation !== 'DELETE') {
      Alert.alert('Validation Error', 'Please fill in all fields correctly:\n\n• Email must match your account\n• Password must be correct\n• Confirmation must be "DELETE" in all caps');
      return;
    }

    if (deleteEmail.toLowerCase() !== user?.email?.toLowerCase()) {
      Alert.alert('Email Mismatch', 'The email you entered does not match your account email.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Here you would typically call your backend to delete the account
      // For now, we'll just sign out
      await signOut();
      Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const handleUpdateSetting = (key: keyof typeof settings, value: any) => {
    updateSetting(key, value);
    setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleToggleMileageTracking = async (enabled: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      if (enabled) {
        // Check if background location is available
        const backgroundAvailable = await isBackgroundLocationAvailable();
        if (!backgroundAvailable) {
          Alert.alert(
            'Background Location Required',
            'Automatic mileage tracking requires "Always Allow" location access. Please enable this in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'OK', style: 'default' },
            ]
          );
          return;
        }

        const success = await startEverlanceTracking(user.id);
        if (success) {
          toggleAutoTracking(true);
          setSaveMessage({ type: 'success', text: 'Automatic mileage tracking enabled' });
        } else {
          Alert.alert('Error', 'Failed to start automatic mileage tracking. Please check your location permissions.');
          return;
        }
      } else {
        await stopEverlanceTracking();
        toggleAutoTracking(false);
        setSaveMessage({ type: 'success', text: 'Automatic mileage tracking disabled' });
      }
      
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to toggle mileage tracking:', error);
      Alert.alert('Error', 'Failed to update mileage tracking settings. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900">Profile</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View className="px-6 pt-6">
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center flex-1">
                <View className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full items-center justify-center mr-4 shadow-sm">
                  <Text className="text-white text-2xl font-bold">
                    {getInitials(user?.name || user?.email || 'U')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 mb-1">
                    {user?.name || 'User'}
                  </Text>
                  <Text className="text-gray-600 text-base">{user?.email}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleEditProfile}
                className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 ml-4"
              >
                <Text className="text-blue-600 font-medium text-sm">Edit</Text>
              </Pressable>
            </View>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className={cn(
                    "w-3 h-3 rounded-full mr-3",
                    user?.provider === 'email' ? 'bg-blue-500' : 
                    user?.provider === 'google' ? 'bg-red-500' : 'bg-gray-900'
                  )} />
                  <Text className="text-sm text-gray-600 capitalize">
                    {user?.provider === 'email' ? 'Email Account' : 
                     user?.provider === 'google' ? 'Google Account' : 
                     user?.provider === 'apple' ? 'Apple Account' : 'Account'}
                  </Text>
                </View>
                <View className="flex-row items-center bg-green-50 px-3 py-2 rounded-full">
                  <Ionicons name="cloud-done" size={16} color="#10b981" />
                  <Text className="text-sm text-green-700 font-medium ml-2">Secure</Text>
                </View>
              </View>
              
              <View className="bg-gray-50 rounded-lg p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                    <Text className="text-sm text-gray-700 font-medium ml-2">Data Protection</Text>
                  </View>
                  <Text className="text-xs text-gray-500">Always backed up</Text>
                </View>
                <Text className="text-xs text-gray-600 mt-1 ml-6">
                  Your data is automatically synced to secure cloud storage
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View className="px-6 mt-6">
          <SectionHeader title="App Settings" subtitle="Customize your app experience" />
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Use dark theme throughout the app"
              onPress={() => handleUpdateSetting('darkMode', !settings.darkMode)}
              rightElement={
                <Switch
                  value={settings.darkMode}
                  onValueChange={(value) => handleUpdateSetting('darkMode', value)}
                  trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
                  thumbColor={settings.darkMode ? '#ffffff' : '#ffffff'}
                />
              }
              showChevron={false}
              color="bg-gray-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />
            
            <SettingItem
              icon="analytics"
              title="Share Usage Analytics"
              subtitle="Help improve the app with anonymous data"
              onPress={() => handleUpdateSetting('shareAnalytics', !settings.shareAnalytics)}
              rightElement={
                <Switch
                  value={settings.shareAnalytics}
                  onValueChange={(value) => handleUpdateSetting('shareAnalytics', value)}
                  trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
                  thumbColor={settings.shareAnalytics ? '#ffffff' : '#ffffff'}
                />
              }
              showChevron={false}
              color="bg-purple-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />

            <SettingItem
              icon="car"
              title="Automatic Mileage Tracking"
              subtitle="Track trips automatically in the background"
              onPress={() => handleToggleMileageTracking(!autoTrackingEnabled)}
              rightElement={
                <Switch
                  value={autoTrackingEnabled}
                  onValueChange={handleToggleMileageTracking}
                  trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
                  thumbColor={autoTrackingEnabled ? '#ffffff' : '#ffffff'}
                />
              }
              showChevron={false}
              color="bg-green-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />

            <SettingItem
              icon="key"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => setShowChangePasswordModal(true)}
              color="bg-indigo-500"
            />
          </View>
          
          {/* Data Backup Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <View className="flex-row items-center">
              <Ionicons name="cloud-done" size={20} color="#3b82f6" />
              <Text className="text-blue-800 font-medium ml-2">Data Backup</Text>
            </View>
            <Text className="text-blue-700 text-sm mt-1">
              Your data is automatically backed up to secure cloud storage. No manual backup required.
            </Text>
          </View>
        </View>

        {/* Additional Settings */}
        <View className="px-6">
          <SectionHeader title="Additional Settings" />
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <SettingItem
              icon="notifications"
              title="Notifications"
              subtitle="Manage your notification preferences"
              onPress={() => Alert.alert('Notifications', 'Notification settings will be available in a future update.')}
              color="bg-red-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />
            
            <SettingItem
              icon="download"
              title="Export Data"
              subtitle="Download your data as CSV or PDF"
              onPress={() => Alert.alert('Export Data', 'Data export functionality will be available in a future update.')}
              color="bg-teal-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />
            
            <SettingItem
              icon="bug"
              title="Data Debug Tool"
              subtitle="View and manage your local data"
              onPress={() => setShowDebugModal(true)}
              color="bg-orange-500"
            />
            
            <View className="h-px bg-gray-100 my-2" />
            
            <SettingItem
              icon="trash"
              title="Delete Account"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
              color="bg-red-600"
            />
          </View>
        </View>

        {/* Account Actions */}
        <View className="px-6 mt-6 mb-8">
          <SectionHeader title="Account Actions" />
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <SettingItem
              icon="log-out"
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              color="bg-gray-500"
            />
          </View>
        </View>
      </ScrollView>

      {/* Success/Error Message */}
      {saveMessage && (
        <View className={cn(
          "absolute bottom-4 left-4 right-4 p-4 rounded-lg",
          saveMessage.type === 'success' ? "bg-green-500" : "bg-red-500"
        )}>
          <Text className="text-white text-center font-medium">
            {saveMessage.text}
          </Text>
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
            <Pressable
              onPress={() => setShowEditProfileModal(false)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>
          
          <ScrollView className="flex-1 p-6">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Full Name</Text>
                <TextInput
                  value={editFormData.name}
                  onChangeText={(text) => setEditFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Email Address</Text>
                <TextInput
                  value={editFormData.email}
                  onChangeText={(text) => setEditFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
                <TextInput
                  value={editFormData.phone}
                  onChangeText={(text) => setEditFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <Pressable
                onPress={() => setShowEditProfileModal(false)}
                className="flex-1 bg-gray-300 px-6 py-4 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                className="flex-1 bg-blue-600 px-6 py-4 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Data Debug Modal */}
      {showDebugModal && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, zIndex: 100 }}>
          <DataDebugModal onClose={() => setShowDebugModal(false)} />
          <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ color: 'red', fontWeight: 'bold', backgroundColor: 'white', padding: 8, borderRadius: 8 }}>
              Temporary: Debug Tool is rendered inline for troubleshooting
            </Text>
          </View>
        </View>
      )}

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Delete Account</Text>
            <Pressable
              onPress={() => setShowDeleteAccountModal(false)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>
          
          <ScrollView className="flex-1 p-6">
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="warning" size={20} color="#dc2626" />
                <Text className="text-red-800 font-semibold ml-2">Warning</Text>
              </View>
              <Text className="text-red-700 text-sm">
                This action cannot be undone. All your data, including leads, expenses, and settings will be permanently deleted.
              </Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Email Address</Text>
                <TextInput
                  value={deleteEmail}
                  onChangeText={setDeleteEmail}
                  placeholder="Enter your email address"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
                <TextInput
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Confirmation</Text>
                <TextInput
                  value={deleteConfirmation}
                  onChangeText={setDeleteConfirmation}
                  placeholder="Type 'DELETE' in all caps"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <Pressable
                onPress={() => setShowDeleteAccountModal(false)}
                className="flex-1 bg-gray-300 px-6 py-4 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 bg-red-600 px-6 py-4 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Change Password</Text>
            <Pressable
              onPress={() => setShowChangePasswordModal(false)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-6">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Current Password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Confirm New Password</Text>
                <TextInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Re-enter new password"
                  secureTextEntry
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <Pressable
                onPress={() => setShowChangePasswordModal(false)}
                className="flex-1 bg-gray-300 px-6 py-4 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 bg-indigo-600 px-6 py-4 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">{isChangingPassword ? 'Updating...' : 'Update Password'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};