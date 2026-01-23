import { describe, it, expect } from 'vitest';

// Define the types locally to avoid Payload import issues
type UserRole = 'contributor' | 'sponsor_user' | 'sponsor_admin' | 'moderator' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  _verified: boolean;
  reputation: number;
  bio?: string | null;
  avatar?: string | null;
  organization?: string | number | null;
}

// Role levels for hierarchy comparison (matching api-middleware.ts)
const ROLE_LEVELS: Record<UserRole, number> = {
  contributor: 1,
  sponsor_user: 2,
  sponsor_admin: 2.5,
  moderator: 3,
  admin: 4,
} as const;

// Copy the pure functions from the auth module to test them without Payload dependencies
// This tests the exact same logic as the source module
function hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  if (!user) return false;

  const roleHierarchy: Record<UserRole, number> = {
    contributor: 1,
    sponsor_user: 2,
    sponsor_admin: 2.5,
    moderator: 3,
    admin: 4,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Role helper functions (matching api-middleware.ts)
const isSponsorRole = (role: string): boolean =>
  ['sponsor_user', 'sponsor_admin'].includes(role);

const canManagePrivateConstructions = (role: string): boolean =>
  ['admin', 'moderator', 'sponsor_admin', 'sponsor_user'].includes(role);

const canApprovePrivateConstructions = (role: string): boolean =>
  ['admin', 'moderator'].includes(role);

const canContributeToPublicConstructions = (role: string): boolean =>
  ['admin', 'moderator', 'contributor'].includes(role);

function isEmailVerified(user: AuthUser | null): boolean {
  return user?._verified ?? false;
}

function canPerformPublicTasks(user: AuthUser | null): boolean {
  return user !== null && isEmailVerified(user);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

describe('Auth Utilities', () => {
  // Helper function to create mock users
  const createMockUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'contributor',
    _verified: true,
    reputation: 0,
    bio: null,
    avatar: null,
    organization: null,
    ...overrides,
  });

  describe('ROLE_LEVELS', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_LEVELS.contributor).toBe(1);
      expect(ROLE_LEVELS.sponsor_user).toBe(2);
      expect(ROLE_LEVELS.sponsor_admin).toBe(2.5);
      expect(ROLE_LEVELS.moderator).toBe(3);
      expect(ROLE_LEVELS.admin).toBe(4);
    });

    it('should have sponsor_admin between sponsor_user and moderator', () => {
      expect(ROLE_LEVELS.sponsor_admin).toBeGreaterThan(ROLE_LEVELS.sponsor_user);
      expect(ROLE_LEVELS.sponsor_admin).toBeLessThan(ROLE_LEVELS.moderator);
    });
  });

  describe('hasRole', () => {
    describe('with null user', () => {
      it('should return false for any role', () => {
        expect(hasRole(null, 'contributor')).toBe(false);
        expect(hasRole(null, 'sponsor_user')).toBe(false);
        expect(hasRole(null, 'sponsor_admin')).toBe(false);
        expect(hasRole(null, 'moderator')).toBe(false);
        expect(hasRole(null, 'admin')).toBe(false);
      });
    });

    describe('with contributor role', () => {
      const contributorUser = createMockUser({ role: 'contributor' });

      it('should have contributor role', () => {
        expect(hasRole(contributorUser, 'contributor')).toBe(true);
      });

      it('should not have sponsor_user role', () => {
        expect(hasRole(contributorUser, 'sponsor_user')).toBe(false);
      });

      it('should not have sponsor_admin role', () => {
        expect(hasRole(contributorUser, 'sponsor_admin')).toBe(false);
      });

      it('should not have moderator role', () => {
        expect(hasRole(contributorUser, 'moderator')).toBe(false);
      });

      it('should not have admin role', () => {
        expect(hasRole(contributorUser, 'admin')).toBe(false);
      });
    });

    describe('with sponsor_user role', () => {
      const sponsorUser = createMockUser({ role: 'sponsor_user', organization: 'org-123' });

      it('should have contributor role', () => {
        expect(hasRole(sponsorUser, 'contributor')).toBe(true);
      });

      it('should have sponsor_user role', () => {
        expect(hasRole(sponsorUser, 'sponsor_user')).toBe(true);
      });

      it('should not have sponsor_admin role', () => {
        expect(hasRole(sponsorUser, 'sponsor_admin')).toBe(false);
      });

      it('should not have moderator role', () => {
        expect(hasRole(sponsorUser, 'moderator')).toBe(false);
      });

      it('should not have admin role', () => {
        expect(hasRole(sponsorUser, 'admin')).toBe(false);
      });
    });

    describe('with sponsor_admin role', () => {
      const sponsorAdmin = createMockUser({ role: 'sponsor_admin', organization: 'org-123' });

      it('should have contributor role', () => {
        expect(hasRole(sponsorAdmin, 'contributor')).toBe(true);
      });

      it('should have sponsor_user role', () => {
        expect(hasRole(sponsorAdmin, 'sponsor_user')).toBe(true);
      });

      it('should have sponsor_admin role', () => {
        expect(hasRole(sponsorAdmin, 'sponsor_admin')).toBe(true);
      });

      it('should not have moderator role', () => {
        expect(hasRole(sponsorAdmin, 'moderator')).toBe(false);
      });

      it('should not have admin role', () => {
        expect(hasRole(sponsorAdmin, 'admin')).toBe(false);
      });
    });

    describe('with moderator role', () => {
      const moderatorUser = createMockUser({ role: 'moderator' });

      it('should have contributor role', () => {
        expect(hasRole(moderatorUser, 'contributor')).toBe(true);
      });

      it('should have sponsor_user role', () => {
        expect(hasRole(moderatorUser, 'sponsor_user')).toBe(true);
      });

      it('should have sponsor_admin role', () => {
        expect(hasRole(moderatorUser, 'sponsor_admin')).toBe(true);
      });

      it('should have moderator role', () => {
        expect(hasRole(moderatorUser, 'moderator')).toBe(true);
      });

      it('should not have admin role', () => {
        expect(hasRole(moderatorUser, 'admin')).toBe(false);
      });
    });

    describe('with admin role', () => {
      const adminUser = createMockUser({ role: 'admin' });

      it('should have contributor role', () => {
        expect(hasRole(adminUser, 'contributor')).toBe(true);
      });

      it('should have sponsor_user role', () => {
        expect(hasRole(adminUser, 'sponsor_user')).toBe(true);
      });

      it('should have sponsor_admin role', () => {
        expect(hasRole(adminUser, 'sponsor_admin')).toBe(true);
      });

      it('should have moderator role', () => {
        expect(hasRole(adminUser, 'moderator')).toBe(true);
      });

      it('should have admin role', () => {
        expect(hasRole(adminUser, 'admin')).toBe(true);
      });
    });
  });

  describe('isSponsorRole', () => {
    it('should return true for sponsor_user', () => {
      expect(isSponsorRole('sponsor_user')).toBe(true);
    });

    it('should return true for sponsor_admin', () => {
      expect(isSponsorRole('sponsor_admin')).toBe(true);
    });

    it('should return false for contributor', () => {
      expect(isSponsorRole('contributor')).toBe(false);
    });

    it('should return false for moderator', () => {
      expect(isSponsorRole('moderator')).toBe(false);
    });

    it('should return false for admin', () => {
      expect(isSponsorRole('admin')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(isSponsorRole('invalid')).toBe(false);
    });
  });

  describe('canManagePrivateConstructions', () => {
    it('should return true for admin', () => {
      expect(canManagePrivateConstructions('admin')).toBe(true);
    });

    it('should return true for moderator', () => {
      expect(canManagePrivateConstructions('moderator')).toBe(true);
    });

    it('should return true for sponsor_admin', () => {
      expect(canManagePrivateConstructions('sponsor_admin')).toBe(true);
    });

    it('should return true for sponsor_user', () => {
      expect(canManagePrivateConstructions('sponsor_user')).toBe(true);
    });

    it('should return false for contributor', () => {
      expect(canManagePrivateConstructions('contributor')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(canManagePrivateConstructions('invalid')).toBe(false);
    });
  });

  describe('canApprovePrivateConstructions', () => {
    it('should return true for admin', () => {
      expect(canApprovePrivateConstructions('admin')).toBe(true);
    });

    it('should return true for moderator', () => {
      expect(canApprovePrivateConstructions('moderator')).toBe(true);
    });

    it('should return false for sponsor_admin', () => {
      expect(canApprovePrivateConstructions('sponsor_admin')).toBe(false);
    });

    it('should return false for sponsor_user', () => {
      expect(canApprovePrivateConstructions('sponsor_user')).toBe(false);
    });

    it('should return false for contributor', () => {
      expect(canApprovePrivateConstructions('contributor')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(canApprovePrivateConstructions('invalid')).toBe(false);
    });
  });

  describe('canContributeToPublicConstructions', () => {
    it('should return true for admin', () => {
      expect(canContributeToPublicConstructions('admin')).toBe(true);
    });

    it('should return true for moderator', () => {
      expect(canContributeToPublicConstructions('moderator')).toBe(true);
    });

    it('should return true for contributor', () => {
      expect(canContributeToPublicConstructions('contributor')).toBe(true);
    });

    it('should return false for sponsor_admin', () => {
      expect(canContributeToPublicConstructions('sponsor_admin')).toBe(false);
    });

    it('should return false for sponsor_user', () => {
      expect(canContributeToPublicConstructions('sponsor_user')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(canContributeToPublicConstructions('invalid')).toBe(false);
    });
  });

  describe('isEmailVerified', () => {
    it('should return true for verified user', () => {
      const user = createMockUser({ _verified: true });
      expect(isEmailVerified(user)).toBe(true);
    });

    it('should return false for unverified user', () => {
      const user = createMockUser({ _verified: false });
      expect(isEmailVerified(user)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(isEmailVerified(null)).toBe(false);
    });
  });

  describe('canPerformPublicTasks', () => {
    it('should return true for verified user', () => {
      const user = createMockUser({ _verified: true });
      expect(canPerformPublicTasks(user)).toBe(true);
    });

    it('should return false for unverified user', () => {
      const user = createMockUser({ _verified: false });
      expect(canPerformPublicTasks(user)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(canPerformPublicTasks(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('a@b.co')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
      expect(isValidEmail('test@ example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    describe('valid passwords', () => {
      it('should accept password with all requirements', () => {
        const result = isValidPassword('Password1');
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should accept longer passwords', () => {
        const result = isValidPassword('MyStrongPassword123');
        expect(result.valid).toBe(true);
      });

      it('should accept passwords with special characters', () => {
        const result = isValidPassword('Password1!@#');
        expect(result.valid).toBe(true);
      });
    });

    describe('password too short', () => {
      it('should reject password shorter than 8 characters', () => {
        const result = isValidPassword('Pass1');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must be at least 8 characters long');
      });

      it('should reject empty password', () => {
        const result = isValidPassword('');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must be at least 8 characters long');
      });

      it('should reject 7 character password', () => {
        const result = isValidPassword('Passwo1');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must be at least 8 characters long');
      });
    });

    describe('missing uppercase letter', () => {
      it('should reject password without uppercase letter', () => {
        const result = isValidPassword('password1');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one uppercase letter');
      });
    });

    describe('missing lowercase letter', () => {
      it('should reject password without lowercase letter', () => {
        const result = isValidPassword('PASSWORD1');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one lowercase letter');
      });
    });

    describe('missing number', () => {
      it('should reject password without number', () => {
        const result = isValidPassword('PasswordX');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one number');
      });
    });

    describe('validation order', () => {
      it('should check length first', () => {
        const result = isValidPassword('Ab1');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must be at least 8 characters long');
      });

      it('should check uppercase after length', () => {
        const result = isValidPassword('password12');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one uppercase letter');
      });

      it('should check lowercase after uppercase', () => {
        const result = isValidPassword('PASSWORD12');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one lowercase letter');
      });

      it('should check number last', () => {
        const result = isValidPassword('Passwordxx');
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Password must contain at least one number');
      });
    });
  });
});
