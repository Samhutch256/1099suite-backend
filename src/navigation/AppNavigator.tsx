import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';

// App screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { KPIScreen } from '../screens/KPIScreen';
import { CRMScreen } from '../screens/CRMScreen';

import { TallyOutreachScreen } from '../screens/TallyOutreachScreen';
import { AddLeadScreen } from '../screens/AddLeadScreen';
import { DeductionsScreen } from '../screens/DeductionsScreen';
import { LoggedExpensesScreen } from '../screens/LoggedExpensesScreen';
import { LoggedMileageScreen } from '../screens/LoggedMileageScreen';
import { MileageScreen } from '../screens/MileageScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { DailyInputScreen } from '../screens/DailyInputScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditLeadScreen } from '../screens/EditLeadScreen';
import { LeadDetailScreen } from '../screens/LeadDetailScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { TransactionReviewScreen } from '../screens/TransactionReviewScreen';
import { DatabaseDebugScreen } from '../screens/DatabaseDebugScreen';

// Stores
import { useAuthStore } from '../state/authStore';
import { useKPIStore } from '../state/kpiStore';
import { useContractorStore } from '../state/contractorStore';
import { usePlaidStore } from '../state/plaidStore';
import { useMileageStore } from '../state/mileageStore';
import { useOutreachStore } from '../state/outreachStore';
import { useSettingsStore } from '../state/settingsStore';
import { useLeadFilterStore } from '../state/leadFilterStore';
import { useJessicaChatStore } from '../state/jessicaChatStore';
import { databaseService } from '../services/database';
import { ensureLocationUpdates } from '../services/everlanceTrackingService';

// Components
import { LoadingScreen } from '../components/LoadingScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthErrorHandler } from '../components/AuthErrorHandler';
import { JessicaChatWrapper } from '../components/JessicaChatWrapper';
import { View, Text } from 'react-native';

export type RootStackParamList = {
  MainTabs: undefined;
  AddLead: undefined;
  TallyOutreach: { date?: string };
  DailyInput: { date?: string };
  Profile: undefined;
  EditLead: { leadId: string };
  LeadDetail: { leadId: string };
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  TransactionReview: undefined;
  LoggedExpenses: undefined;
  LoggedMileage: undefined;
  Mileage: undefined;
  TripDetail: { tripId?: string };
  DatabaseDebug: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      id={undefined}
      initialRouteName="KPI"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          // Dashboard tab is temporarily hidden
          // if (route.name === 'Dashboard') {
          //   iconName = focused ? 'grid' : 'grid-outline';
          // } else 
          if (route.name === 'KPI') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'DailyInput') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'CRM') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Deductions') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff8c00',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#1a1f2e',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      {/* Overview tab temporarily hidden - can be restored by uncommenting below */}
      {/* <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Overview' }}
      /> */}
      <Tab.Screen 
        name="KPI" 
        component={KPIScreen}
        options={{ title: 'KPI' }}
      />
      <Tab.Screen 
        name="DailyInput" 
        component={DailyInputScreen}
        options={{ title: 'Input' }}
      />
      <Tab.Screen 
        name="CRM" 
        component={CRMScreen}
        options={{ title: 'Leads' }}
      />
      <Tab.Screen 
        name="Deductions" 
        component={DeductionsScreen}
        options={{ title: 'Deductions' }}
      />
    </Tab.Navigator>
  );
};

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="AddLead" 
        component={AddLeadScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="TallyOutreach" 
        component={TallyOutreachScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: true,
          title: 'Count Your Outreach',
          headerStyle: {
            backgroundColor: '#1a1f2e',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="DailyInput" 
        component={DailyInputScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="EditLead" 
        component={EditLeadScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
          headerShown: true,
          title: 'Edit Lead',
        }}
      />
      <Stack.Screen 
        name="LeadDetail" 
        component={LeadDetailScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="TransactionReview" 
        component={TransactionReviewScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="LoggedExpenses" 
        component={LoggedExpensesScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="LoggedMileage" 
        component={LoggedMileageScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="Mileage" 
        component={MileageScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="TripDetail" 
        component={TripDetailScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="DatabaseDebug" 
        component={DatabaseDebugScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

    </Stack.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, checkAuthState, migrateUserData, consolidateAccounts, initializeSupabase } = useAuthStore();
  const { setCurrentUser, loadUserData } = useKPIStore();
  const { setCurrentUser: setContractorUser, loadUserData: loadContractorData } = useContractorStore();
  const { setCurrentUser: setPlaidUser, loadUserData: loadPlaidData, initializeOnAppLaunch } = usePlaidStore();
  const { setCurrentUser: setMileageUser, loadUserData: loadMileageData } = useMileageStore();
  const { setCurrentUser: setOutreachUser } = useOutreachStore();
  const { setCurrentUser: setSettingsUser, loadUserSettings: loadSettingsData } = useSettingsStore();
  const { setCurrentUser: setFilterUser, initializeWithUser: initializeFilterUser } = useLeadFilterStore();
  const { setCurrentUser: setJessicaUser } = useJessicaChatStore();
  const [appInitialized, setAppInitialized] = useState(false);

  // Initialize app once on startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Initialize Supabase first
        await initializeSupabase();
        
        // Then check auth state
        await checkAuthState();
        
        console.log('✅ App initialized with Supabase');
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        // Continue anyway to prevent stuck loading
      } finally {
        setAppInitialized(true);
      }
    };

    // Add timeout to prevent stuck loading
    const timeout = setTimeout(() => {
      console.log('⏰ Auth initialization timeout, proceeding...');
      setAppInitialized(true);
    }, 3000);

    initializeApp().finally(() => clearTimeout(timeout));
  }, []);

  // Setup user data when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !appInitialized) return;

    const setupUserData = async () => {
      try {
        console.log('📈 Setting up user data for:', user.email);
        
        // Set current user in all stores
        setCurrentUser(user.id);
        setContractorUser(user.id);
        setPlaidUser(user.id);
        setMileageUser(user.id);
        setOutreachUser(user.id);
        setSettingsUser(user.id);
        await initializeFilterUser(user.id); // Initialize filter store with database settings
        setJessicaUser(user.id);

        // Save user to database
        await databaseService.saveUser({
          userId: user.id,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          provider: user.provider,
          createdAt: user.createdAt || new Date().toISOString(),
          lastLoginAt: user.lastLoginAt || new Date().toISOString(),
        });

        // Load essential data
        await Promise.all([
          loadUserData(user.id),
          loadContractorData(user.id),
          loadMileageData(user.id),
          loadSettingsData(user.id)
          // Note: loadFilterData is no longer needed since initializeFilterUser handles it
        ]);

        // Run background operations without blocking UI
        setTimeout(async () => {
          try {
            await consolidateAccounts();
            await migrateUserData();
            await initializeOnAppLaunch(user.id);
            // Start background mileage tracking if enabled
            await ensureLocationUpdates(user.id);
          } catch (error) {
            console.error('Background operations failed:', error);
          }
        }, 1000);
        
        console.log('✅ User data setup completed');
      } catch (error) {
        console.error('Failed to setup user data:', error);
        // Ensure user IDs are set even if other operations fail
        setCurrentUser(user.id);
        setContractorUser(user.id);
        setPlaidUser(user.id);
        setMileageUser(user.id);
        setOutreachUser(user.id);
        setSettingsUser(user.id);
        setFilterUser(user.id);
        setJessicaUser(user.id);
      }
    };

    setupUserData();
  }, [isAuthenticated, user, appInitialized]);

  // Ensure filter settings are loaded even if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && user && appInitialized) {
      const { initializeWithUser } = useLeadFilterStore.getState();
      initializeWithUser(user.id);
    }
  }, [isAuthenticated, user, appInitialized]);

  // Show loading only during initial app startup
  if (!appInitialized || (isLoading && !isAuthenticated && !user)) {
    return (
      <LoadingScreen 
        onTimeout={() => {
          console.log('🚨 Loading timeout, continuing to app...');
          setAppInitialized(true);
        }}
        timeoutDuration={5000}
      />
    );
  }

  // Show onboarding for new authenticated users who haven't completed it
  if (isAuthenticated && user && user.onboardingCompleted === false) {
    console.log('🎯 Showing onboarding for user:', user.email, 'onboardingCompleted:', user.onboardingCompleted);
    return (
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      </Stack.Navigator>
    );
  }
  
  console.log('🏠 Showing main app for user:', user?.email, 'onboardingCompleted:', user?.onboardingCompleted);

  try {
    return (
      <ErrorBoundary>
        <AuthErrorHandler>
          {isAuthenticated && user ? (
            <JessicaChatWrapper>
              <AppStack />
            </JessicaChatWrapper>
          ) : (
            <AuthNavigator />
          )}
        </AuthErrorHandler>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Navigation error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1f2e' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>Navigation Error - Please restart the app</Text>
      </View>
    );
  }
};