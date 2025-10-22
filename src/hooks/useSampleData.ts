import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContractorStore } from '../state/contractorStore';
import { useKPIStore } from '../state/kpiStore';
import { sampleLeads, sampleTeamMembers } from '../utils/sampleData';
import { sampleKPIData } from '../utils/sampleKPIData';

const SAMPLE_DATA_KEY = 'sample_data_loaded';

export const useSampleData = () => {
  const { addLead, addTeamMember, leads, teamMembers } = useContractorStore();
  const { addDailyInput, dailyInputs } = useKPIStore();

  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const sampleDataLoaded = await AsyncStorage.getItem(SAMPLE_DATA_KEY);
        
        // Only load sample data if it hasn't been loaded before
        if (!sampleDataLoaded) {
          // Load data in background without delays to prevent UI blocking
          
          // Load sample leads
          sampleLeads.forEach(lead => addLead(lead));
          

          
          // Load sample team members
          sampleTeamMembers.forEach(member => addTeamMember(member));
          
          // Load sample KPI data
          sampleKPIData.forEach(kpiData => addDailyInput(kpiData));

          // Mark sample data as loaded
          await AsyncStorage.setItem(SAMPLE_DATA_KEY, 'true');
        }
      } catch (error) {
        console.error('Error loading sample data:', error);
        // Continue anyway - don't block the app
      }
    };

    // Load data without blocking the UI
    setTimeout(loadSampleData, 100);
  }, []); // Empty dependency array - only run once on mount
};