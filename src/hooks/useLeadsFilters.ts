import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../state/authStore';

export type DateKey = 'created' | 'updated' | 'appt_set' | 'appt_held' | 'deal_signed' | 'service_completed' | 'follow_up_due';
export type RangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

export interface LeadsFilters {
  rangePreset: RangePreset;
  dateKey: DateKey;
  start?: string; // ISO
  end?: string;   // ISO
  stages: string[];      // multi
  status?: 'active' | 'inactive' | 'any';
  sources: string[];     // multi
  tags: string[];        // multi
  ownerId?: string;
  assigneeId?: string;
  revenueType?: 'guaranteed' | 'pipeline' | 'paid' | 'total';
  revenueMin?: number;
  revenueMax?: number;
  followUp: 'any' | 'due' | 'none';
}

const defaultFilters: LeadsFilters = {
  rangePreset: 'all',
  dateKey: 'created',
  stages: [],
  status: 'any',
  sources: [],
  tags: [],
  revenueType: 'total',
  followUp: 'any',
};

const STORAGE_KEY = 'leads_filters_v1';

export const useLeadsFilters = () => {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<LeadsFilters>(defaultFilters);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load filters from localStorage on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setFilters({ ...defaultFilters, ...parsed });
        }
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load filters from storage:', error);
        setIsLoaded(true);
      }
    };

    loadFilters();
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.error('Failed to save filters to storage:', error);
      }
    };

    saveFilters();
  }, [filters, isLoaded]);

  // Update individual filter values
  const updateFilter = useCallback((key: keyof LeadsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<LeadsFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Check if any filter is active (differs from defaults)
  const hasActiveFilters = useCallback(() => {
    return (
      filters.rangePreset !== 'all' ||
      filters.dateKey !== 'created' ||
      filters.start ||
      filters.end ||
      filters.stages.length > 0 ||
      filters.status !== 'any' ||
      filters.sources.length > 0 ||
      filters.tags.length > 0 ||
      filters.ownerId ||
      filters.assigneeId ||
      filters.revenueType !== 'total' ||
      filters.revenueMin !== undefined ||
      filters.revenueMax !== undefined ||
      filters.followUp !== 'any'
    );
  }, [filters]);

  // Get count of active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.rangePreset !== 'all') count++;
    if (filters.dateKey !== 'created') count++;
    if (filters.start || filters.end) count++;
    if (filters.stages.length > 0) count++;
    if (filters.status !== 'any') count++;
    if (filters.sources.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.ownerId) count++;
    if (filters.assigneeId) count++;
    if (filters.revenueType !== 'total') count++;
    if (filters.revenueMin !== undefined || filters.revenueMax !== undefined) count++;
    if (filters.followUp !== 'any') count++;
    return count;
  }, [filters]);

  return {
    filters,
    isLoaded,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
  };
};
