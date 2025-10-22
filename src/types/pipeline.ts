// Pipeline stages configuration and types
// This file serves as the single source of truth for lead pipeline stages

export type LeadStage = 
  | 'new'
  | 'contacted'
  | 'appointment_set'
  | 'appointment_held'
  | 'negotiation'
  | 'signed_deal'
  | 'site_survey_scheduled'
  | 'site_survey_completed'
  | 'change_order_required'
  | 'submitted_for_permits'
  | 'permits_approved'
  | 'install_scheduled'
  | 'installed'
  | 'cancelled_appointment'
  | 'held_not_interested'
  | 'unqualified'
  | 'cancelled_contract';

export type ProgressionStage = 
  | 'new'
  | 'contacted'
  | 'appointment_set'
  | 'appointment_held'
  | 'negotiation'
  | 'signed_deal'
  | 'site_survey_scheduled'
  | 'site_survey_completed'
  | 'change_order_required'
  | 'submitted_for_permits'
  | 'permits_approved'
  | 'install_scheduled'
  | 'installed';

export type CancellationStage = 
  | 'cancelled_appointment'
  | 'held_not_interested'
  | 'unqualified'
  | 'cancelled_contract';

export interface PipelineStage {
  key: LeadStage;
  label: string;
  sortOrder: number;
  icon: string;
  color: string;
  description: string;
  isProgression: boolean;
  isCancellation: boolean;
}

// Canonical pipeline stages in the correct order
export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: 'new',
    label: 'New Lead',
    sortOrder: 1,
    icon: 'person-add',
    color: 'bg-blue-500',
    description: 'Initial lead captured',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'contacted',
    label: 'Contacted',
    sortOrder: 2,
    icon: 'call',
    color: 'bg-yellow-500',
    description: 'First contact made',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'appointment_set',
    label: 'Appointment Set',
    sortOrder: 3,
    icon: 'calendar',
    color: 'bg-green-500',
    description: 'Meeting scheduled',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'appointment_held',
    label: 'Appointment Held',
    sortOrder: 4,
    icon: 'checkmark-circle',
    color: 'bg-purple-500',
    description: 'Meeting completed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'negotiation',
    label: 'In Negotiation',
    sortOrder: 5,
    icon: 'chatbubbles',
    color: 'bg-indigo-500',
    description: 'Discussing terms',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'signed_deal',
    label: 'Signed Deal',
    sortOrder: 6,
    icon: 'document-text',
    color: 'bg-emerald-500',
    description: 'Contract signed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'site_survey_scheduled',
    label: 'Site Survey Scheduled',
    sortOrder: 7,
    icon: 'location',
    color: 'bg-teal-500',
    description: 'Site survey scheduled',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'site_survey_completed',
    label: 'Site Survey Completed',
    sortOrder: 8,
    icon: 'clipboard',
    color: 'bg-cyan-500',
    description: 'Site survey completed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'change_order_required',
    label: 'Change Order Required',
    sortOrder: 9,
    icon: 'construct',
    color: 'bg-amber-500',
    description: 'Change order needed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'submitted_for_permits',
    label: 'Submitted for Permits',
    sortOrder: 10,
    icon: 'document-text',
    color: 'bg-blue-600',
    description: 'Permits submitted for approval',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'permits_approved',
    label: 'Permits Approved',
    sortOrder: 11,
    icon: 'checkmark-done-circle',
    color: 'bg-green-600',
    description: 'Permits have been approved',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'install_scheduled',
    label: 'Install Scheduled',
    sortOrder: 12,
    icon: 'calendar',
    color: 'bg-orange-500',
    description: 'Installation scheduled',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'installed',
    label: 'Install Completed',
    sortOrder: 13,
    icon: 'home',
    color: 'bg-green-600',
    description: 'Installation completed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'cancelled_appointment',
    label: 'Cancelled Appointment',
    sortOrder: 14,
    icon: 'close-circle',
    color: 'bg-orange-500',
    description: 'Meeting was cancelled',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'held_not_interested',
    label: 'Held Not Interested',
    sortOrder: 15,
    icon: 'thumbs-down',
    color: 'bg-orange-500',
    description: 'Met but not interested',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'unqualified',
    label: 'Unqualified',
    sortOrder: 16,
    icon: 'warning',
    color: 'bg-gray-500',
    description: 'Does not meet criteria',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'cancelled_contract',
    label: 'Cancelled Contract',
    sortOrder: 17,
    icon: 'document-text',
    color: 'bg-red-500',
    description: 'Contract was cancelled',
    isProgression: false,
    isCancellation: true,
  },
];

// Helper function to get ordered stages
export const getOrderedStages = (): PipelineStage[] => {
  return [...PIPELINE_STAGES].sort((a, b) => a.sortOrder - b.sortOrder);
};

// Helper function to get progression stages only
export const getProgressionStages = (): PipelineStage[] => {
  return PIPELINE_STAGES.filter(stage => stage.isProgression);
};

// Helper function to get cancellation stages only
export const getCancellationStages = (): PipelineStage[] => {
  return PIPELINE_STAGES.filter(stage => stage.isCancellation);
};

// Helper function to get stage by key
export const getStageByKey = (key: LeadStage): PipelineStage | undefined => {
  return PIPELINE_STAGES.find(stage => stage.key === key);
};

// Helper function to get stage label by key
export const getStageLabel = (key: LeadStage): string => {
  const stage = getStageByKey(key);
  return stage?.label || key;
};

// Helper function to get next stage in progression
export const getNextStage = (currentStage: ProgressionStage): ProgressionStage | null => {
  const progressionStages = getProgressionStages();
  const currentIndex = progressionStages.findIndex(stage => stage.key === currentStage);
  
  if (currentIndex === -1 || currentIndex === progressionStages.length - 1) {
    return null;
  }
  
  return progressionStages[currentIndex + 1].key as ProgressionStage;
};

// Helper function to get previous stage in progression
export const getPreviousStage = (currentStage: ProgressionStage): ProgressionStage | null => {
  const progressionStages = getProgressionStages();
  const currentIndex = progressionStages.findIndex(stage => stage.key === currentStage);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return progressionStages[currentIndex - 1].key as ProgressionStage;
};

// Helper function to check if a stage is a progression stage
export const isProgressionStage = (stage: LeadStage): stage is ProgressionStage => {
  return getStageByKey(stage)?.isProgression || false;
};

// Helper function to check if a stage is a cancellation stage
export const isCancellationStage = (stage: LeadStage): stage is CancellationStage => {
  return getStageByKey(stage)?.isCancellation || false;
};
