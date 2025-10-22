import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SimpleLeadsFilters {
  timePeriod: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
  status: 'all' | 'active' | 'inactive';
  searchQuery: string;
}

const defaultFilters: SimpleLeadsFilters = {
  timePeriod: 'all',
  status: 'all',
  searchQuery: '',
};

const STORAGE_KEY = 'simple_leads_filters_v1';

export const useSimpleLeadsFilters = () => {
  const [filters, setFilters] = useState<SimpleLeadsFilters>(defaultFilters);
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
  const updateFilter = useCallback((key: keyof SimpleLeadsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<SimpleLeadsFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Check if any filter is active (differs from defaults)
  const hasActiveFilters = useCallback(() => {
    return filters.timePeriod !== 'all' || 
           filters.status !== 'all' || 
           filters.searchQuery.trim() !== '';
  }, [filters]);

  // Get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.timePeriod !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.searchQuery.trim() !== '') count++;
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
