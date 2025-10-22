import { LeadFilterSettings } from '../state/leadFilterStore';
import { Lead } from '../state/contractorStore';
import { PIPELINE_STAGES, getStageByKey } from '../types/pipeline';

// Map lead status to filter key
export const statusToFilterKey = (status: Lead['status']): keyof LeadFilterSettings | null => {
  const statusMap: Record<Lead['status'], keyof LeadFilterSettings> = {
    'new': 'new',
    'contacted': 'contacted',
    'appointment_set': 'appointment_set',
    'appointment_held': 'appointment_held',
    'negotiation': 'negotiation',
    'signed_deal': 'signed_deal',
    'site_survey_scheduled': 'site_survey_scheduled',
    'site_survey_completed': 'site_survey_completed',
    'change_order_required': 'change_order_required',
    'submitted_for_permits': 'submitted_for_permits',
    'permits_approved': 'permits_approved',
    'install_scheduled': 'install_scheduled',
    'installed': 'installed',
    'cancelled_appointment': 'cancelled_appointment',
    'held_not_interested': 'held_not_interested',
    'unqualified': 'unqualified',
    'cancelled_contract': 'cancelled_contract',
  };
  
  return statusMap[status] || null;
};

// Check if a stage is visible based on filter settings
export const isStageVisible = (status: Lead['status'], filterSettings: LeadFilterSettings): boolean => {
  const filterKey = statusToFilterKey(status);
  if (!filterKey) return true; // Default to visible if no mapping found
  return filterSettings[filterKey];
};

// Get all visible stages for pipeline progression
export const getVisibleProgressionStages = (filterSettings: LeadFilterSettings) => {
  const allStages = [
    { key: 'new' as const, title: 'New Lead', icon: 'person-add' as const },
    { key: 'contacted' as const, title: 'Contacted', icon: 'call' as const },
    { key: 'appointment_set' as const, title: 'Appointment Set', icon: 'calendar' as const },
    { key: 'appointment_held' as const, title: 'Appointment Held', icon: 'checkmark-circle' as const },
    { key: 'negotiation' as const, title: 'In Negotiation', icon: 'chatbubbles' as const },
    { key: 'signed_deal' as const, title: 'Signed Deal', icon: 'document-text' as const },
    { key: 'site_survey_scheduled' as const, title: 'Site Survey Scheduled', icon: 'location' as const },
    { key: 'site_survey_completed' as const, title: 'Site Survey Completed', icon: 'clipboard' as const },
    { key: 'change_order_required' as const, title: 'Change Order Required', icon: 'construct' as const },
    { key: 'submitted_for_permits' as const, title: 'Submitted for Permits', icon: 'document-text' as const },
    { key: 'permits_approved' as const, title: 'Permits Approved', icon: 'checkmark-done-circle' as const },
    { key: 'install_scheduled' as const, title: 'Install Scheduled', icon: 'calendar' as const },
    { key: 'installed' as const, title: 'Install Completed', icon: 'home' as const },
  ];
  
  return allStages.filter(stage => isStageVisible(stage.key, filterSettings));
};

// Get all visible status options for lead detail screen
export const getVisibleStatusOptions = (filterSettings: LeadFilterSettings) => {
  const progressionStages = [
    { key: 'new', label: 'New Lead', color: 'bg-blue-500', icon: 'person-add' as const, description: 'Initial lead captured' },
    { key: 'contacted', label: 'Contacted', color: 'bg-yellow-500', icon: 'call' as const, description: 'First contact made' },
    { key: 'appointment_set', label: 'Appointment Set', color: 'bg-green-500', icon: 'calendar' as const, description: 'Meeting scheduled' },
    { key: 'appointment_held', label: 'Appointment Held', color: 'bg-purple-500', icon: 'checkmark-circle' as const, description: 'Meeting completed' },
    { key: 'negotiation', label: 'In Negotiation', color: 'bg-indigo-500', icon: 'chatbubbles' as const, description: 'Discussing terms' },
    { key: 'signed_deal', label: 'Signed Deal', color: 'bg-emerald-500', icon: 'document-text' as const, description: 'Contract signed' },
    { key: 'site_survey_scheduled', label: 'Site Survey Scheduled', color: 'bg-teal-500', icon: 'location' as const, description: 'Site survey scheduled' },
    { key: 'site_survey_completed', label: 'Site Survey Completed', color: 'bg-cyan-500', icon: 'clipboard' as const, description: 'Site survey completed' },
    { key: 'change_order_required', label: 'Change Order Required', color: 'bg-amber-500', icon: 'construct' as const, description: 'Change order needed' },
    { key: 'submitted_for_permits', label: 'Submitted for Permits', color: 'bg-blue-600', icon: 'document-text' as const, description: 'Permits submitted for approval' },
    { key: 'permits_approved', label: 'Permits Approved', color: 'bg-green-600', icon: 'checkmark-done-circle' as const, description: 'Permits have been approved' },
    { key: 'install_scheduled', label: 'Install Scheduled', color: 'bg-orange-500', icon: 'calendar' as const, description: 'Installation scheduled' },
    { key: 'installed', label: 'Install Completed', color: 'bg-green-600', icon: 'home' as const, description: 'Installation completed' },
  ];

  const lostReasons = [
    { key: 'cancelled_appointment', label: 'Cancelled Appointment', color: 'bg-orange-500', icon: 'close-circle' as const, description: 'Meeting was cancelled' },
    { key: 'held_not_interested', label: 'Held Not Interested', color: 'bg-orange-500', icon: 'thumbs-down' as const, description: 'Met but not interested' },
    { key: 'unqualified', label: 'Unqualified', color: 'bg-gray-500', icon: 'warning' as const, description: 'Does not meet criteria' },
    { key: 'cancelled_contract', label: 'Cancelled Contract', color: 'bg-red-500', icon: 'document-text' as const, description: 'Contract was cancelled' },
  ] as const;

  const visibleProgression = progressionStages.filter(stage => 
    isStageVisible(stage.key as Lead['status'], filterSettings)
  );
  
  const visibleLostReasons = lostReasons.filter(stage => 
    isStageVisible(stage.key as Lead['status'], filterSettings)
  );

  return {
    progressionStages: visibleProgression,
    lostReasons: visibleLostReasons,
    allVisible: [...visibleProgression, ...visibleLostReasons]
  };
};

// Check if the current lead status is hidden
export const isLeadInHiddenStage = (lead: Lead, filterSettings: LeadFilterSettings): boolean => {
  return !isStageVisible(lead.status, filterSettings);
};

// Get the label for the current stage (visible or hidden)
export const getStageLabel = (status: Lead['status']): string => {
  const statusLabels: Record<Lead['status'], string> = {
    'new': 'New Lead',
    'contacted': 'Contacted', 
    'appointment_set': 'Appointment Set',
    'appointment_held': 'Appointment Held',
    'negotiation': 'In Negotiation',
    'signed_deal': 'Signed Deal',
    'site_survey_scheduled': 'Site Survey Scheduled',
    'site_survey_completed': 'Site Survey Completed',
    'change_order_required': 'Change Order Required',
    'submitted_for_permits': 'Submitted for Permits',
    'permits_approved': 'Permits Approved',
    'install_scheduled': 'Install Scheduled',
    'installed': 'Install Completed',
    'cancelled_appointment': 'Cancelled Appointment',
    'held_not_interested': 'Held Not Interested',
    'unqualified': 'Unqualified',
    'cancelled_contract': 'Cancelled Contract',
  };
  
  return statusLabels[status] || status;
};