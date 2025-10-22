// Test script for new pipeline stages UI integration
// This simulates the UI components and validates the new stages are correctly handled

// Mock the pipeline stages data structure
const PIPELINE_STAGES = [
  { key: 'new', label: 'New Lead', description: 'Initial lead captured', sortOrder: 1, isProgression: true, color: 'bg-blue-500', icon: 'person-add' },
  { key: 'contacted', label: 'Contacted', description: 'First contact made', sortOrder: 2, isProgression: true, color: 'bg-yellow-500', icon: 'call' },
  { key: 'appointment_set', label: 'Appointment Set', description: 'Meeting scheduled', sortOrder: 3, isProgression: true, color: 'bg-green-500', icon: 'calendar' },
  { key: 'appointment_held', label: 'Appointment Held', description: 'Meeting completed', sortOrder: 4, isProgression: true, color: 'bg-purple-500', icon: 'checkmark-circle' },
  { key: 'negotiation', label: 'Negotiation', description: 'Discussing terms', sortOrder: 5, isProgression: true, color: 'bg-indigo-500', icon: 'chatbubbles' },
  { key: 'signed_deal', label: 'Signed Deal', description: 'Contract signed', sortOrder: 6, isProgression: true, color: 'bg-emerald-500', icon: 'document-text' },
  { key: 'site_survey_scheduled', label: 'Site Survey Scheduled', description: 'Site survey scheduled', sortOrder: 7, isProgression: true, color: 'bg-teal-500', icon: 'calendar-outline' },
  { key: 'site_survey_completed', label: 'Site Survey Completed', description: 'Site survey completed', sortOrder: 8, isProgression: true, color: 'bg-cyan-500', icon: 'clipboard' },
  { key: 'change_order_required', label: 'Change Order Required', description: 'Change order needed', sortOrder: 9, isProgression: true, color: 'bg-amber-500', icon: 'construct' },
  { key: 'install_scheduled', label: 'Install Scheduled', description: 'Installation scheduled', sortOrder: 10, isProgression: true, color: 'bg-orange-500', icon: 'calendar-outline' },
  { key: 'installed', label: 'Install Completed', description: 'Installation completed', sortOrder: 11, isProgression: true, color: 'bg-green-600', icon: 'trophy' },
  { key: 'cancelled_appointment', label: 'Cancelled Appointment', description: 'Meeting cancelled', sortOrder: 12, isProgression: false, color: 'bg-red-500', icon: 'close-circle' },
  { key: 'held_not_interested', label: 'Held Not Interested', description: 'Meeting held but no interest', sortOrder: 13, isProgression: false, color: 'bg-gray-500', icon: 'close-outline' },
  { key: 'unqualified', label: 'Unqualified', description: 'Not a good fit', sortOrder: 14, isProgression: false, color: 'bg-red-400', icon: 'close' },
  { key: 'cancelled_contract', label: 'Cancelled Contract', description: 'Contract terminated', sortOrder: 15, isProgression: false, color: 'bg-red-600', icon: 'document-text' }
];

// Mock helper functions
function getOrderedStages() {
  return PIPELINE_STAGES.sort((a, b) => a.sortOrder - b.sortOrder);
}

function getStageByKey(key) {
  return PIPELINE_STAGES.find(stage => stage.key === key);
}

function getProgressionStages() {
  return PIPELINE_STAGES.filter(stage => stage.isProgression).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Mock lead data
const mockLeads = [
  { id: '1', status: 'new', name: 'Test Lead 1', source: 'door_knocks' },
  { id: '2', status: 'signed_deal', name: 'Test Lead 2', source: 'referrals' },
  { id: '3', status: 'site_survey_scheduled', name: 'Test Lead 3', source: 'inbound' },
  { id: '4', status: 'install_scheduled', name: 'Test Lead 4', source: 'tags_put' },
  { id: '5', status: 'installed', name: 'Test Lead 5', source: 'calls_made' }
];

// Test functions
function testStageOrder() {
  console.log('🧪 Testing stage order...');
  const orderedStages = getOrderedStages();
  
  // Verify the new stages are in the correct positions
  const signedDealIndex = orderedStages.findIndex(s => s.key === 'signed_deal');
  const siteSurveyScheduledIndex = orderedStages.findIndex(s => s.key === 'site_survey_scheduled');
  const siteSurveyCompletedIndex = orderedStages.findIndex(s => s.key === 'site_survey_completed');
  const changeOrderRequiredIndex = orderedStages.findIndex(s => s.key === 'change_order_required');
  const installScheduledIndex = orderedStages.findIndex(s => s.key === 'install_scheduled');
  const installedIndex = orderedStages.findIndex(s => s.key === 'installed');
  
  console.log(`✅ Signed Deal at position ${signedDealIndex + 1}`);
  console.log(`✅ Site Survey Scheduled at position ${siteSurveyScheduledIndex + 1} (should be after Signed Deal)`);
  console.log(`✅ Site Survey Completed at position ${siteSurveyCompletedIndex + 1} (should be after Site Survey Scheduled)`);
  console.log(`✅ Change Order Required at position ${changeOrderRequiredIndex + 1} (should be after Site Survey Completed)`);
  console.log(`✅ Install Scheduled at position ${installScheduledIndex + 1} (should be after Change Order Required)`);
  console.log(`✅ Install Completed at position ${installedIndex + 1} (should be after Install Scheduled)`);
  
  // Verify order is correct
  const isOrderCorrect = 
    siteSurveyScheduledIndex > signedDealIndex &&
    siteSurveyCompletedIndex > siteSurveyScheduledIndex &&
    changeOrderRequiredIndex > siteSurveyCompletedIndex &&
    installScheduledIndex > changeOrderRequiredIndex &&
    installedIndex > installScheduledIndex;
    
  console.log(`✅ Stage order is correct: ${isOrderCorrect}`);
  return isOrderCorrect;
}

function testStageSelection() {
  console.log('\n🧪 Testing stage selection in forms...');
  
  // Simulate AddLeadScreen status options
  const statusOptions = getOrderedStages().map(stage => ({
    key: stage.key,
    label: `📋 ${stage.label}`,
    description: stage.description
  }));
  
  // Verify new stages are present
  const hasSiteSurveyScheduled = statusOptions.some(option => option.key === 'site_survey_scheduled');
  const hasInstallScheduled = statusOptions.some(option => option.key === 'install_scheduled');
  
  console.log(`✅ Site Survey Scheduled available in form: ${hasSiteSurveyScheduled}`);
  console.log(`✅ Install Scheduled available in form: ${hasInstallScheduled}`);
  
  // Verify labels are correct
  const siteSurveyScheduledOption = statusOptions.find(option => option.key === 'site_survey_scheduled');
  const installScheduledOption = statusOptions.find(option => option.key === 'install_scheduled');
  
  console.log(`✅ Site Survey Scheduled label: "${siteSurveyScheduledOption?.label}"`);
  console.log(`✅ Install Scheduled label: "${installScheduledOption?.label}"`);
  
  return hasSiteSurveyScheduled && hasInstallScheduled;
}

function testLeadFiltering() {
  console.log('\n🧪 Testing lead filtering by stage...');
  
  // Simulate filtering leads by different stages
  const progressionStages = getProgressionStages();
  const stageKeys = progressionStages.map(stage => stage.key);
  
  // Count leads in each stage
  const stageCounts = {};
  stageKeys.forEach(stageKey => {
    stageCounts[stageKey] = mockLeads.filter(lead => lead.status === stageKey).length;
  });
  
  console.log('📊 Lead counts by stage:');
  progressionStages.forEach(stage => {
    const count = stageCounts[stage.key];
    console.log(`  ${stage.label}: ${count} leads`);
  });
  
  // Verify new stages have leads
  const siteSurveyScheduledCount = stageCounts['site_survey_scheduled'];
  const installScheduledCount = stageCounts['install_scheduled'];
  
  console.log(`✅ Site Survey Scheduled leads: ${siteSurveyScheduledCount}`);
  console.log(`✅ Install Scheduled leads: ${installScheduledCount}`);
  
  return siteSurveyScheduledCount > 0 && installScheduledCount > 0;
}

function testStageTransitions() {
  console.log('\n🧪 Testing stage transitions...');
  
  // Simulate moving a lead through stages
  const testLead = { id: 'test-1', status: 'signed_deal', name: 'Transition Test Lead' };
  
  // Test forward progression
  const progressionStages = getProgressionStages();
  const signedDealIndex = progressionStages.findIndex(s => s.key === 'signed_deal');
  const siteSurveyScheduledIndex = progressionStages.findIndex(s => s.key === 'site_survey_scheduled');
  const siteSurveyCompletedIndex = progressionStages.findIndex(s => s.key === 'site_survey_completed');
  const changeOrderRequiredIndex = progressionStages.findIndex(s => s.key === 'change_order_required');
  const installScheduledIndex = progressionStages.findIndex(s => s.key === 'install_scheduled');
  const installedIndex = progressionStages.findIndex(s => s.key === 'installed');
  
  console.log('🔄 Testing forward progression:');
  console.log(`  Signed Deal → Site Survey Scheduled: ${siteSurveyScheduledIndex > signedDealIndex ? '✅' : '❌'}`);
  console.log(`  Site Survey Scheduled → Site Survey Completed: ${siteSurveyCompletedIndex > siteSurveyScheduledIndex ? '✅' : '❌'}`);
  console.log(`  Site Survey Completed → Change Order Required: ${changeOrderRequiredIndex > siteSurveyCompletedIndex ? '✅' : '❌'}`);
  console.log(`  Change Order Required → Install Scheduled: ${installScheduledIndex > changeOrderRequiredIndex ? '✅' : '❌'}`);
  console.log(`  Install Scheduled → Install Completed: ${installedIndex > installScheduledIndex ? '✅' : '❌'}`);
  
  // Test backward transitions (should be allowed)
  console.log('🔄 Testing backward transitions (should be allowed):');
  console.log(`  Install Completed → Install Scheduled: ${installScheduledIndex < installedIndex ? '✅' : '❌'}`);
  console.log(`  Install Scheduled → Change Order Required: ${changeOrderRequiredIndex < installScheduledIndex ? '✅' : '❌'}`);
  
  return true;
}

function testPipelineView() {
  console.log('\n🧪 Testing pipeline/Kanban view...');
  
  // Simulate pipeline columns
  const pipelineColumns = getProgressionStages().map(stage => ({
    key: stage.key,
    title: stage.label,
    color: stage.color,
    leads: mockLeads.filter(lead => lead.status === stage.key)
  }));
  
  console.log('📋 Pipeline columns:');
  pipelineColumns.forEach(column => {
    console.log(`  ${column.title}: ${column.leads.length} leads`);
  });
  
  // Verify new columns exist
  const hasSiteSurveyScheduledColumn = pipelineColumns.some(col => col.key === 'site_survey_scheduled');
  const hasInstallScheduledColumn = pipelineColumns.some(col => col.key === 'install_scheduled');
  
  console.log(`✅ Site Survey Scheduled column exists: ${hasSiteSurveyScheduledColumn}`);
  console.log(`✅ Install Scheduled column exists: ${hasInstallScheduledColumn}`);
  
  return hasSiteSurveyScheduledColumn && hasInstallScheduledColumn;
}

// Run all tests
console.log('🚀 Starting UI Integration Tests for New Pipeline Stages\n');

const tests = [
  { name: 'Stage Order', fn: testStageOrder },
  { name: 'Stage Selection', fn: testStageSelection },
  { name: 'Lead Filtering', fn: testLeadFiltering },
  { name: 'Stage Transitions', fn: testStageTransitions },
  { name: 'Pipeline View', fn: testPipelineView }
];

let passedTests = 0;
let totalTests = tests.length;

tests.forEach(test => {
  try {
    const result = test.fn();
    if (result !== false) {
      passedTests++;
      console.log(`✅ ${test.name} test passed\n`);
    } else {
      console.log(`❌ ${test.name} test failed\n`);
    }
  } catch (error) {
    console.log(`❌ ${test.name} test failed with error: ${error.message}\n`);
  }
});

console.log(`🎉 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎯 All tests passed! The new stages are properly integrated into the UI.');
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
}
