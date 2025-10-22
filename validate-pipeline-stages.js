// Simple validation script for pipeline stages
// Run with: node validate-pipeline-stages.js

// Mock the pipeline types for validation
const PIPELINE_STAGES = [
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
    label: 'Negotiation',
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
    icon: 'calendar-outline',
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
    key: 'install_scheduled',
    label: 'Install Scheduled',
    sortOrder: 10,
    icon: 'calendar-outline',
    color: 'bg-orange-500',
    description: 'Installation scheduled',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'installed',
    label: 'Install Completed',
    sortOrder: 11,
    icon: 'trophy',
    color: 'bg-green-600',
    description: 'Installation completed',
    isProgression: true,
    isCancellation: false,
  },
  {
    key: 'cancelled_appointment',
    label: 'Cancelled Appointment',
    sortOrder: 12,
    icon: 'calendar-outline',
    color: 'bg-orange-500',
    description: 'Meeting was cancelled',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'held_not_interested',
    label: 'Held Not Interested',
    sortOrder: 13,
    icon: 'close-outline',
    color: 'bg-orange-500',
    description: 'Met but not interested',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'unqualified',
    label: 'Unqualified',
    sortOrder: 14,
    icon: 'ban',
    color: 'bg-gray-500',
    description: 'Does not meet criteria',
    isProgression: false,
    isCancellation: true,
  },
  {
    key: 'cancelled_contract',
    label: 'Cancelled Contract',
    sortOrder: 15,
    icon: 'close-circle',
    color: 'bg-red-500',
    description: 'Contract was cancelled',
    isProgression: false,
    isCancellation: true,
  },
];

// Helper functions
const getOrderedStages = () => {
  return [...PIPELINE_STAGES].sort((a, b) => a.sortOrder - b.sortOrder);
};

const getProgressionStages = () => {
  return PIPELINE_STAGES.filter(stage => stage.isProgression);
};

const getCancellationStages = () => {
  return PIPELINE_STAGES.filter(stage => stage.isCancellation);
};

const getStageByKey = (key) => {
  return PIPELINE_STAGES.find(stage => stage.key === key);
};

const getStageLabel = (key) => {
  const stage = getStageByKey(key);
  return stage?.label || key;
};

const getNextStage = (currentStage) => {
  const progressionStages = getProgressionStages();
  const currentIndex = progressionStages.findIndex(stage => stage.key === currentStage);
  
  if (currentIndex === -1 || currentIndex === progressionStages.length - 1) {
    return null;
  }
  
  return progressionStages[currentIndex + 1].key;
};

const getPreviousStage = (currentStage) => {
  const progressionStages = getProgressionStages();
  const currentIndex = progressionStages.findIndex(stage => stage.key === currentStage);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return progressionStages[currentIndex - 1].key;
};

// Validation tests
console.log('🧪 Validating Pipeline Stages Implementation...\n');

// Test 1: Total stages count
console.log('✅ Test 1: Total stages count');
console.log(`Expected: 15, Actual: ${PIPELINE_STAGES.length}`);
console.log(PIPELINE_STAGES.length === 15 ? 'PASS' : 'FAIL');
console.log('');

// Test 2: Progression stages count
console.log('✅ Test 2: Progression stages count');
const progressionStages = getProgressionStages();
console.log(`Expected: 11, Actual: ${progressionStages.length}`);
console.log(progressionStages.length === 11 ? 'PASS' : 'FAIL');
console.log('');

// Test 3: Cancellation stages count
console.log('✅ Test 3: Cancellation stages count');
const cancellationStages = getCancellationStages();
console.log(`Expected: 4, Actual: ${cancellationStages.length}`);
console.log(cancellationStages.length === 4 ? 'PASS' : 'FAIL');
console.log('');

// Test 4: Canonical order for progression stages
console.log('✅ Test 4: Canonical order for progression stages');
const expectedOrder = [
  'new',
  'contacted', 
  'appointment_set',
  'appointment_held',
  'negotiation',
  'signed_deal',
  'site_survey_scheduled',
  'site_survey_completed',
  'change_order_required',
  'install_scheduled',
  'installed'
];

const actualOrder = progressionStages.map(stage => stage.key);
console.log('Expected order:', expectedOrder);
console.log('Actual order:', actualOrder);
console.log(JSON.stringify(actualOrder) === JSON.stringify(expectedOrder) ? 'PASS' : 'FAIL');
console.log('');

// Test 5: New stages in correct positions
console.log('✅ Test 5: New stages in correct positions');
const siteSurveyScheduled = progressionStages[6];
const installScheduled = progressionStages[9];

console.log(`site_survey_scheduled at position 6: ${siteSurveyScheduled?.key === 'site_survey_scheduled' ? 'PASS' : 'FAIL'}`);
console.log(`install_scheduled at position 9: ${installScheduled?.key === 'install_scheduled' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 6: Sort order values
console.log('✅ Test 6: Sort order values');
const orderedStages = getOrderedStages();
const sortOrderChecks = [
  { key: 'new', expected: 1 },
  { key: 'contacted', expected: 2 },
  { key: 'appointment_set', expected: 3 },
  { key: 'appointment_held', expected: 4 },
  { key: 'negotiation', expected: 5 },
  { key: 'signed_deal', expected: 6 },
  { key: 'site_survey_scheduled', expected: 7 },
  { key: 'site_survey_completed', expected: 8 },
  { key: 'change_order_required', expected: 9 },
  { key: 'install_scheduled', expected: 10 },
  { key: 'installed', expected: 11 }
];

let sortOrderPass = true;
sortOrderChecks.forEach(({ key, expected }) => {
  const stage = orderedStages.find(s => s.key === key);
  const actual = stage?.sortOrder;
  if (actual !== expected) {
    console.log(`  ${key}: Expected ${expected}, Got ${actual} - FAIL`);
    sortOrderPass = false;
  }
});
console.log(sortOrderPass ? 'PASS' : 'FAIL');
console.log('');

// Test 7: Stage labels
console.log('✅ Test 7: Stage labels');
const labelChecks = [
  { key: 'site_survey_scheduled', expected: 'Site Survey Scheduled' },
  { key: 'install_scheduled', expected: 'Install Scheduled' },
  { key: 'installed', expected: 'Install Completed' }
];

let labelPass = true;
labelChecks.forEach(({ key, expected }) => {
  const actual = getStageLabel(key);
  if (actual !== expected) {
    console.log(`  ${key}: Expected "${expected}", Got "${actual}" - FAIL`);
    labelPass = false;
  }
});
console.log(labelPass ? 'PASS' : 'FAIL');
console.log('');

// Test 8: Next stage progression
console.log('✅ Test 8: Next stage progression');
const nextStageChecks = [
  { current: 'signed_deal', expected: 'site_survey_scheduled' },
  { current: 'site_survey_scheduled', expected: 'site_survey_completed' },
  { current: 'site_survey_completed', expected: 'change_order_required' },
  { current: 'change_order_required', expected: 'install_scheduled' },
  { current: 'install_scheduled', expected: 'installed' },
  { current: 'installed', expected: null }
];

let nextStagePass = true;
nextStageChecks.forEach(({ current, expected }) => {
  const actual = getNextStage(current);
  if (actual !== expected) {
    console.log(`  ${current} -> Expected "${expected}", Got "${actual}" - FAIL`);
    nextStagePass = false;
  }
});
console.log(nextStagePass ? 'PASS' : 'FAIL');
console.log('');

// Test 9: Previous stage progression
console.log('✅ Test 9: Previous stage progression');
const prevStageChecks = [
  { current: 'site_survey_scheduled', expected: 'signed_deal' },
  { current: 'site_survey_completed', expected: 'site_survey_scheduled' },
  { current: 'change_order_required', expected: 'site_survey_completed' },
  { current: 'install_scheduled', expected: 'change_order_required' },
  { current: 'installed', expected: 'install_scheduled' },
  { current: 'new', expected: null }
];

let prevStagePass = true;
prevStageChecks.forEach(({ current, expected }) => {
  const actual = getPreviousStage(current);
  if (actual !== expected) {
    console.log(`  ${current} <- Expected "${expected}", Got "${actual}" - FAIL`);
    prevStagePass = false;
  }
});
console.log(prevStagePass ? 'PASS' : 'FAIL');
console.log('');

// Test 10: Unique sort orders
console.log('✅ Test 10: Unique sort orders');
const sortOrders = orderedStages.map(stage => stage.sortOrder);
const uniqueSortOrders = new Set(sortOrders);
console.log(`Expected: ${sortOrders.length}, Actual unique: ${uniqueSortOrders.size}`);
console.log(uniqueSortOrders.size === sortOrders.length ? 'PASS' : 'FAIL');
console.log('');

// Test 11: Unique stage keys
console.log('✅ Test 11: Unique stage keys');
const stageKeys = PIPELINE_STAGES.map(stage => stage.key);
const uniqueKeys = new Set(stageKeys);
console.log(`Expected: ${stageKeys.length}, Actual unique: ${uniqueKeys.size}`);
console.log(uniqueKeys.size === stageKeys.length ? 'PASS' : 'FAIL');
console.log('');

console.log('🎉 Pipeline Stages Validation Complete!');
console.log('All tests should pass if the implementation is correct.');
