# Background Location Tracking Setup Guide

This guide explains how to set up and configure the comprehensive background location tracking system for automatic mileage detection.

## Features Implemented

### ✅ Core Background Tracking
- **Automatic Trip Detection**: Detects driving trips using GPS speed and movement thresholds
- **Background Operation**: Works even when the app is closed or in background
- **Platform Support**: Optimized for iOS
- **Battery Optimization**: Efficient location tracking with minimal battery impact

### ✅ Trip Detection Logic
- **Speed Thresholds**: Detects movement between 5-80 mph (filters out GPS errors)
- **Duration Filtering**: Minimum 2-minute trips, maximum 5-minute stops
- **Distance Filtering**: Minimum 0.1 miles to count as a trip
- **Accuracy Filtering**: Filters out inaccurate GPS points (>100m accuracy)

### ✅ Data Collection
- **GPS Route**: Complete route with all location points
- **Address Resolution**: Automatic reverse geocoding for start/end locations
- **Trip Metadata**: Duration, distance, timestamps, and classification
- **Real-time Updates**: Live tracking status and notifications

### ✅ User Experience
- **Permission Handling**: Comprehensive permission requests with fallbacks
- **Status Indicators**: Visual feedback for tracking status
- **Trip Review**: Review and reclassify auto-detected trips
- **Map Visualization**: Route preview with start/end markers

## Installation Requirements

### 1. Required Packages

```bash
# Core location tracking
npx expo install expo-location
npx expo install expo-task-manager
npx expo install expo-background-fetch
npx expo install expo-notifications

# Optional: Enhanced map visualization
npx expo install react-native-maps
```

### 2. iOS Configuration

Add the following to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs location access to track your mileage for tax deductions.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs background location access to automatically detect and log your driving trips for mileage tracking.",
        "UIBackgroundModes": [
          "location",
          "background-fetch"
        ]
      }
    }
  }
}
```



## Permission Setup

### Required Permissions

1. **Foreground Location**: Required for basic location access
2. **Background Location**: Required for automatic trip detection
3. **Notifications**: Required for trip start/end notifications

### Permission Flow

The app will request permissions in this order:

1. **Foreground Location** → Basic location access
2. **Background Location** → "Always" access for background tracking
3. **Notifications** → Trip notifications (optional)

### Fallback Behavior

If background permissions are denied:
- Manual trip logging still works
- User receives clear guidance on enabling permissions
- App continues to function with reduced features

## Configuration

### Location Tracking Settings

```typescript
// Configurable thresholds in mileageTrackingService.ts
const MIN_TRIP_DISTANCE = 0.1; // Minimum 0.1 miles
const MIN_TRIP_DURATION = 2 * 60 * 1000; // Minimum 2 minutes
const STOP_DETECTION_TIME = 5 * 60 * 1000; // 5 minutes of no movement
const MIN_SPEED_THRESHOLD = 5; // 5 mph minimum
const MAX_SPEED_THRESHOLD = 80; // 80 mph maximum
const LOCATION_ACCURACY_THRESHOLD = 100; // 100 meters accuracy
```

### Background Task Configuration

```typescript
// Location update intervals
timeInterval: 30000, // 30 seconds for background tracking
distanceInterval: 100, // 100 meters

// Background fetch for periodic checks
minimumInterval: 15 * 60, // 15 minutes
```

## Usage

### Starting Background Tracking

```typescript
import { startAutomaticTripDetection } from '../services/mileageTrackingService';

// Start automatic tracking
const success = await startAutomaticTripDetection(userId);
if (success) {
  console.log('Background tracking started');
}
```

### Stopping Background Tracking

```typescript
import { stopAutomaticTripDetection } from '../services/mileageTrackingService';

// Stop automatic tracking
await stopAutomaticTripDetection();
```

### Checking Status

```typescript
import { isAutomaticTrackingEnabled, isBackgroundLocationAvailable } from '../services/mileageTrackingService';

// Check if tracking is active
const isTracking = isAutomaticTrackingEnabled();

// Check if background location is available
const isAvailable = await isBackgroundLocationAvailable();
```

## Trip Detection Logic

### Movement Detection

1. **Speed Analysis**: Monitors GPS speed between 5-80 mph
2. **Distance Analysis**: Tracks movement distance between points
3. **Accuracy Filtering**: Filters out inaccurate GPS readings
4. **Time Analysis**: Considers trip duration and stop times

### Trip Lifecycle

1. **Detection**: Movement detected above speed threshold
2. **Start**: Trip begins, start location and time recorded
3. **Tracking**: Continuous GPS updates during movement
4. **Stop Detection**: No movement for 5+ minutes
5. **Finalization**: Trip saved with complete route data

### Data Quality

- **GPS Accuracy**: Filters points with >100m accuracy
- **Speed Validation**: Removes unrealistic speeds (>80 mph)
- **Time Validation**: Ensures recent timestamps
- **Distance Validation**: Minimum meaningful movement

## Battery Optimization

### iOS Optimizations

- Uses `AutomotiveNavigation` activity type
- Background location indicator enabled
- Efficient location update intervals
- Background fetch for periodic checks



## Troubleshooting

### Common Issues

1. **Background tracking not working**
   - Check "Always" location permission
   - Ensure background app refresh is enabled (iOS)
   - Verify battery optimization settings

2. **Trips not being detected**
   - Check speed thresholds (5-80 mph)
   - Verify minimum trip duration (2 minutes)
   - Ensure GPS accuracy is sufficient

3. **Battery drain**
   - Adjust location update intervals
   - Check background fetch frequency
   - Monitor location accuracy settings

### Debug Information

Enable debug logging by checking console output:

```typescript
// Debug logs will show:
console.log('🚗 New trip detected');
console.log('✅ Auto-detected trip saved: X.XX miles');
console.log('✅ Automatic trip detection started with background capabilities');
```

## Privacy & Compliance

### Data Handling

- **Local Storage**: All trip data stored locally first
- **Cloud Sync**: Optional sync to Supabase database
- **No Third-Party**: No location data sent to external services
- **User Control**: Users can disable tracking anytime

### Privacy Features

- **Minimal Data**: Only essential location data collected
- **User Consent**: Explicit permission requests
- **Data Retention**: User controls data retention
- **Transparency**: Clear indication when tracking is active

## Testing

### Manual Testing

1. **Enable Background Tracking**: Toggle auto-tracking on
2. **Start Driving**: Drive for at least 2 minutes above 5 mph
3. **Stop Driving**: Park for 5+ minutes
4. **Check Results**: Trip should appear in mileage log

### Automated Testing

```typescript
// Test trip detection
const mockLocation = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    speed: 25, // 25 mph
    accuracy: 10
  },
  timestamp: Date.now()
};

// Process location update
await processLocationUpdate(mockLocation, Date.now());
```

## Support

For issues or questions:

1. Check console logs for error messages
2. Verify permissions are correctly set
3. Test with manual trip logging first
4. Review device-specific settings

## Future Enhancements

### Planned Features

- **Route Optimization**: Smart route smoothing
- **Traffic Integration**: Real-time traffic data
- **Weather Integration**: Weather conditions during trips
- **Advanced Analytics**: Trip patterns and insights
- **Export Features**: CSV/PDF export for tax purposes

### Performance Improvements

- **Machine Learning**: Improved trip detection accuracy
- **Predictive Tracking**: Anticipate trip patterns
- **Battery Optimization**: Further reduce battery usage
- **Offline Support**: Enhanced offline functionality 