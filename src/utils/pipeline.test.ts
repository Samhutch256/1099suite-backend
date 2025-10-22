import { 
  LeadStage, 
  ProgressionStage, 
  PIPELINE_STAGES, 
  getOrderedStages, 
  getProgressionStages, 
  getStageByKey,
  getStageLabel,
  getNextStage,
  getPreviousStage,
  isProgressionStage,
  isCancellationStage
} from '../types/pipeline';

describe('Pipeline Stages - Permit Stages Integration', () => {
  describe('Type Definitions', () => {
    it('should include submitted_for_permits in LeadStage type', () => {
      const stage: LeadStage = 'submitted_for_permits';
      expect(stage).toBe('submitted_for_permits');
    });

    it('should include permits_approved in LeadStage type', () => {
      const stage: LeadStage = 'permits_approved';
      expect(stage).toBe('permits_approved');
    });

    it('should include both permit stages in ProgressionStage type', () => {
      const stage1: ProgressionStage = 'submitted_for_permits';
      const stage2: ProgressionStage = 'permits_approved';
      expect(stage1).toBe('submitted_for_permits');
      expect(stage2).toBe('permits_approved');
    });
  });

  describe('PIPELINE_STAGES Constant', () => {
    it('should include submitted_for_permits with correct properties', () => {
      const stage = getStageByKey('submitted_for_permits');
      expect(stage).toBeDefined();
      expect(stage?.key).toBe('submitted_for_permits');
      expect(stage?.label).toBe('Submitted for Permits');
      expect(stage?.sortOrder).toBe(10);
      expect(stage?.icon).toBe('document-text-outline');
      expect(stage?.color).toBe('bg-blue-600');
      expect(stage?.description).toBe('Permits submitted for approval');
      expect(stage?.isProgression).toBe(true);
      expect(stage?.isCancellation).toBe(false);
    });

    it('should include permits_approved with correct properties', () => {
      const stage = getStageByKey('permits_approved');
      expect(stage).toBeDefined();
      expect(stage?.key).toBe('permits_approved');
      expect(stage?.label).toBe('Permits Approved');
      expect(stage?.sortOrder).toBe(11);
      expect(stage?.icon).toBe('checkmark-done-circle');
      expect(stage?.color).toBe('bg-green-600');
      expect(stage?.description).toBe('Permits have been approved');
      expect(stage?.isProgression).toBe(true);
      expect(stage?.isCancellation).toBe(false);
    });

    it('should maintain correct sort order for all stages', () => {
      const orderedStages = getOrderedStages();
      const progressionStages = getProgressionStages();
      
      // Check that permit stages are in correct position
      const changeOrderIndex = progressionStages.findIndex(s => s.key === 'change_order_required');
      const submittedForPermitsIndex = progressionStages.findIndex(s => s.key === 'submitted_for_permits');
      const permitsApprovedIndex = progressionStages.findIndex(s => s.key === 'permits_approved');
      const installScheduledIndex = progressionStages.findIndex(s => s.key === 'install_scheduled');
      
      expect(submittedForPermitsIndex).toBe(changeOrderIndex + 1);
      expect(permitsApprovedIndex).toBe(submittedForPermitsIndex + 1);
      expect(installScheduledIndex).toBe(permitsApprovedIndex + 1);
    });
  });

  describe('Stage Navigation', () => {
    it('should get next stage from change_order_required to submitted_for_permits', () => {
      const nextStage = getNextStage('change_order_required');
      expect(nextStage).toBe('submitted_for_permits');
    });

    it('should get next stage from submitted_for_permits to permits_approved', () => {
      const nextStage = getNextStage('submitted_for_permits');
      expect(nextStage).toBe('permits_approved');
    });

    it('should get next stage from permits_approved to install_scheduled', () => {
      const nextStage = getNextStage('permits_approved');
      expect(nextStage).toBe('install_scheduled');
    });

    it('should get previous stage from install_scheduled to permits_approved', () => {
      const prevStage = getPreviousStage('install_scheduled');
      expect(prevStage).toBe('permits_approved');
    });

    it('should get previous stage from permits_approved to submitted_for_permits', () => {
      const prevStage = getPreviousStage('permits_approved');
      expect(prevStage).toBe('submitted_for_permits');
    });

    it('should get previous stage from submitted_for_permits to change_order_required', () => {
      const prevStage = getPreviousStage('submitted_for_permits');
      expect(prevStage).toBe('change_order_required');
    });
  });

  describe('Stage Classification', () => {
    it('should classify submitted_for_permits as progression stage', () => {
      expect(isProgressionStage('submitted_for_permits')).toBe(true);
    });

    it('should classify permits_approved as progression stage', () => {
      expect(isProgressionStage('permits_approved')).toBe(true);
    });

    it('should not classify permit stages as cancellation stages', () => {
      expect(isCancellationStage('submitted_for_permits')).toBe(false);
      expect(isCancellationStage('permits_approved')).toBe(false);
    });
  });

  describe('Stage Labels', () => {
    it('should return correct label for submitted_for_permits', () => {
      expect(getStageLabel('submitted_for_permits')).toBe('Submitted for Permits');
    });

    it('should return correct label for permits_approved', () => {
      expect(getStageLabel('permits_approved')).toBe('Permits Approved');
    });
  });

  describe('Integration with Lead Creation', () => {
    it('should allow creating a lead with submitted_for_permits status', () => {
      const leadData = {
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '123-456-7890',
        company: 'Test Company',
        status: 'submitted_for_permits' as LeadStage,
        value: 5000,
        notes: 'Test lead with permit stage',
        source: 'other' as const,
      };
      
      expect(leadData.status).toBe('submitted_for_permits');
      expect(isProgressionStage(leadData.status)).toBe(true);
    });

    it('should allow creating a lead with permits_approved status', () => {
      const leadData = {
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '123-456-7890',
        company: 'Test Company',
        status: 'permits_approved' as LeadStage,
        value: 5000,
        notes: 'Test lead with approved permits',
        source: 'other' as const,
      };
      
      expect(leadData.status).toBe('permits_approved');
      expect(isProgressionStage(leadData.status)).toBe(true);
    });
  });

  describe('Stage Progression Validation', () => {
    it('should validate correct stage progression through permit stages', () => {
      const progressionStages = getProgressionStages();
      const changeOrderIndex = progressionStages.findIndex(s => s.key === 'change_order_required');
      const submittedForPermitsIndex = progressionStages.findIndex(s => s.key === 'submitted_for_permits');
      const permitsApprovedIndex = progressionStages.findIndex(s => s.key === 'permits_approved');
      const installScheduledIndex = progressionStages.findIndex(s => s.key === 'install_scheduled');
      
      // Verify all stages exist and are in correct order
      expect(changeOrderIndex).toBeGreaterThan(-1);
      expect(submittedForPermitsIndex).toBeGreaterThan(-1);
      expect(permitsApprovedIndex).toBeGreaterThan(-1);
      expect(installScheduledIndex).toBeGreaterThan(-1);
      
      // Verify order
      expect(submittedForPermitsIndex).toBe(changeOrderIndex + 1);
      expect(permitsApprovedIndex).toBe(submittedForPermitsIndex + 1);
      expect(installScheduledIndex).toBe(permitsApprovedIndex + 1);
    });
  });
});
