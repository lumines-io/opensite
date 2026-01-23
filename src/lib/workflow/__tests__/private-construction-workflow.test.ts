import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextStatus,
  getAvailableActions,
  getStatusLabel,
  getActionLabel,
  isPubliclyVisible,
  getStatusColor,
  type ApprovalStatus,
  type WorkflowAction,
} from '../private-construction-workflow';

describe('Private Construction Workflow', () => {
  describe('canTransition', () => {
    describe('sponsor_user actions', () => {
      it('should allow sponsor_user to submit_internal from draft', () => {
        expect(canTransition('draft', 'submit_internal', 'sponsor_user')).toBe(true);
      });

      it('should not allow sponsor_user to submit_direct from draft', () => {
        expect(canTransition('draft', 'submit_direct', 'sponsor_user')).toBe(false);
      });

      it('should allow sponsor_user to resubmit from changes_requested', () => {
        expect(canTransition('changes_requested', 'resubmit', 'sponsor_user')).toBe(true);
      });

      it('should allow sponsor_user to resubmit from rejected', () => {
        expect(canTransition('rejected', 'resubmit', 'sponsor_user')).toBe(true);
      });

      it('should not allow sponsor_user to approve', () => {
        expect(canTransition('under_review', 'approve', 'sponsor_user')).toBe(false);
      });
    });

    describe('sponsor_admin actions', () => {
      it('should allow sponsor_admin to submit_direct from draft', () => {
        expect(canTransition('draft', 'submit_direct', 'sponsor_admin')).toBe(true);
      });

      it('should allow sponsor_admin to approve_internal from internal_review', () => {
        expect(canTransition('internal_review', 'approve_internal', 'sponsor_admin')).toBe(true);
      });

      it('should allow sponsor_admin to return_to_draft from internal_review', () => {
        expect(canTransition('internal_review', 'return_to_draft', 'sponsor_admin')).toBe(true);
      });

      it('should allow sponsor_admin to withdraw from submitted', () => {
        expect(canTransition('submitted', 'withdraw', 'sponsor_admin')).toBe(true);
      });

      it('should allow sponsor_admin to withdraw from changes_requested', () => {
        expect(canTransition('changes_requested', 'withdraw', 'sponsor_admin')).toBe(true);
      });

      it('should not allow sponsor_admin to approve', () => {
        expect(canTransition('under_review', 'approve', 'sponsor_admin')).toBe(false);
      });
    });

    describe('moderator actions', () => {
      it('should allow moderator to start_review from submitted', () => {
        expect(canTransition('submitted', 'start_review', 'moderator')).toBe(true);
      });

      it('should allow moderator to approve from under_review', () => {
        expect(canTransition('under_review', 'approve', 'moderator')).toBe(true);
      });

      it('should allow moderator to reject from under_review', () => {
        expect(canTransition('under_review', 'reject', 'moderator')).toBe(true);
      });

      it('should allow moderator to request_changes from under_review', () => {
        expect(canTransition('under_review', 'request_changes', 'moderator')).toBe(true);
      });

      it('should allow moderator to publish from approved', () => {
        expect(canTransition('approved', 'publish', 'moderator')).toBe(true);
      });

      it('should allow moderator to unpublish from published', () => {
        expect(canTransition('published', 'unpublish', 'moderator')).toBe(true);
      });

      it('should not allow moderator to submit_internal', () => {
        expect(canTransition('draft', 'submit_internal', 'moderator')).toBe(false);
      });
    });

    describe('admin actions', () => {
      it('should allow admin all moderator actions', () => {
        expect(canTransition('submitted', 'start_review', 'admin')).toBe(true);
        expect(canTransition('under_review', 'approve', 'admin')).toBe(true);
        expect(canTransition('under_review', 'reject', 'admin')).toBe(true);
        expect(canTransition('approved', 'publish', 'admin')).toBe(true);
      });
    });

    describe('contributor actions', () => {
      it('should not allow contributor any workflow actions', () => {
        expect(canTransition('draft', 'submit_internal', 'contributor')).toBe(false);
        expect(canTransition('draft', 'submit_direct', 'contributor')).toBe(false);
        expect(canTransition('under_review', 'approve', 'contributor')).toBe(false);
      });
    });

    describe('invalid transitions', () => {
      it('should not allow approve from draft', () => {
        expect(canTransition('draft', 'approve', 'admin')).toBe(false);
      });

      it('should not allow submit_internal from published', () => {
        expect(canTransition('published', 'submit_internal', 'sponsor_user')).toBe(false);
      });

      it('should not allow publish from draft', () => {
        expect(canTransition('draft', 'publish', 'admin')).toBe(false);
      });
    });
  });

  describe('getNextStatus', () => {
    it('should return correct next status for valid transitions', () => {
      expect(getNextStatus('draft', 'submit_internal')).toBe('internal_review');
      expect(getNextStatus('draft', 'submit_direct')).toBe('submitted');
      expect(getNextStatus('internal_review', 'approve_internal')).toBe('submitted');
      expect(getNextStatus('submitted', 'start_review')).toBe('under_review');
      expect(getNextStatus('under_review', 'approve')).toBe('approved');
      expect(getNextStatus('under_review', 'reject')).toBe('rejected');
      expect(getNextStatus('approved', 'publish')).toBe('published');
    });

    it('should return null for invalid transitions', () => {
      expect(getNextStatus('draft', 'approve')).toBe(null);
      expect(getNextStatus('published', 'submit_internal')).toBe(null);
    });
  });

  describe('getAvailableActions', () => {
    it('should return correct actions for sponsor_user in draft', () => {
      const actions = getAvailableActions('draft', 'sponsor_user');
      expect(actions).toContain('submit_internal');
      expect(actions).not.toContain('submit_direct');
    });

    it('should return correct actions for sponsor_admin in draft', () => {
      const actions = getAvailableActions('draft', 'sponsor_admin');
      expect(actions).toContain('submit_direct');
      expect(actions).not.toContain('submit_internal');
    });

    it('should return correct actions for moderator in submitted', () => {
      const actions = getAvailableActions('submitted', 'moderator');
      expect(actions).toContain('start_review');
    });

    it('should return correct actions for moderator in under_review', () => {
      const actions = getAvailableActions('under_review', 'moderator');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
      expect(actions).toContain('request_changes');
    });

    it('should return empty array for contributor', () => {
      const actions = getAvailableActions('draft', 'contributor');
      expect(actions).toHaveLength(0);
    });

    it('should return resubmit for sponsor in changes_requested', () => {
      expect(getAvailableActions('changes_requested', 'sponsor_user')).toContain('resubmit');
      expect(getAvailableActions('changes_requested', 'sponsor_admin')).toContain('resubmit');
      expect(getAvailableActions('changes_requested', 'sponsor_admin')).toContain('withdraw');
    });
  });

  describe('getStatusLabel', () => {
    it('should return human-readable labels', () => {
      expect(getStatusLabel('draft')).toBe('Draft');
      expect(getStatusLabel('internal_review')).toBe('Internal Review');
      expect(getStatusLabel('submitted')).toBe('Submitted for Review');
      expect(getStatusLabel('under_review')).toBe('Under Review');
      expect(getStatusLabel('changes_requested')).toBe('Changes Requested');
      expect(getStatusLabel('approved')).toBe('Approved');
      expect(getStatusLabel('rejected')).toBe('Rejected');
      expect(getStatusLabel('published')).toBe('Published');
    });
  });

  describe('getActionLabel', () => {
    it('should return human-readable labels', () => {
      expect(getActionLabel('submit_internal')).toBe('Submit for Internal Review');
      expect(getActionLabel('approve')).toBe('Approve');
      expect(getActionLabel('publish')).toBe('Publish to Map');
    });
  });

  describe('isPubliclyVisible', () => {
    it('should return true only for published status', () => {
      expect(isPubliclyVisible('published')).toBe(true);
      expect(isPubliclyVisible('approved')).toBe(false);
      expect(isPubliclyVisible('draft')).toBe(false);
      expect(isPubliclyVisible('under_review')).toBe(false);
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for statuses', () => {
      expect(getStatusColor('draft')).toBe('gray');
      expect(getStatusColor('submitted')).toBe('yellow');
      expect(getStatusColor('approved')).toBe('green');
      expect(getStatusColor('rejected')).toBe('red');
      expect(getStatusColor('published')).toBe('emerald');
    });
  });

  describe('workflow flow scenarios', () => {
    it('should support standard approval flow: draft -> submitted -> under_review -> approved -> published', () => {
      let status: ApprovalStatus = 'draft';

      // Sponsor admin submits directly
      expect(canTransition(status, 'submit_direct', 'sponsor_admin')).toBe(true);
      status = getNextStatus(status, 'submit_direct')!;
      expect(status).toBe('submitted');

      // Moderator starts review
      expect(canTransition(status, 'start_review', 'moderator')).toBe(true);
      status = getNextStatus(status, 'start_review')!;
      expect(status).toBe('under_review');

      // Moderator approves
      expect(canTransition(status, 'approve', 'moderator')).toBe(true);
      status = getNextStatus(status, 'approve')!;
      expect(status).toBe('approved');

      // Moderator publishes
      expect(canTransition(status, 'publish', 'moderator')).toBe(true);
      status = getNextStatus(status, 'publish')!;
      expect(status).toBe('published');
    });

    it('should support internal review flow: draft -> internal_review -> submitted', () => {
      let status: ApprovalStatus = 'draft';

      // Sponsor user submits for internal review
      expect(canTransition(status, 'submit_internal', 'sponsor_user')).toBe(true);
      status = getNextStatus(status, 'submit_internal')!;
      expect(status).toBe('internal_review');

      // Sponsor admin approves internal
      expect(canTransition(status, 'approve_internal', 'sponsor_admin')).toBe(true);
      status = getNextStatus(status, 'approve_internal')!;
      expect(status).toBe('submitted');
    });

    it('should support changes requested flow: under_review -> changes_requested -> submitted', () => {
      let status: ApprovalStatus = 'under_review';

      // Moderator requests changes
      expect(canTransition(status, 'request_changes', 'moderator')).toBe(true);
      status = getNextStatus(status, 'request_changes')!;
      expect(status).toBe('changes_requested');

      // Sponsor resubmits
      expect(canTransition(status, 'resubmit', 'sponsor_admin')).toBe(true);
      status = getNextStatus(status, 'resubmit')!;
      expect(status).toBe('submitted');
    });

    it('should support rejection and resubmission flow', () => {
      let status: ApprovalStatus = 'under_review';

      // Moderator rejects
      expect(canTransition(status, 'reject', 'moderator')).toBe(true);
      status = getNextStatus(status, 'reject')!;
      expect(status).toBe('rejected');

      // Sponsor can resubmit from rejected
      expect(canTransition(status, 'resubmit', 'sponsor_user')).toBe(true);
      status = getNextStatus(status, 'resubmit')!;
      expect(status).toBe('submitted');
    });
  });
});
