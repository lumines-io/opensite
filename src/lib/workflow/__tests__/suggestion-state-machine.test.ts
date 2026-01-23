import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getTargetStatus,
  transition,
  getAvailableActions,
  isTerminalState,
  canPerformAction,
  ACTION_LABELS,
  STATUS_LABELS,
  ACTION_PERMISSIONS,
  type SuggestionStatus,
  type WorkflowAction,
} from '../suggestion-state-machine';

describe('Suggestion State Machine', () => {
  describe('ACTION_LABELS', () => {
    it('should have labels for all actions', () => {
      expect(ACTION_LABELS.start_review).toBe('Start Review');
      expect(ACTION_LABELS.approve).toBe('Approve');
      expect(ACTION_LABELS.reject).toBe('Reject');
      expect(ACTION_LABELS.request_changes).toBe('Request Changes');
      expect(ACTION_LABELS.resubmit).toBe('Resubmit');
      expect(ACTION_LABELS.merge).toBe('Merge');
      expect(ACTION_LABELS.supersede).toBe('Supersede');
    });
  });

  describe('STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(STATUS_LABELS.pending).toBe('Pending');
      expect(STATUS_LABELS.under_review).toBe('Under Review');
      expect(STATUS_LABELS.changes_requested).toBe('Changes Requested');
      expect(STATUS_LABELS.approved).toBe('Approved');
      expect(STATUS_LABELS.rejected).toBe('Rejected');
      expect(STATUS_LABELS.merged).toBe('Merged');
      expect(STATUS_LABELS.superseded).toBe('Superseded');
    });
  });

  describe('canTransition', () => {
    describe('from pending status', () => {
      it('should allow start_review', () => {
        expect(canTransition('pending', 'start_review')).toBe(true);
      });

      it('should not allow other actions', () => {
        expect(canTransition('pending', 'approve')).toBe(false);
        expect(canTransition('pending', 'reject')).toBe(false);
        expect(canTransition('pending', 'request_changes')).toBe(false);
        expect(canTransition('pending', 'resubmit')).toBe(false);
        expect(canTransition('pending', 'merge')).toBe(false);
        expect(canTransition('pending', 'supersede')).toBe(false);
      });
    });

    describe('from under_review status', () => {
      it('should allow approve', () => {
        expect(canTransition('under_review', 'approve')).toBe(true);
      });

      it('should allow reject', () => {
        expect(canTransition('under_review', 'reject')).toBe(true);
      });

      it('should allow request_changes', () => {
        expect(canTransition('under_review', 'request_changes')).toBe(true);
      });

      it('should not allow other actions', () => {
        expect(canTransition('under_review', 'start_review')).toBe(false);
        expect(canTransition('under_review', 'resubmit')).toBe(false);
        expect(canTransition('under_review', 'merge')).toBe(false);
        expect(canTransition('under_review', 'supersede')).toBe(false);
      });
    });

    describe('from changes_requested status', () => {
      it('should allow resubmit', () => {
        expect(canTransition('changes_requested', 'resubmit')).toBe(true);
      });

      it('should allow reject', () => {
        expect(canTransition('changes_requested', 'reject')).toBe(true);
      });

      it('should allow supersede', () => {
        expect(canTransition('changes_requested', 'supersede')).toBe(true);
      });

      it('should not allow other actions', () => {
        expect(canTransition('changes_requested', 'start_review')).toBe(false);
        expect(canTransition('changes_requested', 'approve')).toBe(false);
        expect(canTransition('changes_requested', 'request_changes')).toBe(false);
        expect(canTransition('changes_requested', 'merge')).toBe(false);
      });
    });

    describe('from approved status', () => {
      it('should allow merge', () => {
        expect(canTransition('approved', 'merge')).toBe(true);
      });

      it('should allow reject', () => {
        expect(canTransition('approved', 'reject')).toBe(true);
      });

      it('should not allow other actions', () => {
        expect(canTransition('approved', 'start_review')).toBe(false);
        expect(canTransition('approved', 'approve')).toBe(false);
        expect(canTransition('approved', 'request_changes')).toBe(false);
        expect(canTransition('approved', 'resubmit')).toBe(false);
        expect(canTransition('approved', 'supersede')).toBe(false);
      });
    });

    describe('from terminal states', () => {
      it('should not allow any transitions from rejected', () => {
        const actions: WorkflowAction[] = ['start_review', 'approve', 'reject', 'request_changes', 'resubmit', 'merge', 'supersede'];
        actions.forEach(action => {
          expect(canTransition('rejected', action)).toBe(false);
        });
      });

      it('should not allow any transitions from merged', () => {
        const actions: WorkflowAction[] = ['start_review', 'approve', 'reject', 'request_changes', 'resubmit', 'merge', 'supersede'];
        actions.forEach(action => {
          expect(canTransition('merged', action)).toBe(false);
        });
      });

      it('should not allow any transitions from superseded', () => {
        const actions: WorkflowAction[] = ['start_review', 'approve', 'reject', 'request_changes', 'resubmit', 'merge', 'supersede'];
        actions.forEach(action => {
          expect(canTransition('superseded', action)).toBe(false);
        });
      });
    });
  });

  describe('getTargetStatus', () => {
    it('should return correct target status for valid transitions', () => {
      expect(getTargetStatus('pending', 'start_review')).toBe('under_review');
      expect(getTargetStatus('under_review', 'approve')).toBe('approved');
      expect(getTargetStatus('under_review', 'reject')).toBe('rejected');
      expect(getTargetStatus('under_review', 'request_changes')).toBe('changes_requested');
      expect(getTargetStatus('changes_requested', 'resubmit')).toBe('under_review');
      expect(getTargetStatus('changes_requested', 'reject')).toBe('rejected');
      expect(getTargetStatus('changes_requested', 'supersede')).toBe('superseded');
      expect(getTargetStatus('approved', 'merge')).toBe('merged');
      expect(getTargetStatus('approved', 'reject')).toBe('rejected');
    });

    it('should return null for invalid transitions', () => {
      expect(getTargetStatus('pending', 'approve')).toBe(null);
      expect(getTargetStatus('rejected', 'approve')).toBe(null);
      expect(getTargetStatus('merged', 'reject')).toBe(null);
    });
  });

  describe('transition', () => {
    it('should return success for valid transitions', () => {
      const result = transition('pending', 'start_review');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('under_review');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid transitions', () => {
      const result = transition('pending', 'approve');
      expect(result.success).toBe(false);
      expect(result.newStatus).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('approve');
      expect(result.error).toContain('Pending');
    });

    it('should return meaningful error messages', () => {
      const result = transition('rejected', 'merge');
      expect(result.error).toContain("cannot merge a suggestion in 'Rejected' status");
    });
  });

  describe('getAvailableActions', () => {
    it('should return empty array for invalid/unknown status', () => {
      // Test with an invalid status that doesn't exist in STATE_TRANSITIONS
      // This tests line 154 where transitions might be falsy
      const actions = getAvailableActions('invalid_status' as SuggestionStatus);
      expect(actions).toHaveLength(0);
    });

    it('should return available actions for pending', () => {
      const actions = getAvailableActions('pending');
      expect(actions).toContain('start_review');
      expect(actions).toHaveLength(1);
    });

    it('should return available actions for under_review', () => {
      const actions = getAvailableActions('under_review');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
      expect(actions).toContain('request_changes');
      expect(actions).toHaveLength(3);
    });

    it('should return available actions for changes_requested', () => {
      const actions = getAvailableActions('changes_requested');
      expect(actions).toContain('resubmit');
      expect(actions).toContain('reject');
      expect(actions).toContain('supersede');
      expect(actions).toHaveLength(3);
    });

    it('should return available actions for approved', () => {
      const actions = getAvailableActions('approved');
      expect(actions).toContain('merge');
      expect(actions).toContain('reject');
      expect(actions).toHaveLength(2);
    });

    it('should return empty array for terminal states', () => {
      expect(getAvailableActions('rejected')).toHaveLength(0);
      expect(getAvailableActions('merged')).toHaveLength(0);
      expect(getAvailableActions('superseded')).toHaveLength(0);
    });
  });

  describe('isTerminalState', () => {
    it('should return false for non-terminal states', () => {
      expect(isTerminalState('pending')).toBe(false);
      expect(isTerminalState('under_review')).toBe(false);
      expect(isTerminalState('changes_requested')).toBe(false);
      expect(isTerminalState('approved')).toBe(false);
    });

    it('should return true for terminal states', () => {
      expect(isTerminalState('rejected')).toBe(true);
      expect(isTerminalState('merged')).toBe(true);
      expect(isTerminalState('superseded')).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    describe('start_review action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'start_review')).toBe(true);
        expect(canPerformAction('admin', 'start_review')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'start_review')).toBe(false);
      });
    });

    describe('approve action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'approve')).toBe(true);
        expect(canPerformAction('admin', 'approve')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'approve')).toBe(false);
      });
    });

    describe('reject action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'reject')).toBe(true);
        expect(canPerformAction('admin', 'reject')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'reject')).toBe(false);
      });
    });

    describe('request_changes action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'request_changes')).toBe(true);
        expect(canPerformAction('admin', 'request_changes')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'request_changes')).toBe(false);
      });
    });

    describe('resubmit action', () => {
      it('should allow all roles', () => {
        expect(canPerformAction('contributor', 'resubmit')).toBe(true);
        expect(canPerformAction('moderator', 'resubmit')).toBe(true);
        expect(canPerformAction('admin', 'resubmit')).toBe(true);
      });
    });

    describe('merge action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'merge')).toBe(true);
        expect(canPerformAction('admin', 'merge')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'merge')).toBe(false);
      });
    });

    describe('supersede action', () => {
      it('should allow moderator and admin', () => {
        expect(canPerformAction('moderator', 'supersede')).toBe(true);
        expect(canPerformAction('admin', 'supersede')).toBe(true);
      });

      it('should not allow contributor', () => {
        expect(canPerformAction('contributor', 'supersede')).toBe(false);
      });
    });

    describe('undefined role', () => {
      it('should not allow any action', () => {
        expect(canPerformAction(undefined, 'start_review')).toBe(false);
        expect(canPerformAction(undefined, 'approve')).toBe(false);
        expect(canPerformAction(undefined, 'reject')).toBe(false);
        expect(canPerformAction(undefined, 'resubmit')).toBe(false);
      });
    });
  });

  describe('ACTION_PERMISSIONS', () => {
    it('should have correct permissions for each action', () => {
      expect(ACTION_PERMISSIONS.start_review).toEqual(['moderator', 'admin']);
      expect(ACTION_PERMISSIONS.approve).toEqual(['moderator', 'admin']);
      expect(ACTION_PERMISSIONS.reject).toEqual(['moderator', 'admin']);
      expect(ACTION_PERMISSIONS.request_changes).toEqual(['moderator', 'admin']);
      expect(ACTION_PERMISSIONS.resubmit).toEqual(['contributor', 'moderator', 'admin']);
      expect(ACTION_PERMISSIONS.merge).toEqual(['moderator', 'admin']);
      expect(ACTION_PERMISSIONS.supersede).toEqual(['moderator', 'admin']);
    });
  });

  describe('complete workflow scenarios', () => {
    it('should complete happy path: pending -> under_review -> approved -> merged', () => {
      let status: SuggestionStatus = 'pending';

      // Start review
      let result = transition(status, 'start_review');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('under_review');

      // Approve
      result = transition(status, 'approve');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('approved');

      // Merge
      result = transition(status, 'merge');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('merged');

      // Should be terminal
      expect(isTerminalState(status)).toBe(true);
    });

    it('should complete rejection path: pending -> under_review -> rejected', () => {
      let status: SuggestionStatus = 'pending';

      // Start review
      let result = transition(status, 'start_review');
      expect(result.success).toBe(true);
      status = result.newStatus!;

      // Reject
      result = transition(status, 'reject');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('rejected');

      // Should be terminal
      expect(isTerminalState(status)).toBe(true);
    });

    it('should complete changes requested path: pending -> under_review -> changes_requested -> under_review -> approved -> merged', () => {
      let status: SuggestionStatus = 'pending';

      // Start review
      let result = transition(status, 'start_review');
      expect(result.success).toBe(true);
      status = result.newStatus!;

      // Request changes
      result = transition(status, 'request_changes');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('changes_requested');

      // Resubmit
      result = transition(status, 'resubmit');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('under_review');

      // Approve
      result = transition(status, 'approve');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('approved');

      // Merge
      result = transition(status, 'merge');
      expect(result.success).toBe(true);
      status = result.newStatus!;
      expect(status).toBe('merged');
    });

    it('should allow late rejection from approved state', () => {
      const status: SuggestionStatus = 'approved';

      const result = transition(status, 'reject');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('rejected');
    });
  });
});
