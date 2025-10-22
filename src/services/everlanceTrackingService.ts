/**
 * Everlance-Style Background Location Tracking Service
 * 
 * This service implements automatic trip detection similar to Everlance,
 * with background location tracking that works even when the app is closed.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { 
  TRIP_DETECTION_CONFIG, 
  BACKGROUND_TASK_NAMES, 
  NOTIFICATION_CONFIG,
  TripClassification 
} from '../constants/mileageConstants';
import { 
  LocationPoint, 
  calculateDistance, 
  calculateRouteDistance, 
  isValidLocationPoint,
  filterValidLocationPoints 
} from '../utils/haversine';
import { mileageService } from './mileageService';

interface TripDetectionState {
  isTracking: boolean;
  currentTrip: {
    startTime: number;
    startLocation: LocationPoint;
    route: LocationPoint[];
    lastMovementTime: number;
    totalDistance: number;
    speedHistory: number[];
  } | null;
  userId: string | null;
  lastKnownLocation: LocationPoint | null;
  backgroundTaskRegistered: boolean;
  isMoving: boolean;
  movementStartTime: number | null;
  distanceAccumulator: number;
  lastLocationTime: number | null;
}

let tripDetectionState: TripDetectionState = {
  isTracking: false,
  currentTrip: null,
  userId: null,
  lastKnownLocation: null,
  backgroundTaskRegistered: false,
  isMoving: false,
  movementStartTime: null,
  distanceAccumulator: 0,
  lastLocationTime: null,
};

/**
 * Configure notifications for background tracking
 */
const configureNotifications = async (): Promise<boolean> => {
  try {
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

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mileage-tracking', {
        name: 'Mileage Tracking',
        description: 'Notifications for automatic mileage tracking',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    return true;
  } catch (error) {
    console.error('Error configuring notifications:', error);
    return false;
  }
};

/**
 * Convert speed from m/s to mph
 */
const convertSpeedToMph = (speedMs: number): number => {
  return speedMs * 2.237;
};

/**
 * Check if user is moving based on speed and location changes
 */
const isUserMoving = (location: LocationPoint): boolean => {
  const speed = location.speed || 0;
  const speedMph = convertSpeedToMph(speed);
  
  // Check if speed is within reasonable driving range
  if (speedMph < TRIP_DETECTION_CONFIG.MIN_SPEED_THRESHOLD || 
      speedMph > TRIP_DETECTION_CONFIG.MAX_SPEED_THRESHOLD) {
    return false;
  }
  
  // Additional check: if we have a previous location, check distance moved
  if (tripDetectionState.lastKnownLocation) {
    const distance = calculateDistance(
      tripDetectionState.lastKnownLocation.latitude,
      tripDetectionState.lastKnownLocation.longitude,
      location.latitude,
      location.longitude
    );
    
    // If distance is too small, likely not moving
    if (distance < 0.01) { // Less than 0.01 miles
      return false;
    }
  }
  
  return true;
};

/**
 * Check if user has stopped moving
 */
const hasUserStopped = (location: LocationPoint): boolean => {
  const speed = location.speed || 0;
  const speedMs = speed;
  
  // Check if speed is below stop threshold
  return speedMs < TRIP_DETECTION_CONFIG.STOP_SPEED_THRESHOLD;
};

/**
 * Validate location accuracy and filter out bad GPS data
 */
const isValidLocation = (location: LocationPoint): boolean => {
  return isValidLocationPoint(location, 30000); // 30 seconds max age
};

/**
 * Start automatic trip detection with Everlance-style logic
 */
export const startEverlanceTracking = async (userId: string): Promise<boolean> => {
  try {
    console.log('🚗 Starting Everlance-style trip detection...');
    
    // Configure notifications first
    await configureNotifications();
    
    // Check if task is already defined
    if (!TaskManager.isTaskDefined(BACKGROUND_TASK_NAMES.MILEAGE_TRACKING)) {
      defineLocationTask();
    }

    // Request comprehensive permissions
    const permissionsGranted = await requestComprehensivePermissions();
    if (!permissionsGranted) {
      console.log('Background location permission denied');
      return false;
    }

    // Start background location updates with optimized settings
    const locationOptions: Location.LocationTaskOptions = {
      accuracy: Location.Accuracy.Balanced, // Balanced for better battery life
      timeInterval: TRIP_DETECTION_CONFIG.LOCATION_UPDATE_INTERVAL,
      distanceInterval: TRIP_DETECTION_CONFIG.LOCATION_DISTANCE_INTERVAL,
      foregroundService: {
        notificationTitle: NOTIFICATION_CONFIG.BACKGROUND_TRACKING.title,
        notificationBody: NOTIFICATION_CONFIG.BACKGROUND_TRACKING.body,
        notificationColor: NOTIFICATION_CONFIG.BACKGROUND_TRACKING.color,
      },
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    };

    await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAMES.MILEAGE_TRACKING, locationOptions);

    // Register background fetch task for periodic checks
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAMES.BACKGROUND_FETCH, {
      minimumInterval: TRIP_DETECTION_CONFIG.BACKGROUND_FETCH_INTERVAL,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    tripDetectionState = {
      isTracking: true,
      currentTrip: null,
      userId,
      lastKnownLocation: null,
      backgroundTaskRegistered: true,
      isMoving: false,
      movementStartTime: null,
      distanceAccumulator: 0,
      lastLocationTime: null,
    };

    console.log('✅ Everlance-style trip detection started');
    return true;
  } catch (error) {
    console.error('Failed to start Everlance tracking:', error);
    return false;
  }
};

/**
 * Stop automatic trip detection
 */
export const stopEverlanceTracking = async (): Promise<void> => {
  try {
    await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAMES.MILEAGE_TRACKING);
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAMES.BACKGROUND_FETCH);
    
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
      isMoving: false,
      movementStartTime: null,
      distanceAccumulator: 0,
      lastLocationTime: null,
    };
    
    console.log('✅ Everlance-style trip detection stopped');
  } catch (error) {
    console.error('Failed to stop Everlance tracking:', error);
  }
};

/**
 * Define the background location task with Everlance-style logic
 */
const defineLocationTask = () => {
  TaskManager.defineTask(BACKGROUND_TASK_NAMES.MILEAGE_TRACKING, async ({ data, error }) => {
    if (error) {
      console.error('Location task error:', error);
      return;
    }

    if (!data) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const location = locations[0];
    
    // Convert to our LocationPoint format
    const locationPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
      speed: location.coords.speed,
    };
    
    // Validate location data
    if (!isValidLocation(locationPoint)) {
      console.log('Invalid location data received, skipping');
      return;
    }

    const now = Date.now();

    // Update trip detection state
    if (tripDetectionState.isTracking && tripDetectionState.userId) {
      await processLocationUpdate(locationPoint, now);
    }
  });

  // Define background fetch task for periodic checks
  TaskManager.defineTask(BACKGROUND_TASK_NAMES.BACKGROUND_FETCH, async () => {
    try {
      // Check if we have a current trip that should be ended
      if (tripDetectionState.currentTrip && tripDetectionState.lastKnownLocation) {
        const timeSinceLastMovement = Date.now() - tripDetectionState.currentTrip.lastMovementTime;
        
        if (timeSinceLastMovement > TRIP_DETECTION_CONFIG.STOP_DURATION_THRESHOLD) {
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

/**
 * Process location update with Everlance-style trip detection logic
 */
const processLocationUpdate = async (location: LocationPoint, timestamp: number) => {
  const isMoving = isUserMoving(location);
  const hasStopped = hasUserStopped(location);
  
  // Update last known location
  tripDetectionState.lastKnownLocation = location;
  tripDetectionState.lastLocationTime = timestamp;

  if (isMoving) {
    // User is moving
    if (!tripDetectionState.isMoving) {
      // Just started moving
      tripDetectionState.isMoving = true;
      tripDetectionState.movementStartTime = timestamp;
      tripDetectionState.distanceAccumulator = 0;
    } else {
      // Continue moving - accumulate distance
      if (tripDetectionState.lastKnownLocation) {
        const distance = calculateDistance(
          tripDetectionState.lastKnownLocation.latitude,
          tripDetectionState.lastKnownLocation.longitude,
          location.latitude,
          location.longitude
        );
        tripDetectionState.distanceAccumulator += distance;
      }
    }

    // Check if we should start a trip
    if (!tripDetectionState.currentTrip) {
      const timeMoving = timestamp - (tripDetectionState.movementStartTime || timestamp);
      const speedMph = convertSpeedToMph(location.speed || 0);
      
      // Start trip if:
      // 1. Speed ≥ 10mph for 30s OR
      // 2. Distance > 0.25 miles within 2min
      const shouldStartTrip = (
        (speedMph >= TRIP_DETECTION_CONFIG.MIN_SPEED_THRESHOLD && 
         timeMoving >= TRIP_DETECTION_CONFIG.SPEED_DURATION_THRESHOLD) ||
        (tripDetectionState.distanceAccumulator >= TRIP_DETECTION_CONFIG.MIN_DISTANCE_FOR_START &&
         timeMoving <= TRIP_DETECTION_CONFIG.DISTANCE_TIME_WINDOW)
      );

      if (shouldStartTrip) {
        // Start new trip
        tripDetectionState.currentTrip = {
          startTime: timestamp,
          startLocation: location,
          route: [location],
          lastMovementTime: timestamp,
          totalDistance: 0,
          speedHistory: [speedMph],
        };
        
        console.log('🚗 New trip detected - Everlance style');
        
        // Send notification for trip start
        await Notifications.scheduleNotificationAsync({
          content: {
            title: NOTIFICATION_CONFIG.TRIP_STARTED.title,
            body: NOTIFICATION_CONFIG.TRIP_STARTED.body,
            data: { type: 'trip_started' },
          },
          trigger: null,
        });
      }
    } else {
      // Continue existing trip
      tripDetectionState.currentTrip.route.push(location);
      tripDetectionState.currentTrip.lastMovementTime = timestamp;
      
      // Update total distance
      tripDetectionState.currentTrip.totalDistance = calculateRouteDistance(
        tripDetectionState.currentTrip.route
      );
      
      // Track speed history
      const speedMph = convertSpeedToMph(location.speed || 0);
      tripDetectionState.currentTrip.speedHistory.push(speedMph);
      
      // Keep only last 10 speed readings
      if (tripDetectionState.currentTrip.speedHistory.length > 10) {
        tripDetectionState.currentTrip.speedHistory.shift();
      }
    }
  } else if (hasStopped && tripDetectionState.currentTrip) {
    // User stopped moving, check if we should end the trip
    const timeSinceLastMovement = timestamp - tripDetectionState.currentTrip.lastMovementTime;
    
    if (timeSinceLastMovement > TRIP_DETECTION_CONFIG.STOP_DURATION_THRESHOLD) {
      // Check if we've drifted too much (indicating we're not actually stopped)
      if (tripDetectionState.lastKnownLocation) {
        const drift = calculateDistance(
          tripDetectionState.currentTrip.startLocation.latitude,
          tripDetectionState.currentTrip.startLocation.longitude,
          location.latitude,
          location.longitude
        );
        
        if (drift < TRIP_DETECTION_CONFIG.DRIFT_THRESHOLD) {
          // End the trip
          await finalizeAutoDetectedTrip(location, timestamp);
        }
      }
    }
  } else if (!isMoving && !hasStopped) {
    // User is not moving and hasn't stopped - reset movement tracking
    tripDetectionState.isMoving = false;
    tripDetectionState.movementStartTime = null;
    tripDetectionState.distanceAccumulator = 0;
  }
};

/**
 * Finalize an auto-detected trip with Everlance-style data
 */
const finalizeAutoDetectedTrip = async (endLocation: LocationPoint, endTime: number) => {
  if (!tripDetectionState.currentTrip || !tripDetectionState.userId) return;

  const { startTime, startLocation, route, totalDistance } = tripDetectionState.currentTrip;
  const tripDuration = endTime - startTime;

  // Only save trips that meet minimum criteria (discard micro-trips < 0.3 miles)
  if (totalDistance >= TRIP_DETECTION_CONFIG.MIN_TRIP_DISTANCE) {
    try {
      // Convert route to Location.LocationObject format for the service
      const locationRoute: Location.LocationObject[] = route.map(point => ({
        coords: {
          latitude: point.latitude,
          longitude: point.longitude,
          altitude: null,
          accuracy: point.accuracy || null,
          altitudeAccuracy: null,
          heading: null,
          speed: point.speed || null,
        },
        timestamp: point.timestamp || Date.now(),
      }));

      // Create trip in database
      const trip = await mileageService.createTripFromLocationData(
        tripDetectionState.userId,
        locationRoute[0], // start location
        locationRoute[locationRoute.length - 1], // end location
        locationRoute,
        'personal' // Default to personal, user can change later
      );

      // Send notification for trip completion
      await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_CONFIG.TRIP_COMPLETED.title,
          body: `${totalDistance.toFixed(1)} miles tracked - ${NOTIFICATION_CONFIG.TRIP_COMPLETED.body}`,
          data: { 
            type: 'trip_completed', 
            distance: totalDistance,
            tripId: trip.id 
          },
        },
        trigger: null,
      });

      console.log(`✅ Auto-detected trip saved: ${totalDistance.toFixed(2)} miles`);
    } catch (error) {
      console.error('Failed to save auto-detected trip:', error);
    }
  } else {
    console.log(`🚫 Trip too short (${totalDistance.toFixed(2)} miles), discarding`);
  }

  // Reset current trip
  tripDetectionState.currentTrip = null;
  tripDetectionState.isMoving = false;
  tripDetectionState.movementStartTime = null;
  tripDetectionState.distanceAccumulator = 0;
};

/**
 * Request comprehensive permissions for background tracking
 */
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

/**
 * Check if Everlance tracking is currently active
 */
export const isEverlanceTrackingActive = (): boolean => {
  return tripDetectionState.isTracking;
};

/**
 * Get current trip detection state
 */
export const getTripDetectionState = (): TripDetectionState => {
  return { ...tripDetectionState };
};

/**
 * Check if background location is available
 */
export const isBackgroundLocationAvailable = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check background location availability:', error);
    return false;
  }
};

/**
 * Ensure location updates start at app launch
 */
export const ensureLocationUpdates = async (userId: string): Promise<void> => {
  try {
    // Check if tracking is already active
    if (tripDetectionState.isTracking) {
      console.log('Everlance tracking already active');
      return;
    }

    // Check if background location is available
    const backgroundAvailable = await isBackgroundLocationAvailable();
    if (!backgroundAvailable) {
      console.log('Background location not available, skipping auto-start');
      return;
    }

    // Start tracking
    await startEverlanceTracking(userId);
  } catch (error) {
    console.error('Failed to ensure location updates:', error);
  }
};

// Initialize the location task
defineLocationTask();
