/**
 * Mileage Service
 * 
 * This service handles all mileage-related database operations
 * using Supabase for cloud storage and synchronization.
 */

import { supabaseService } from './supabaseService';
import { 
  TripClassification, 
  IRS_RATES_CENTS, 
  calculateDeductionCents,
  MILEAGE_TABLES 
} from '../constants/mileageConstants';
import { LocationPoint, calculateRouteDistance } from '../utils/haversine';
import * as Location from 'expo-location';

export interface MileageTrip {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  miles: number;
  classification: TripClassification;
  rateCents: number;
  deductionCents: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MileageTripPoint {
  id: string;
  tripId: string;
  timestamp: string;
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  createdAt: string;
}

export interface MileageStats {
  totalMiles: number;
  totalDeductionCents: number;
  totalTrips: number;
  businessMiles: number;
  businessDeductionCents: number;
  medicalMiles: number;
  medicalDeductionCents: number;
  charityMiles: number;
  charityDeductionCents: number;
  personalMiles: number;
}

export interface MonthlyMileageData {
  monthNumber: number;
  monthName: string;
  totalMiles: number;
  totalDeductionCents: number;
  totalTrips: number;
  businessMiles: number;
  medicalMiles: number;
  charityMiles: number;
  personalMiles: number;
}

class MileageService {
  /**
   * Save a mileage trip to Supabase
   */
  async saveTrip(trip: Omit<MileageTrip, 'id' | 'createdAt' | 'updatedAt'>): Promise<MileageTrip> {
    try {
      const { data, error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIPS)
        .insert({
          user_id: trip.userId,
          started_at: trip.startedAt,
          ended_at: trip.endedAt,
          start_lat: trip.startLat,
          start_lng: trip.startLng,
          end_lat: trip.endLat,
          end_lng: trip.endLng,
          miles: trip.miles,
          classification: trip.classification,
          rate_cents: trip.rateCents,
          deduction_cents: trip.deductionCents,
          notes: trip.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving mileage trip:', error);
        throw new Error(`Failed to save trip: ${error.message}`);
      }

      return this.mapDatabaseTripToTrip(data);
    } catch (error) {
      console.error('Error in saveTrip:', error);
      throw error;
    }
  }

  /**
   * Update an existing mileage trip
   */
  async updateTrip(
    tripId: string, 
    updates: Partial<Omit<MileageTrip, 'id' | 'userId' | 'createdAt'>>
  ): Promise<MileageTrip> {
    try {
      const updateData: any = {};
      
      if (updates.startedAt) updateData.started_at = updates.startedAt;
      if (updates.endedAt !== undefined) updateData.ended_at = updates.endedAt;
      if (updates.startLat !== undefined) updateData.start_lat = updates.startLat;
      if (updates.startLng !== undefined) updateData.start_lng = updates.startLng;
      if (updates.endLat !== undefined) updateData.end_lat = updates.endLat;
      if (updates.endLng !== undefined) updateData.end_lng = updates.endLng;
      if (updates.miles !== undefined) updateData.miles = updates.miles;
      if (updates.classification) updateData.classification = updates.classification;
      if (updates.rateCents !== undefined) updateData.rate_cents = updates.rateCents;
      if (updates.deductionCents !== undefined) updateData.deduction_cents = updates.deductionCents;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIPS)
        .update(updateData)
        .eq('id', tripId)
        .select()
        .single();

      if (error) {
        console.error('Error updating mileage trip:', error);
        throw new Error(`Failed to update trip: ${error.message}`);
      }

      return this.mapDatabaseTripToTrip(data);
    } catch (error) {
      console.error('Error in updateTrip:', error);
      throw error;
    }
  }

  /**
   * Delete a mileage trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    try {
      const { error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIPS)
        .delete()
        .eq('id', tripId);

      if (error) {
        console.error('Error deleting mileage trip:', error);
        throw new Error(`Failed to delete trip: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteTrip:', error);
      throw error;
    }
  }

  /**
   * Get all trips for a user, ordered by newest first
   */
  async getUserTrips(userId: string, limit?: number): Promise<MileageTrip[]> {
    console.log('🚗 [MileageService] getUserTrips called for user:', userId);
    try {
      let query = supabaseService.supabase
        .from(MILEAGE_TABLES.TRIPS)
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('🚗 [MileageService] Error fetching user trips:', error);
        throw new Error(`Failed to fetch trips: ${error.message}`);
      }

      console.log('🚗 [MileageService] Raw data from database:', data);
      const mappedTrips = data.map(trip => this.mapDatabaseTripToTrip(trip));
      console.log('🚗 [MileageService] Mapped trips:', mappedTrips);
      return mappedTrips;
    } catch (error) {
      console.error('Error in getUserTrips:', error);
      throw error;
    }
  }

  /**
   * Get a specific trip by ID
   */
  async getTrip(tripId: string): Promise<MileageTrip | null> {
    try {
      const { data, error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIPS)
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Trip not found
        }
        console.error('Error fetching trip:', error);
        throw new Error(`Failed to fetch trip: ${error.message}`);
      }

      return this.mapDatabaseTripToTrip(data);
    } catch (error) {
      console.error('Error in getTrip:', error);
      throw error;
    }
  }

  /**
   * Get user's mileage statistics
   */
  async getUserMileageStats(userId: string): Promise<MileageStats> {
    try {
      const { data, error } = await supabaseService.supabase
        .rpc('get_user_mileage_stats', { user_uuid: userId });

      if (error) {
        console.error('Error fetching mileage stats:', error);
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          totalMiles: 0,
          totalDeductionCents: 0,
          totalTrips: 0,
          businessMiles: 0,
          businessDeductionCents: 0,
          medicalMiles: 0,
          medicalDeductionCents: 0,
          charityMiles: 0,
          charityDeductionCents: 0,
          personalMiles: 0,
        };
      }

      const stats = data[0];
      return {
        totalMiles: parseFloat(stats.total_miles) || 0,
        totalDeductionCents: parseInt(stats.total_deduction_cents) || 0,
        totalTrips: parseInt(stats.total_trips) || 0,
        businessMiles: parseFloat(stats.business_miles) || 0,
        businessDeductionCents: parseInt(stats.business_deduction_cents) || 0,
        medicalMiles: parseFloat(stats.medical_miles) || 0,
        medicalDeductionCents: parseInt(stats.medical_deduction_cents) || 0,
        charityMiles: parseFloat(stats.charity_miles) || 0,
        charityDeductionCents: parseInt(stats.charity_deduction_cents) || 0,
        personalMiles: parseFloat(stats.personal_miles) || 0,
      };
    } catch (error) {
      console.error('Error in getUserMileageStats:', error);
      throw error;
    }
  }

  /**
   * Get monthly mileage breakdown for a user
   */
  async getUserMonthlyMileage(userId: string, year: number): Promise<MonthlyMileageData[]> {
    try {
      const { data, error } = await supabaseService.supabase
        .rpc('get_user_monthly_mileage', { 
          user_uuid: userId, 
          year_param: year 
        });

      if (error) {
        console.error('Error fetching monthly mileage:', error);
        throw new Error(`Failed to fetch monthly mileage: ${error.message}`);
      }

      return (data || []).map((month: any) => ({
        monthNumber: parseInt(month.month_number),
        monthName: month.month_name.trim(),
        totalMiles: parseFloat(month.total_miles) || 0,
        totalDeductionCents: parseInt(month.total_deduction_cents) || 0,
        totalTrips: parseInt(month.total_trips) || 0,
        businessMiles: parseFloat(month.business_miles) || 0,
        medicalMiles: parseFloat(month.medical_miles) || 0,
        charityMiles: parseFloat(month.charity_miles) || 0,
        personalMiles: parseFloat(month.personal_miles) || 0,
      }));
    } catch (error) {
      console.error('Error in getUserMonthlyMileage:', error);
      throw error;
    }
  }

  /**
   * Save trip points for detailed route tracking
   */
  async saveTripPoints(tripId: string, points: LocationPoint[]): Promise<void> {
    try {
      if (points.length === 0) return;

      const pointsData = points.map(point => ({
        trip_id: tripId,
        timestamp: new Date(point.timestamp || Date.now()).toISOString(),
        lat: point.latitude,
        lng: point.longitude,
        speed: point.speed || null,
        accuracy: point.accuracy || null,
      }));

      const { error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIP_POINTS)
        .insert(pointsData);

      if (error) {
        console.error('Error saving trip points:', error);
        throw new Error(`Failed to save trip points: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in saveTripPoints:', error);
      throw error;
    }
  }

  /**
   * Get trip points for a specific trip
   */
  async getTripPoints(tripId: string): Promise<MileageTripPoint[]> {
    try {
      const { data, error } = await supabaseService.supabase
        .from(MILEAGE_TABLES.TRIP_POINTS)
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching trip points:', error);
        throw new Error(`Failed to fetch trip points: ${error.message}`);
      }

      return (data || []).map(point => ({
        id: point.id,
        tripId: point.trip_id,
        timestamp: point.timestamp,
        lat: parseFloat(point.lat),
        lng: parseFloat(point.lng),
        speed: point.speed ? parseFloat(point.speed) : undefined,
        accuracy: point.accuracy ? parseFloat(point.accuracy) : undefined,
        createdAt: point.created_at,
      }));
    } catch (error) {
      console.error('Error in getTripPoints:', error);
      throw error;
    }
  }

  /**
   * Create a trip from location data
   */
  async createTripFromLocationData(
    userId: string,
    startLocation: Location.LocationObject,
    endLocation: Location.LocationObject,
    route: Location.LocationObject[],
    classification: TripClassification = 'personal'
  ): Promise<MileageTrip> {
    try {
      // Calculate total distance from route
      const miles = calculateRouteDistance(route);
      
      // Calculate deduction
      const rateCents = IRS_RATES_CENTS[classification];
      const deductionCents = calculateDeductionCents(miles, classification);

      const tripData = {
        userId,
        startedAt: new Date(startLocation.timestamp || Date.now()).toISOString(),
        endedAt: new Date(endLocation.timestamp || Date.now()).toISOString(),
        startLat: startLocation.coords.latitude,
        startLng: startLocation.coords.longitude,
        endLat: endLocation.coords.latitude,
        endLng: endLocation.coords.longitude,
        miles,
        classification,
        rateCents,
        deductionCents,
      };

      const trip = await this.saveTrip(tripData);

      // Save trip points if route is provided
      if (route.length > 0) {
        const locationPoints: LocationPoint[] = route.map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp,
        }));
        
        await this.saveTripPoints(trip.id, locationPoints);
      }

      return trip;
    } catch (error) {
      console.error('Error in createTripFromLocationData:', error);
      throw error;
    }
  }

  /**
   * Map database trip to MileageTrip interface
   */
  private mapDatabaseTripToTrip(dbTrip: any): MileageTrip {
    return {
      id: dbTrip.id,
      userId: dbTrip.user_id,
      startedAt: dbTrip.started_at,
      endedAt: dbTrip.ended_at,
      startLat: parseFloat(dbTrip.start_lat),
      startLng: parseFloat(dbTrip.start_lng),
      endLat: dbTrip.end_lat ? parseFloat(dbTrip.end_lat) : undefined,
      endLng: dbTrip.end_lng ? parseFloat(dbTrip.end_lng) : undefined,
      miles: parseFloat(dbTrip.miles),
      classification: dbTrip.classification,
      rateCents: parseInt(dbTrip.rate_cents),
      deductionCents: parseInt(dbTrip.deduction_cents),
      notes: dbTrip.notes,
      createdAt: dbTrip.created_at,
      updatedAt: dbTrip.updated_at,
    };
  }
}

export const mileageService = new MileageService();
