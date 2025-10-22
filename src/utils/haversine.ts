/**
 * Haversine Distance Calculation Utility
 * 
 * This utility provides functions to calculate distances between
 * geographic coordinates using the Haversine formula.
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LocationPoint extends Coordinate {
  accuracy?: number;
  timestamp?: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @param unit - Unit of measurement ('miles' or 'kilometers')
 * @returns Distance between the two points
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'miles' | 'kilometers' = 'miles'
): number => {
  // Earth's radius in the specified unit
  const R = unit === 'miles' ? 3959 : 6371;
  
  // Convert degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Calculate distance between two coordinate objects
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @param unit - Unit of measurement ('miles' or 'kilometers')
 * @returns Distance between the two points
 */
export const calculateDistanceBetweenPoints = (
  point1: Coordinate,
  point2: Coordinate,
  unit: 'miles' | 'kilometers' = 'miles'
): number => {
  return calculateDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude,
    unit
  );
};

/**
 * Calculate total distance along a route of points
 * @param route - Array of location points
 * @param unit - Unit of measurement ('miles' or 'kilometers')
 * @param accuracyThreshold - Filter out points with accuracy worse than this (in meters)
 * @returns Total distance of the route
 */
export const calculateRouteDistance = (
  route: LocationPoint[],
  unit: 'miles' | 'kilometers' = 'miles',
  accuracyThreshold: number = 100
): number => {
  if (route.length < 2) return 0;
  
  let totalDistance = 0;
  
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    
    // Filter out inaccurate GPS points
    if (prev.accuracy && prev.accuracy > accuracyThreshold) continue;
    if (curr.accuracy && curr.accuracy > accuracyThreshold) continue;
    
    // Skip if coordinates are invalid
    if (!isValidCoordinate(prev) || !isValidCoordinate(curr)) continue;
    
    totalDistance += calculateDistanceBetweenPoints(prev, curr, unit);
  }
  
  return totalDistance;
};

/**
 * Calculate the speed between two points
 * @param point1 - First point with timestamp
 * @param point2 - Second point with timestamp
 * @param unit - Unit of measurement ('miles' or 'kilometers')
 * @returns Speed in the specified unit per hour
 */
export const calculateSpeed = (
  point1: LocationPoint,
  point2: LocationPoint,
  unit: 'miles' | 'kilometers' = 'miles'
): number => {
  if (!point1.timestamp || !point2.timestamp) return 0;
  
  const distance = calculateDistanceBetweenPoints(point1, point2, unit);
  const timeDiff = Math.abs(point2.timestamp - point1.timestamp) / 1000; // Convert to seconds
  
  if (timeDiff === 0) return 0;
  
  // Convert to per hour
  return (distance / timeDiff) * 3600;
};

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Check if a coordinate is valid
 * @param coord - Coordinate to validate
 * @returns True if coordinate is valid
 */
export const isValidCoordinate = (coord: Coordinate): boolean => {
  return (
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude) &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180 &&
    !(coord.latitude === 0 && coord.longitude === 0) // Exclude null island
  );
};

/**
 * Check if a location point is valid and recent
 * @param point - Location point to validate
 * @param maxAge - Maximum age in milliseconds (default: 30 seconds)
 * @returns True if location point is valid and recent
 */
export const isValidLocationPoint = (point: LocationPoint, maxAge: number = 30000): boolean => {
  if (!isValidCoordinate(point)) return false;
  
  // Check if timestamp is recent
  if (point.timestamp) {
    const now = Date.now();
    const age = Math.abs(now - point.timestamp);
    if (age > maxAge) return false;
  }
  
  return true;
};

/**
 * Filter out invalid and inaccurate location points
 * @param points - Array of location points
 * @param accuracyThreshold - Maximum accuracy in meters
 * @param maxAge - Maximum age in milliseconds
 * @returns Filtered array of valid location points
 */
export const filterValidLocationPoints = (
  points: LocationPoint[],
  accuracyThreshold: number = 100,
  maxAge: number = 30000
): LocationPoint[] => {
  return points.filter(point => 
    isValidLocationPoint(point, maxAge) &&
    (!point.accuracy || point.accuracy <= accuracyThreshold)
  );
};

/**
 * Calculate the center point of multiple coordinates
 * @param coordinates - Array of coordinates
 * @returns Center coordinate
 */
export const calculateCenterPoint = (coordinates: Coordinate[]): Coordinate => {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate center point of empty array');
  }
  
  if (coordinates.length === 1) {
    return coordinates[0];
  }
  
  let totalLat = 0;
  let totalLon = 0;
  
  for (const coord of coordinates) {
    totalLat += coord.latitude;
    totalLon += coord.longitude;
  }
  
  return {
    latitude: totalLat / coordinates.length,
    longitude: totalLon / coordinates.length,
  };
};

/**
 * Calculate the bounding box of multiple coordinates
 * @param coordinates - Array of coordinates
 * @returns Bounding box with min/max lat/lon
 */
export const calculateBoundingBox = (coordinates: Coordinate[]) => {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounding box of empty array');
  }
  
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;
  
  for (const coord of coordinates) {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLon = Math.min(minLon, coord.longitude);
    maxLon = Math.max(maxLon, coord.longitude);
  }
  
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    center: calculateCenterPoint(coordinates),
  };
};
