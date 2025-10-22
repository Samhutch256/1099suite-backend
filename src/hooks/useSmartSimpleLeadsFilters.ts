import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SmartSimpleLeadsFilters {
  searchQuery: string;
  timePeriod: 'all' | 'today' | 'week' | 'month' | 'year';
  sources: string[];
  status: 'all' | 'active' | 'inactive';
  sortBy: 'date' | 'name' | 'revenue';
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: SmartSimpleLeadsFilters = {
  searchQuery: '',
  timePeriod: 'all',
  sources: [],
  status: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
};

const STORAGE_KEY = 'smart_simple_leads_filters_v1';

export const useSmartSimpleLeadsFilters = () => {
  const [filters, setFilters] = useState<SmartSimpleLeadsFilters>(defaultFilters);
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
  const updateFilter = useCallback((key: keyof SmartSimpleLeadsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<SmartSimpleLeadsFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Check if any filter is active (differs from defaults)
  const hasActiveFilters = useCallback(() => {
    return filters.searchQuery.trim() !== '' || 
           filters.timePeriod !== 'all' || 
           filters.sources.length > 0 ||
           filters.status !== 'all' ||
           filters.sortBy !== 'date' || 
           filters.sortOrder !== 'desc';
  }, [filters]);

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.timePeriod !== 'all') count++;
    if (filters.sources.length > 0) count++;
    if (filters.status !== 'all') count++;
    if (filters.sortBy !== 'date') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    isLoaded,
  };
};
