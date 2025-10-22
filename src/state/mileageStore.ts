import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { generateUniqueId } from '../utils/generateId';
import { databaseService } from '../services/database';
import {
  startLocationTracking,
  stopLocationTracking,
  requestComprehensivePermissions,
  calculateTotalMiles,
  startAutomaticTripDetection,
  stopAutomaticTripDetection,
} from '../services/mileageTrackingService';

export interface MileageTrip {
  id: string;
  startTime: string;
  endTime?: string;
  startLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  distance: number; // in miles
  duration?: number; // in minutes
  tripType: 'business' | 'personal' | 'medical' | 'charity'; // Trip categorization
  irsRate: number; // per mile deduction rate (varies by trip type)
  value: number; // calculated value (distance * irsRate)
  purpose: string;
  clientTag?: string;
  jobTag?: string;
  status: 'active' | 'completed' | 'cancelled';
  route?: Location.LocationObject[]; // GPS tracking points
  isAutoTracked: boolean; // Whether this trip was automatically detected
  mapPreview?: {
    startAddress: string;
    endAddress: string;
    routePolyline?: string; // For map display
  };
  createdAt: string;
  updatedAt: string;
}

// IRS rates for different trip types (2024 rates)
export const IRS_RATES = {
  business: 0.67, // Business: $0.67 per mile
  medical: 0.21,  // Medical: $0.21 per mile
  charity: 0.14,  // Charity: $0.14 per mile
  personal: 0.00, // Personal: $0.00 per mile (no deduction)
} as const;

export type TripType = keyof typeof IRS_RATES;

export interface MileageFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  distanceRange?: {
    min: number;
    max: number;
  };
  clientTags?: string[];
  minValue?: number;
}

interface MileageState {
  currentUserId: string | null;
  trips: MileageTrip[];
  currentTrip: MileageTrip | null;
  isTracking: boolean;
  isLoading: boolean;
  lastLocationUpdate: string | null;
  currentIrsRate: number; // 2024 IRS business mileage rate
  autoTrackingEnabled: boolean; // Auto-track trips setting
  
  // User management
  setCurrentUser: (userId: string) => void;
  clearUserData: () => void;
  loadUserData: (userId: string) => Promise<void>;
  saveUserData: () => Promise<void>;
  
  // Trip management
  startTrip: (purpose: string, tripType: TripType, forceStart?: boolean) => Promise<{ success: boolean; error?: string; showSettings?: boolean }>;
  stopTrip: () => Promise<boolean>;
  cancelTrip: () => void;
  addTrip: (trip: Omit<MileageTrip, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addManualTrip: (tripData: {
    startLocation: { latitude: number; longitude: number; address?: string };
    endLocation: { latitude: number; longitude: number; address?: string };
    distance: number;
    tripType: TripType;
    purpose: string;
    startTime: string;
    endTime: string;
  }) => void;
  updateTrip: (tripId: string, updates: Partial<MileageTrip>) => void;
  deleteTrip: (tripId: string) => void;
  tagTrip: (tripId: string, clientTag?: string, jobTag?: string) => void;
  categorizeTrip: (tripId: string, tripType: TripType) => void;
  
  // Automatic trip detection
  addAutoDetectedTrip: (tripData: {
    startLocation: { latitude: number; longitude: number; address?: string };
    endLocation: { latitude: number; longitude: number; address?: string };
    distance: number;
    startTime: string;
    endTime: string;
    route: Location.LocationObject[];
  }) => void;
  
  // Location tracking
  updateCurrentLocation: (location: Location.LocationObject) => void;
  requestLocationPermissions: () => Promise<{ success: boolean; message?: string; showSettings?: boolean }>;
  
  // Settings
  toggleAutoTracking: (enabled: boolean) => void;
  startAutomaticTracking: () => void;
  stopAutomaticTracking: () => void;
  
  // Getters
  getFilteredTrips: (filters: MileageFilters) => MileageTrip[];
  getTotalMileage: () => number;
  getTotalDeduction: () => number;
  getMonthlyMileage: (month: number, year: number) => number;
  getMonthlyDeduction: (month: number, year: number) => number;
  getTripsByType: (tripType: TripType) => MileageTrip[];
}

// Haversine formula to calculate distance between two points
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result.length > 0) {
      const address = result[0];
      return `${address.street || ''} ${address.city || ''}, ${address.region || ''}`.trim();
    }
  } catch (error) {
    console.warn('Geocoding failed:', error);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

export const useMileageStore = create<MileageState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      trips: [],
      currentTrip: null,
      isTracking: false,
      isLoading: false,
      lastLocationUpdate: null,
      currentIrsRate: 0.67, // 2024 IRS business mileage rate
      autoTrackingEnabled: true, // Default to enabled

      setCurrentUser: (userId: string) => {
        set({ currentUserId: userId });
      },

      clearUserData: () => {
        set({
          currentUserId: null,
          trips: [],
          currentTrip: null,
          isTracking: false,
          lastLocationUpdate: null,
        });
      },

      loadUserData: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          // Load trips from database
          const trips = await databaseService.getMileageTrips(userId);
          
          set({
            currentUserId: userId,
            trips: trips,
            currentTrip: null, // Current trips should not persist across sessions
            isTracking: false, // Tracking should not persist across sessions
            lastLocationUpdate: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load user mileage data:', error);
          set({
            currentUserId: userId,
            trips: [],
            currentTrip: null,
            isTracking: false,
            lastLocationUpdate: null,
            isLoading: false,
          });
        }
      },

      saveUserData: async () => {
        const state = get();
        if (!state.currentUserId) return;
        
        try {
          // Save all trips to database
          await Promise.all(
            state.trips.map(trip => databaseService.saveMileageTrip(state.currentUserId!, trip))
          );
        } catch (error) {
          console.error('Failed to save user mileage data:', error);
        }
      },

      requestLocationPermissions: async () => {
        try {
          // First check current permissions
          const currentPermissions = await Location.getForegroundPermissionsAsync();
          
          if (currentPermissions.status !== 'granted') {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              console.error('Location permission not granted');
              return { success: false, message: 'Location permission is required for mileage tracking.' };
            }
          }
          
          // Check background permissions
          const backgroundPermissions = await Location.getBackgroundPermissionsAsync();
          
          if (backgroundPermissions.status !== 'granted') {
            const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
            
            if (backgroundStatus.status !== 'granted') {
              // Show guidance for enabling always-allow
              console.warn('Background location permission not granted - user needs to enable "Always Allow" in settings');
              
              // Check if they selected "While Using App" instead of denying completely
              if (backgroundStatus.status === 'denied' && currentPermissions.status === 'granted') {
                return { 
                  success: false, 
                  message: 'Mileage tracking works best with "Always Allow" location access. You can still track trips manually, but automatic background tracking requires this permission.',
                  showSettings: true 
                };
              } else {
                return { 
                  success: false, 
                  message: 'Location access is required for mileage tracking.',
                  showSettings: false 
                };
              }
            }
          }
          
          return { success: true };
        } catch (error) {
          console.error('Error requesting location permissions:', error);
          return { success: false, message: 'Failed to request location permissions.' };
        }
      },

      startTrip: async (purpose: string, tripType: TripType = 'business', forceStart?: boolean) => {
        const state = get();
        if (!state.currentUserId) return { success: false, error: 'No user ID' };
        const permissionsGranted = await requestComprehensivePermissions();
        if (!permissionsGranted) {
          return { success: false, error: 'Location permissions not granted', showSettings: true };
        }
        // Start background tracking
        await startLocationTracking(state.currentUserId);
        set({
          isTracking: true,
          currentTrip: {
            id: generateUniqueId(),
            startTime: new Date().toISOString(),
            startLocation: { latitude: 0, longitude: 0 }, // Will be updated on first location
            distance: 0,
            tripType,
            irsRate: IRS_RATES[tripType],
            value: 0,
            purpose,
            status: 'active',
            isAutoTracked: false,
            route: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        return { success: true };
      },
      stopTrip: async () => {
        const state = get();
        if (!state.isTracking || !state.currentTrip) return false;
        await stopLocationTracking();
        // Finalize trip
        const endTime = new Date().toISOString();
        const trip: MileageTrip = {
          ...state.currentTrip,
          endTime,
          status: 'completed',
          updatedAt: endTime,
        };
        set(state => ({
          trips: [...state.trips, trip],
          currentTrip: null,
          isTracking: false,
        }));
        // Save to Supabase
        await databaseService.saveMileageTrip(state.currentUserId!, trip);
        return true;
      },

      cancelTrip: () => {
        set({
          currentTrip: null,
          isTracking: false,
        });
        setTimeout(() => get().saveUserData(), 0);
      },

      updateCurrentLocation: (location: Location.LocationObject) => {
        const state = get();
        if (!state.currentTrip || !state.isTracking) return;

        const updatedRoute = [...(state.currentTrip.route || []), location];
        const updatedTrip = {
          ...state.currentTrip,
          route: updatedRoute,
          updatedAt: new Date().toISOString(),
        };

        set({
          currentTrip: updatedTrip,
          lastLocationUpdate: new Date().toISOString(),
        });
      },

      addTrip: (tripData) => {
        const newTrip: MileageTrip = {
          ...tripData,
          id: generateUniqueId('trip_'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set(state => ({
          trips: [...state.trips, newTrip],
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      addManualTrip: (tripData) => {
        const newTrip: MileageTrip = {
          ...tripData,
          id: generateUniqueId('trip_'),
          irsRate: IRS_RATES[tripData.tripType],
          value: tripData.distance * IRS_RATES[tripData.tripType],
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isAutoTracked: false,
          route: [], // Manual trips don't have a route
        };

        set(state => ({
          trips: [...state.trips, newTrip],
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      updateTrip: (tripId: string, updates: Partial<MileageTrip>) => {
        const state = get();
        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId 
              ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
              : trip
          ),
        }));
        
        // Use individual update instead of saving all trips
        if (state.currentUserId) {
          databaseService.updateMileageTrip(state.currentUserId, tripId, updates)
            .catch(error => console.error('Failed to update trip:', error));
        }
      },

      deleteTrip: (tripId: string) => {
        const state = get();
        if (state.currentUserId) {
          // Delete from database immediately
          databaseService.deleteMileageTrip(state.currentUserId, tripId).catch(error => 
            console.error('Failed to delete trip from database:', error)
          );
        }
        
        set(state => ({
          trips: state.trips.filter(trip => trip.id !== tripId),
        }));
      },

      tagTrip: (tripId: string, clientTag?: string, jobTag?: string) => {
        const state = get();
        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId 
              ? { ...trip, clientTag, jobTag, updatedAt: new Date().toISOString() }
              : trip
          ),
        }));
        
        // Use individual update instead of saving all trips
        if (state.currentUserId) {
          databaseService.updateMileageTrip(state.currentUserId, tripId, {
            clientTag,
            jobTag,
          }).catch(error => console.error('Failed to update trip tags:', error));
        }
      },

      categorizeTrip: (tripId: string, tripType: TripType) => {
        const updates = {
          tripType,
          irsRate: IRS_RATES[tripType],
          value: 0, // Will be calculated below
        };
        
        set(state => {
          const updatedTrips = state.trips.map(trip =>
            trip.id === tripId 
              ? { 
                  ...trip, 
                  ...updates,
                  value: trip.distance * IRS_RATES[tripType],
                  updatedAt: new Date().toISOString() 
                }
              : trip
          );
          
          // Use individual update instead of saving all trips
          if (state.currentUserId) {
            databaseService.updateMileageTrip(state.currentUserId, tripId, {
              ...updates,
              value: updatedTrips.find(t => t.id === tripId)?.value || 0,
            }).catch(error => console.error('Failed to update trip category:', error));
          }
          
          return { trips: updatedTrips };
        });
      },

      addAutoDetectedTrip: (tripData) => {
        const newTrip: MileageTrip = {
          ...tripData,
          id: generateUniqueId('trip_'),
          tripType: 'business', // Default to business, user can change later
          irsRate: IRS_RATES.business,
          value: tripData.distance * IRS_RATES.business,
          purpose: 'Auto-detected trip',
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isAutoTracked: true,
        };

        set(state => ({
          trips: [...state.trips, newTrip],
        }));
        setTimeout(() => get().saveUserData(), 0);
      },

      toggleAutoTracking: (enabled: boolean) => {
        set({ autoTrackingEnabled: enabled });
      },

      startAutomaticTracking: () => {
        const state = get();
        if (!state.currentUserId) {
          console.error('Cannot start automatic tracking: no user ID');
          return;
        }
        startAutomaticTripDetection(state.currentUserId);
      },

      stopAutomaticTracking: () => {
        stopAutomaticTripDetection();
      },

      getFilteredTrips: (filters: MileageFilters) => {
        const state = get();
        let trips = [...state.trips];

        if (filters.dateRange) {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          trips = trips.filter(trip => {
            const tripDate = new Date(trip.startTime);
            return tripDate >= start && tripDate <= end;
          });
        }

        if (filters.distanceRange) {
          trips = trips.filter(trip => 
            trip.distance >= filters.distanceRange!.min && 
            trip.distance <= filters.distanceRange!.max
          );
        }

        if (filters.clientTags && filters.clientTags.length > 0) {
          trips = trips.filter(trip => 
            trip.clientTag && filters.clientTags!.includes(trip.clientTag)
          );
        }

        if (filters.minValue) {
          trips = trips.filter(trip => trip.value >= filters.minValue!);
        }

        return trips.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      },

      getTotalMileage: () => {
        const state = get();
        return state.trips
          .filter(trip => trip.status === 'completed')
          .reduce((total, trip) => total + trip.distance, 0);
      },

      getTotalDeduction: () => {
        const state = get();
        return state.trips
          .filter(trip => trip.status === 'completed')
          .reduce((total, trip) => total + trip.value, 0);
      },

      getMonthlyMileage: (month: number, year: number) => {
        const state = get();
        return state.trips
          .filter(trip => {
            const tripDate = new Date(trip.startTime);
            return tripDate.getMonth() === month && 
                   tripDate.getFullYear() === year &&
                   trip.status === 'completed';
          })
          .reduce((total, trip) => total + trip.distance, 0);
      },

      getMonthlyDeduction: (month: number, year: number) => {
        const state = get();
        return state.trips
          .filter(trip => {
            const tripDate = new Date(trip.startTime);
            return tripDate.getMonth() === month && 
                   tripDate.getFullYear() === year &&
                   trip.status === 'completed';
          })
          .reduce((total, trip) => total + trip.value, 0);
      },

      getTripsByType: (tripType: TripType) => {
        const state = get();
        return state.trips.filter(trip => trip.tripType === tripType);
      },
    }),
    {
      name: 'mileage-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        // Don't persist user-specific data here - it's handled by loadUserData/saveUserData
      }),
    }
  )
);