import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { JessicaDataService } from '../services/jessicaDataService';
import { JessicaInputService } from '../services/jessicaInputService';
import { useKPIStore } from '../state/kpiStore';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUri?: string;
}

export const JessicaChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hi! I'm Jessica, your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Backend URL configuration
  const BACKEND_URL = 'https://1099suite-backend-production.up.railway.app';

  const sendMessage = async (text: string, imageUri?: string) => {
    if (!text.trim() && !imageUri) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      imageUri,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const endpoint = imageUri ? '/api/jessica-chat-image' : '/api/jessica-chat-message';
      
      // Get user data for Jessica's context
      const userData = await JessicaDataService.getUserDataSummary();
      
      const requestBody = {
        message: text.trim(),
        userId: 'user123', // You can get this from your auth store
        userData
      };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      console.log('[Frontend] Received response from backend:', data);
      
      // Check if Jessica's response indicates she recognized an input command
      const jessicaResponse = data.response || "I'm processing your request...";
      let shouldSaveData = false;
      let inputData: { type: 'dailyInput' | 'expense' | 'mileage'; data: any } | null = null;
      
      // Check if the backend provided extracted data from AI analysis
      if (data.extractedData && data.shouldSave) {
        console.log('[Frontend] Using AI extracted data:', data.extractedData);
        shouldSaveData = true;
        inputData = { type: 'dailyInput', data: data.extractedData };
      } else {
        console.log('[Frontend] No AI data, using fallback processing');
        // Parse Jessica's response to see if she recognized an input command (fallback to rule-based)
        if (jessicaResponse.includes("I'll log") || jessicaResponse.includes("I'll add") || jessicaResponse.includes("logged")) {
          shouldSaveData = true;
          
          // Extract data from the original user message with enhanced parsing
          const lowerMessage = text.toLowerCase();
          const numbers = text.match(/\d+/g);
          const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
          
          if (lowerMessage.includes('\n') || lowerMessage.includes('•') || lowerMessage.includes('-') || lowerMessage.includes('*')) {
            // Handle multi-line input with multiple activities
            const lines = text.split(/[\n•\-*]/).filter(line => line.trim().length > 0);
            if (lines.length > 1) {
              const inputDataObj: any = {};
              let hasData = false;
              
              for (const line of lines) {
                const trimmedLine = line.trim().toLowerCase();
                const lineNumbers = trimmedLine.match(/\d+/g);
                if (lineNumbers && lineNumbers.length > 0) {
                  const count = parseInt(lineNumbers[0]);
                  
                  // Enhanced parsing for sub-inputs
                  if (trimmedLine.includes('appointment') && trimmedLine.includes('held')) {
                    inputDataObj.appointmentHolds = (inputDataObj.appointmentHolds || 0) + count;
                    if (trimmedLine.includes('door')) inputDataObj.appointmentsHeldDoorKnocks = (inputDataObj.appointmentsHeldDoorKnocks || 0) + count;
                    else if (trimmedLine.includes('tag')) inputDataObj.appointmentsHeldTagsPut = (inputDataObj.appointmentsHeldTagsPut || 0) + count;
                    else if (trimmedLine.includes('call')) inputDataObj.appointmentsHeldCallsMade = (inputDataObj.appointmentsHeldCallsMade || 0) + count;
                    else if (trimmedLine.includes('referral')) inputDataObj.appointmentsHeldReferrals = (inputDataObj.appointmentsHeldReferrals || 0) + count;
                    else if (trimmedLine.includes('inbound')) inputDataObj.appointmentsHeldInbound = (inputDataObj.appointmentsHeldInbound || 0) + count;
                    hasData = true;
                  } else if (trimmedLine.includes('appointment') && trimmedLine.includes('set')) {
                    inputDataObj.appointments = (inputDataObj.appointments || 0) + count;
                    if (trimmedLine.includes('door')) inputDataObj.appointmentsSetDoorKnocks = (inputDataObj.appointmentsSetDoorKnocks || 0) + count;
                    else if (trimmedLine.includes('tag')) inputDataObj.appointmentsSetTagsPut = (inputDataObj.appointmentsSetTagsPut || 0) + count;
                    else if (trimmedLine.includes('call')) inputDataObj.appointmentsSetCallsMade = (inputDataObj.appointmentsSetCallsMade || 0) + count;
                    else if (trimmedLine.includes('referral')) inputDataObj.appointmentsSetReferrals = (inputDataObj.appointmentsSetReferrals || 0) + count;
                    else if (trimmedLine.includes('inbound')) inputDataObj.appointmentsSetInbound = (inputDataObj.appointmentsSetInbound || 0) + count;
                    hasData = true;
                  } else if (trimmedLine.includes('appointment')) {
                    // Default to appointments if not specified as set or held
                    inputDataObj.appointments = (inputDataObj.appointments || 0) + count;
                    if (trimmedLine.includes('door')) inputDataObj.appointmentsSetDoorKnocks = (inputDataObj.appointmentsSetDoorKnocks || 0) + count;
                    else if (trimmedLine.includes('tag')) inputDataObj.appointmentsSetTagsPut = (inputDataObj.appointmentsSetTagsPut || 0) + count;
                    else if (trimmedLine.includes('call')) inputDataObj.appointmentsSetCallsMade = (inputDataObj.appointmentsSetCallsMade || 0) + count;
                    else if (trimmedLine.includes('referral')) inputDataObj.appointmentsSetReferrals = (inputDataObj.appointmentsSetReferrals || 0) + count;
                    else if (trimmedLine.includes('inbound')) inputDataObj.appointmentsSetInbound = (inputDataObj.appointmentsSetInbound || 0) + count;
                    hasData = true;
                  } else if (trimmedLine.includes('deal') || trimmedLine.includes('closed')) {
                    inputDataObj.closedDeals = (inputDataObj.closedDeals || 0) + count;
                    if (trimmedLine.includes('door')) inputDataObj.dealsClosedDoorKnocks = (inputDataObj.dealsClosedDoorKnocks || 0) + count;
                    else if (trimmedLine.includes('tag')) inputDataObj.dealsClosedTagsPut = (inputDataObj.dealsClosedTagsPut || 0) + count;
                    else if (trimmedLine.includes('call')) inputDataObj.dealsClosedCallsMade = (inputDataObj.dealsClosedCallsMade || 0) + count;
                    else if (trimmedLine.includes('referral')) inputDataObj.dealsClosedReferrals = (inputDataObj.dealsClosedReferrals || 0) + count;
                    else if (trimmedLine.includes('inbound')) inputDataObj.dealsClosedInbound = (inputDataObj.dealsClosedInbound || 0) + count;
                    hasData = true;
                  } else if (trimmedLine.includes('account') || trimmedLine.includes('serviced')) {
                    inputDataObj.accountsServiced = (inputDataObj.accountsServiced || 0) + count;
                    if (trimmedLine.includes('door')) inputDataObj.accountsServicedDoorKnocks = (inputDataObj.accountsServicedDoorKnocks || 0) + count;
                    else if (trimmedLine.includes('tag')) inputDataObj.accountsServicedTagsPut = (inputDataObj.accountsServicedTagsPut || 0) + count;
                    else if (trimmedLine.includes('call')) inputDataObj.accountsServicedCallsMade = (inputDataObj.accountsServicedCallsMade || 0) + count;
                    else if (trimmedLine.includes('referral')) inputDataObj.accountsServicedReferrals = (inputDataObj.accountsServicedReferrals || 0) + count;
                    else if (trimmedLine.includes('inbound')) inputDataObj.accountsServicedInbound = (inputDataObj.accountsServicedInbound || 0) + count;
                    hasData = true;
                  } else if (trimmedLine.includes('knocked') || trimmedLine.includes('door')) {
                    inputDataObj.doorsKnocked = (inputDataObj.doorsKnocked || 0) + count;
                    hasData = true;
                  }
                }
              }
              
              if (hasData) {
                inputData = { type: 'dailyInput', data: inputDataObj };
              }
            }
          } else if (lowerMessage.includes('from') && (lowerMessage.includes('door') || lowerMessage.includes('tag') || lowerMessage.includes('call') || lowerMessage.includes('referral') || lowerMessage.includes('inbound'))) {
            // Handle detailed sub-inputs
            const count = numbers ? parseInt(numbers[0]) : 0;
            if (count > 0) {
              const inputDataObj: any = {};
              
              if (lowerMessage.includes('appointment') && lowerMessage.includes('held')) {
                inputDataObj.appointmentHolds = count;
                if (lowerMessage.includes('door')) inputDataObj.appointmentsHeldDoorKnocks = count;
                else if (lowerMessage.includes('tag')) inputDataObj.appointmentsHeldTagsPut = count;
                else if (lowerMessage.includes('call')) inputDataObj.appointmentsHeldCallsMade = count;
                else if (lowerMessage.includes('referral')) inputDataObj.appointmentsHeldReferrals = count;
                else if (lowerMessage.includes('inbound')) inputDataObj.appointmentsHeldInbound = count;
              } else if (lowerMessage.includes('appointment') && lowerMessage.includes('set')) {
                inputDataObj.appointments = count;
                if (lowerMessage.includes('door')) inputDataObj.appointmentsSetDoorKnocks = count;
                else if (lowerMessage.includes('tag')) inputDataObj.appointmentsSetTagsPut = count;
                else if (lowerMessage.includes('call')) inputDataObj.appointmentsSetCallsMade = count;
                else if (lowerMessage.includes('referral')) inputDataObj.appointmentsSetReferrals = count;
                else if (lowerMessage.includes('inbound')) inputDataObj.appointmentsSetInbound = count;
              } else if (lowerMessage.includes('appointment')) {
                // Default to appointments if not specified as set or held
                inputDataObj.appointments = count;
                if (lowerMessage.includes('door')) inputDataObj.appointmentsSetDoorKnocks = count;
                else if (lowerMessage.includes('tag')) inputDataObj.appointmentsSetTagsPut = count;
                else if (lowerMessage.includes('call')) inputDataObj.appointmentsSetCallsMade = count;
                else if (lowerMessage.includes('referral')) inputDataObj.appointmentsSetReferrals = count;
                else if (lowerMessage.includes('inbound')) inputDataObj.appointmentsSetInbound = count;
              } else if (lowerMessage.includes('deal') || lowerMessage.includes('closed')) {
                inputDataObj.closedDeals = count;
                if (lowerMessage.includes('door')) inputDataObj.dealsClosedDoorKnocks = count;
                else if (lowerMessage.includes('tag')) inputDataObj.dealsClosedTagsPut = count;
                else if (lowerMessage.includes('call')) inputDataObj.dealsClosedCallsMade = count;
                else if (lowerMessage.includes('referral')) inputDataObj.dealsClosedReferrals = count;
                else if (lowerMessage.includes('inbound')) inputDataObj.dealsClosedInbound = count;
              } else if (lowerMessage.includes('account') || lowerMessage.includes('serviced')) {
                inputDataObj.accountsServiced = count;
                if (lowerMessage.includes('door')) inputDataObj.accountsServicedDoorKnocks = count;
                else if (lowerMessage.includes('tag')) inputDataObj.accountsServicedTagsPut = count;
                else if (lowerMessage.includes('call')) inputDataObj.accountsServicedCallsMade = count;
                else if (lowerMessage.includes('referral')) inputDataObj.accountsServicedReferrals = count;
                else if (lowerMessage.includes('inbound')) inputDataObj.accountsServicedInbound = count;
              }
              
              if (Object.keys(inputDataObj).length > 0) {
                inputData = { type: 'dailyInput', data: inputDataObj };
              }
            }
          } else if (lowerMessage.includes('knocked') || lowerMessage.includes('door')) {
            const count = numbers ? parseInt(numbers[0]) : 0;
            if (count > 0) {
              inputData = { type: 'dailyInput', data: { doorsKnocked: count } };
            }
          } else if (lowerMessage.includes('appointment') || lowerMessage.includes('set')) {
            const count = numbers ? parseInt(numbers[0]) : 0;
            if (count > 0) {
              inputData = { type: 'dailyInput', data: { appointments: count } };
            }
          } else if (lowerMessage.includes('deal') || lowerMessage.includes('closed')) {
            const count = numbers ? parseInt(numbers[0]) : 0;
            if (count > 0) {
              inputData = { type: 'dailyInput', data: { closedDeals: count } };
            }
          } else if (lowerMessage.includes('hour') || lowerMessage.includes('worked')) {
            const count = numbers ? parseInt(numbers[0]) : 0;
            if (count > 0) {
              inputData = { type: 'dailyInput', data: { hoursWorked: count } };
            }
          } else if (amountMatch) {
            const amount = parseFloat(amountMatch[1]);
            const description = text.replace(/\$(\d+(?:\.\d{2})?)/, '').replace(/add/i, '').trim();
            inputData = { type: 'expense', data: { amount, description } };
          } else if (lowerMessage.includes('mile')) {
            const mileageMatch = text.match(/(\d+(?:\.\d+)?)\s*miles?/i);
            if (mileageMatch) {
              const miles = parseFloat(mileageMatch[1]);
              inputData = { type: 'mileage', data: { miles, purpose: 'Business trip' } };
            }
          }
        }
      }
      
      // Save data if Jessica recognized an input command
      if (shouldSaveData && inputData) {
        try {
          let saveResult = null;
          switch (inputData.type) {
            case 'dailyInput':
              saveResult = await JessicaInputService.addDailyInput(inputData.data as any);
              break;
            case 'expense':
              // Handle both single expenses and arrays of expenses from AI
              if (Array.isArray(inputData.data)) {
                // Handle multiple expenses from AI
                for (const expense of inputData.data) {
                  await JessicaInputService.addExpense(expense);
                }
                saveResult = { success: true };
              } else {
                saveResult = await JessicaInputService.addExpense(inputData.data as any);
              }
              break;
            case 'mileage':
              // Create proper mileage trip data structure
              const mileageData = {
                startLocation: { latitude: 0, longitude: 0 },
                endLocation: { latitude: 0, longitude: 0 },
                distance: inputData.data.miles || 0,
                tripType: 'business' as const,
                purpose: inputData.data.purpose || 'Business trip',
                startTime: new Date().toISOString()
              };
              saveResult = await JessicaInputService.addMileageTrip(mileageData);
              break;
            default:
              console.log('Unknown input type:', inputData.type);
              break;
          }
          
          if (saveResult?.success) {
            // Update Jessica's response to confirm the data was saved
            const jessicaMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: `${jessicaResponse}\n\n✅ Data saved successfully!`,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, jessicaMessage]);
            
            // Trigger a comprehensive refresh of the KPI store data
            setTimeout(async () => {
              try {
                const kpiStore = useKPIStore.getState();
                console.log('🔄 Triggering data refresh after Jessica save...');
                
                // Force reload from database first
                await kpiStore.forceReload();
                
                // Then sync with cloud to ensure consistency
                await kpiStore.syncData();
                
                console.log('✅ Data refresh completed after Jessica save');
              } catch (error) {
                console.error('❌ Failed to refresh data after Jessica save:', error);
              }
            }, 1000); // Increased delay to ensure backend save is complete
          } else {
            // If save failed, show original response
            const jessicaMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: jessicaResponse,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, jessicaMessage]);
          }
        } catch (error) {
          console.error('Error saving data:', error);
          // Show original response if save failed
          const jessicaMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: jessicaResponse,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, jessicaMessage]);
        }
      } else {
        // Regular response (no data to save)
        const jessicaMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: jessicaResponse,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, jessicaMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble processing your request right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendMessage(inputText, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <LinearGradient
      colors={['#1a1f2e', '#2d3748', '#4a5568']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-600">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white font-semibold ml-2">Jessica Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Messages */}
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 py-3"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 ${message.isUser ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.isUser
                      ? 'bg-blue-500 rounded-br-md'
                      : 'bg-white rounded-bl-md'
                  }`}
                >
                  {message.imageUri && (
                    <Image
                      source={{ uri: message.imageUri }}
                      className="w-48 h-32 rounded-lg mb-2"
                      resizeMode="cover"
                    />
                  )}
                  <Text
                    className={`text-sm ${
                      message.isUser ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {message.text}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      message.isUser ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View className="items-start mb-4">
                <View className="bg-white rounded-2xl rounded-bl-md px-4 py-3">
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-2">Jessica is typing...</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Footer */}
          <View className="bg-white border-t border-gray-200 px-4 py-3">
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={pickImage}
                className="bg-gray-100 p-3 rounded-full"
              >
                <Ionicons name="attach" size={20} color="#6b7280" />
              </TouchableOpacity>
              
              <View className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex-row items-center">
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-gray-900 text-sm"
                  multiline
                  maxLength={1000}
                />
              </View>
              
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim() && !isLoading}
                className={`p-3 rounded-full ${
                  inputText.trim() ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? 'white' : '#9ca3af'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}; 