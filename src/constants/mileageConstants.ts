/**
 * Mileage Tracking Constants
 * 
 * This file contains all constants related to mileage tracking,
 * including IRS rates, trip detection thresholds, and configuration.
 */

// IRS Mileage Rates for 2024 (in cents per mile)
export const IRS_RATES_CENTS = {
  business: 67,  // $0.67 per mile
  medical: 21,   // $0.21 per mile  
  charity: 14,   // $0.14 per mile
  personal: 0,   // $0.00 per mile (no deduction)
} as const;

// Trip Detection Configuration
export const TRIP_DETECTION_CONFIG = {
  // Speed thresholds (in mph)
  MIN_SPEED_THRESHOLD: 10,        // Start trip when speed ≥ 10mph for 30s
  MAX_SPEED_THRESHOLD: 80,        // Filter out GPS errors above 80mph
  STOP_SPEED_THRESHOLD: 1.5,      // End trip when speed < 1.5 m/s for 3min
  
  // Distance thresholds (in miles)
  MIN_TRIP_DISTANCE: 0.3,         // Discard micro-trips < 0.3 miles
  MIN_DISTANCE_FOR_START: 0.25,   // Distance > 0.25 miles within 2min to start
  
  // Time thresholds (in milliseconds)
  SPEED_DURATION_THRESHOLD: 30000,    // 30 seconds at speed to start trip
  STOP_DURATION_THRESHOLD: 180000,    // 3 minutes stopped to end trip
  DISTANCE_TIME_WINDOW: 120000,       // 2 minutes window for distance check
  
  // Location accuracy (in meters)
  LOCATION_ACCURACY_THRESHOLD: 100,   // Filter out inaccurate GPS points
  DRIFT_THRESHOLD: 100,               // Drift < 100m when stopped
  
  // Background tracking intervals
  LOCATION_UPDATE_INTERVAL: 30000,    // 30 seconds between location updates
  LOCATION_DISTANCE_INTERVAL: 100,    // 100 meters minimum distance
  BACKGROUND_FETCH_INTERVAL: 900000,  // 15 minutes background fetch
} as const;

// Trip Classification Types
export type TripClassification = 'business' | 'medical' | 'charity' | 'personal';

// Background Task Names
export const BACKGROUND_TASK_NAMES = {
  MILEAGE_TRACKING: 'MILEAGE_TRACKING_TASK',
  BACKGROUND_FETCH: 'BACKGROUND_FETCH_TASK',
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  TRIP_STARTED: {
    title: 'Trip Started',
    body: 'Mileage tracking is now active',
  },
  TRIP_COMPLETED: {
    title: 'Trip Completed',
    body: 'Your trip has been automatically logged',
  },
  BACKGROUND_TRACKING: {
    title: 'Mileage Tracking',
    body: 'Automatically tracking your trips',
    color: '#3b82f6',
  },
} as const;

// Database Table Names
export const MILEAGE_TABLES = {
  TRIPS: 'mileage_trips',
  TRIP_POINTS: 'mileage_trip_points',
} as const;

// Trip Status Types
export type TripStatus = 'active' | 'completed' | 'cancelled';

// Helper function to convert cents to dollars
export const centsToDollars = (cents: number): number => cents / 100;

// Helper function to convert dollars to cents
export const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);

// Helper function to get IRS rate in dollars
export const getIrsRateInDollars = (classification: TripClassification): number => {
  return centsToDollars(IRS_RATES_CENTS[classification]);
};

// Helper function to calculate deduction amount
export const calculateDeduction = (miles: number, classification: TripClassification): number => {
  return miles * getIrsRateInDollars(classification);
};

// Helper function to calculate deduction amount in cents
export const calculateDeductionCents = (miles: number, classification: TripClassification): number => {
  return Math.round(miles * IRS_RATES_CENTS[classification]);
};
