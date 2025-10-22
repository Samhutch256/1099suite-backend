import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert, Platform } from 'react-native';
import { useMileageStore, MileageTrip, TripType, IRS_RATES } from '../state/mileageStore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const LOCATION_TASK_NAME = 'background-location-tracking';
const BACKGROUND_FETCH_TASK = 'background-fetch-trips';
const MIN_TRIP_DISTANCE = 0.1; // Minimum 0.1 miles to count as a trip
const MIN_TRIP_DURATION = 2 * 60 * 1000; // Minimum 2 minutes
const STOP_DETECTION_TIME = 5 * 60 * 1000; // 5 minutes of no movement to end trip
const MIN_SPEED_THRESHOLD = 5; // 5 mph minimum to consider movement
const MAX_SPEED_THRESHOLD = 80; // 80 mph maximum to filter out GPS errors
const LOCATION_ACCURACY_THRESHOLD = 100; // 100 meters accuracy threshold

interface TripDetectionState {
  isTracking: boolean;
  currentTrip: {
    startTime: Date;
    startLocation: Location.LocationObject;
    route: Location.LocationObject[];
    lastMovementTime: number;
    totalDistance: number;
  } | null;
  userId: string | null;
  lastKnownLocation: Location.LocationObject | null;
  backgroundTaskRegistered: boolean;
}

let tripDetectionState: TripDetectionState = {
  isTracking: false,
  currentTrip: null,
  userId: null,
  lastKnownLocation: null,
  backgroundTaskRegistered: false,
};

// Configure notifications for background tracking
const configureNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }



  return true;
};

// Calculate distance between two points using Haversine formula
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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate total distance from route points
const calculateTotalDistance = (route: Location.LocationObject[]): number => {
  if (route.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    
    // Filter out inaccurate GPS points
    if (prev.coords.accuracy && prev.coords.accuracy > LOCATION_ACCURACY_THRESHOLD) continue;
    if (curr.coords.accuracy && curr.coords.accuracy > LOCATION_ACCURACY_THRESHOLD) continue;
    
    totalDistance += calculateDistance(
      prev.coords.latitude,
      prev.coords.longitude,
      curr.coords.latitude,
      curr.coords.longitude
    );
  }
  return totalDistance;
};

// Reverse geocode location to get address
const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const result = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (result.length > 0) {
      const address = result[0];
      const parts = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
      ].filter(Boolean);
      return parts.join(', ');
    }
    return 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return 'Unknown location';
  }
};

// Detect if user is moving based on speed and location changes
const isUserMoving = (location: Location.LocationObject): boolean => {
  const speed = location.coords.speed || 0;
  const speedMph = speed * 2.237; // Convert m/s to mph
  
  // Check if speed is within reasonable driving range
  if (speedMph < MIN_SPEED_THRESHOLD || speedMph > MAX_SPEED_THRESHOLD) {
    return false;
  }
  
  // Additional check: if we have a previous location, check distance moved
  if (tripDetectionState.lastKnownLocation) {
    const distance = calculateDistance(
      tripDetectionState.lastKnownLocation.coords.latitude,
      tripDetectionState.lastKnownLocation.coords.longitude,
      location.coords.latitude,
      location.coords.longitude
    );
    
    // If distance is too small, likely not moving
    if (distance < 0.01) { // Less than 0.01 miles
      return false;
    }
  }
  
  return true;
};

// Validate location accuracy and filter out bad GPS data
const isValidLocation = (location: Location.LocationObject): boolean => {
  // Check accuracy
  if (location.coords.accuracy && location.coords.accuracy > LOCATION_ACCURACY_THRESHOLD) {
    return false;
  }
  
  // Check if coordinates are reasonable
  if (location.coords.latitude === 0 && location.coords.longitude === 0) {
    return false;
  }
  
  // Check timestamp (should be recent)
  const now = Date.now();
  const locationTime = location.timestamp || now;
  if (Math.abs(now - locationTime) > 30000) { // 30 seconds
    return false;
  }
  
  return true;
};

// Start automatic trip detection with background capabilities
export const startAutomaticTripDetection = async (userId: string): Promise<boolean> => {
  try {
    // Configure notifications first
    await configureNotifications();
    
    // Check if task is already defined
    if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
      defineLocationTask();
    }

    // Request comprehensive permissions
    const permissionsGranted = await requestComprehensivePermissions();
    if (!permissionsGranted) {
      console.log('Background location permission denied');
      return false;
    }

    // Start background location updates with platform-specific optimizations
    const locationOptions: Location.LocationTaskOptions = {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 30000, // 30 seconds
      distanceInterval: 100, // 100 meters
      foregroundService: {
        notificationTitle: 'Mileage Tracking',
        notificationBody: 'Automatically tracking your trips',
        notificationColor: '#3b82f6',
      },
      // Background location updates
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    };

    // iOS-specific optimizations for better background performance
    locationOptions.activityType = Location.ActivityType.AutomotiveNavigation;
    locationOptions.showsBackgroundLocationIndicator = true;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, locationOptions);

    // Register background fetch task for periodic checks
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    tripDetectionState = {
      isTracking: true,
      currentTrip: null,
      userId,
      lastKnownLocation: null,
      backgroundTaskRegistered: true,
    };

    console.log('✅ Automatic trip detection started with background capabilities');
    return true;
  } catch (error) {
    console.error('Failed to start automatic trip detection:', error);
    return false;
  }
};

// Stop automatic trip detection
export const stopAutomaticTripDetection = async (): Promise<void> => {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    
    // Finalize any current trip
    if (tripDetectionState.currentTrip) {
      await finalizeAutoDetectedTrip(tripDetectionState.lastKnownLocation!, Date.now());
    }
    
    tripDetectionState = {
      isTracking: false,
      currentTrip: null,
      userId: null,
      lastKnownLocation: null,
      backgroundTaskRegistered: false,
    };
    console.log('✅ Automatic trip detection stopped');
  } catch (error) {
    console.error('Failed to stop automatic trip detection:', error);
  }
};

// Define the background location task with enhanced logic
const defineLocationTask = () => {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Location task error:', error);
      return;
    }

    if (!data) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const location = locations[0];
    
    // Validate location data
    if (!isValidLocation(location)) {
      console.log('Invalid location data received, skipping');
      return;
    }

    const now = Date.now();

    // Update trip detection state
    if (tripDetectionState.isTracking && tripDetectionState.userId) {
      await processLocationUpdate(location, now);
    }
  });

  // Define background fetch task for periodic checks
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      // Check if we have a current trip that should be ended
      if (tripDetectionState.currentTrip && tripDetectionState.lastKnownLocation) {
        const timeSinceLastMovement = Date.now() - tripDetectionState.currentTrip.lastMovementTime;
        
        if (timeSinceLastMovement > STOP_DETECTION_TIME) {
          await finalizeAutoDetectedTrip(tripDetectionState.lastKnownLocation, Date.now());
        }
      }
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background fetch task error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
};

// Process location update for trip detection with enhanced logic
const processLocationUpdate = async (location: Location.LocationObject, timestamp: number) => {
  const isMoving = isUserMoving(location);
  
  // Update last known location
  tripDetectionState.lastKnownLocation = location;

  if (isMoving) {
    // User is moving
    if (!tripDetectionState.currentTrip) {
      // Start new trip
      tripDetectionState.currentTrip = {
        startTime: new Date(timestamp),
        startLocation: location,
        route: [location],
        lastMovementTime: timestamp,
        totalDistance: 0,
      };
      console.log('🚗 New trip detected');
      
      // Send notification for trip start
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trip Started',
          body: 'Mileage tracking is now active',
          data: { type: 'trip_started' },
        },
        trigger: null,
      });
    } else {
      // Continue existing trip
      tripDetectionState.currentTrip.route.push(location);
      tripDetectionState.currentTrip.lastMovementTime = timestamp;
      
      // Update total distance
      tripDetectionState.currentTrip.totalDistance = calculateTotalDistance(tripDetectionState.currentTrip.route);
    }
  } else if (tripDetectionState.currentTrip) {
    // User stopped moving, check if we should end the trip
    const timeSinceLastMovement = timestamp - tripDetectionState.currentTrip.lastMovementTime;
    
    if (timeSinceLastMovement > STOP_DETECTION_TIME) {
      // End the trip
      await finalizeAutoDetectedTrip(location, timestamp);
    }
  }
};

// Finalize an auto-detected trip with enhanced data
const finalizeAutoDetectedTrip = async (endLocation: Location.LocationObject, endTime: number) => {
  if (!tripDetectionState.currentTrip || !tripDetectionState.userId) return;

  const { startTime, startLocation, route, totalDistance } = tripDetectionState.currentTrip;
  const tripDuration = endTime - startTime.getTime();

  // Only save trips that meet minimum criteria
  if (totalDistance >= MIN_TRIP_DISTANCE && tripDuration >= MIN_TRIP_DURATION) {
    try {
      // Get addresses for start and end locations
      const startAddress = await reverseGeocode(startLocation.coords.latitude, startLocation.coords.longitude);
      const endAddress = await reverseGeocode(endLocation.coords.latitude, endLocation.coords.longitude);

      const tripData = {
        startLocation: {
          latitude: startLocation.coords.latitude,
          longitude: startLocation.coords.longitude,
          address: startAddress,
        },
        endLocation: {
          latitude: endLocation.coords.latitude,
          longitude: endLocation.coords.longitude,
          address: endAddress,
        },
        distance: totalDistance,
        startTime: startTime.toISOString(),
        endTime: new Date(endTime).toISOString(),
        route,
      };

      // Add trip to store (this will trigger UI updates)
      const mileageStore = useMileageStore.getState();
      mileageStore.addAutoDetectedTrip(tripData);

      // Send notification for trip completion
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Trip Completed',
          body: `${totalDistance.toFixed(1)} miles tracked`,
          data: { type: 'trip_completed', distance: totalDistance },
        },
        trigger: null,
      });

      console.log(`✅ Auto-detected trip saved: ${totalDistance.toFixed(2)} miles`);
    } catch (error) {
      console.error('Failed to save auto-detected trip:', error);
    }
  }

  // Reset current trip
  tripDetectionState.currentTrip = null;
};

// Request comprehensive permissions for background tracking
export const requestComprehensivePermissions = async (): Promise<boolean> => {
  try {
    // Request foreground location permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'This app needs location access to track your mileage. Please enable location permissions in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', style: 'default' },
        ]
      );
      return false;
    }

    // Request background location permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Background Location Permission Required',
        'For automatic trip detection, please enable "Always" location access in Settings. You can still manually log trips without this permission.',
        [
          { text: 'Continue with Manual Only', style: 'cancel' },
          { text: 'OK', style: 'default' },
        ]
      );
      return false;
    }

    // Request notification permissions for background updates
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();
    if (notificationStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted, continuing without notifications');
      }
    }

    return true;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
};

// Start manual trip tracking
export const startLocationTracking = async (userId: string): Promise<void> => {
  try {
    const permissionsGranted = await requestComprehensivePermissions();
    if (!permissionsGranted) {
      throw new Error('Location permissions not granted');
    }

    // Start location updates for manual tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 10000, // 10 seconds for manual tracking
      distanceInterval: 50, // 50 meters
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: {
        notificationTitle: 'Trip Tracking',
        notificationBody: 'Tracking your current trip',
        notificationColor: '#10b981',
      },
    });

    console.log('✅ Manual trip tracking started');
  } catch (error) {
    console.error('Failed to start location tracking:', error);
    throw error;
  }
};

// Stop location tracking
export const stopLocationTracking = async (): Promise<void> => {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('✅ Location tracking stopped');
  } catch (error) {
    console.error('Failed to stop location tracking:', error);
  }
};

// Calculate total miles from route
export const calculateTotalMiles = (route: Location.LocationObject[]): number => {
  return calculateTotalDistance(route);
};

// Get current location
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location;
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
};

// Check if automatic tracking is enabled
export const isAutomaticTrackingEnabled = (): boolean => {
  return tripDetectionState.isTracking;
};

// Get current trip detection state
export const getTripDetectionState = (): TripDetectionState => {
  return { ...tripDetectionState };
};

// Check if background location is available
export const isBackgroundLocationAvailable = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check background location availability:', error);
    return false;
  }
};

// Initialize the location task
defineLocationTask(); 