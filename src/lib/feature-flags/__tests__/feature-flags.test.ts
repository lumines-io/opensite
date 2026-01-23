import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isFeatureEnabled,
  getFeatureFlags,
  getClientFeatureFlags,
  getFeatureFlagMetadata,
  getFeatureFlagsByCategory,
  featureFlagGuard,
  withFeatureFlag,
  FEATURE_FLAGS,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_METADATA,
} from '../index';

describe('Feature Flags', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all FEATURE_ env vars before each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('FEATURE_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original env after each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('FEATURE_')) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('FEATURE_FLAGS', () => {
    it('should contain all expected feature flags', () => {
      expect(FEATURE_FLAGS.FEATURE_USER_REGISTRATION).toBe('FEATURE_USER_REGISTRATION');
      expect(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS).toBe('FEATURE_COMMUNITY_SUGGESTIONS');
      expect(FEATURE_FLAGS.FEATURE_ROUTING).toBe('FEATURE_ROUTING');
      expect(FEATURE_FLAGS.FEATURE_SCRAPER).toBe('FEATURE_SCRAPER');
      expect(FEATURE_FLAGS.FEATURE_ADVANCED_SEARCH).toBe('FEATURE_ADVANCED_SEARCH');
      expect(FEATURE_FLAGS.FEATURE_RATE_LIMITING).toBe('FEATURE_RATE_LIMITING');
      expect(FEATURE_FLAGS.FEATURE_CACHING).toBe('FEATURE_CACHING');
      expect(FEATURE_FLAGS.FEATURE_EMAIL_NOTIFICATIONS).toBe('FEATURE_EMAIL_NOTIFICATIONS');
      expect(FEATURE_FLAGS.FEATURE_I18N).toBe('FEATURE_I18N');
      expect(FEATURE_FLAGS.FEATURE_THEME_TOGGLE).toBe('FEATURE_THEME_TOGGLE');
      expect(FEATURE_FLAGS.FEATURE_MODERATOR_DASHBOARD).toBe('FEATURE_MODERATOR_DASHBOARD');
      expect(FEATURE_FLAGS.FEATURE_MAP_ANIMATIONS).toBe('FEATURE_MAP_ANIMATIONS');
    });
  });

  describe('FEATURE_FLAG_DEFAULTS', () => {
    it('should have defaults for all flags', () => {
      Object.values(FEATURE_FLAGS).forEach(flag => {
        expect(typeof FEATURE_FLAG_DEFAULTS[flag]).toBe('boolean');
      });
    });

    it('should default most features to true', () => {
      expect(FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.FEATURE_USER_REGISTRATION]).toBe(true);
      expect(FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS]).toBe(true);
      expect(FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.FEATURE_ROUTING]).toBe(true);
    });
  });

  describe('FEATURE_FLAG_METADATA', () => {
    it('should have metadata for all flags', () => {
      Object.values(FEATURE_FLAGS).forEach(flag => {
        expect(FEATURE_FLAG_METADATA[flag]).toBeDefined();
        expect(FEATURE_FLAG_METADATA[flag].key).toBe(flag);
        expect(FEATURE_FLAG_METADATA[flag].name).toBeDefined();
        expect(FEATURE_FLAG_METADATA[flag].description).toBeDefined();
        expect(['core', 'ui', 'ops', 'external']).toContain(FEATURE_FLAG_METADATA[flag].category);
        expect(['high', 'medium', 'low']).toContain(FEATURE_FLAG_METADATA[flag].impact);
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return default value when env var not set', () => {
      const result = isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(result).toBe(FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.FEATURE_USER_REGISTRATION]);
    });

    it('should return true for "true" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'true';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return true for "1" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = '1';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return true for "yes" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'yes';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return true for "on" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'on';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return false for "false" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(false);
    });

    it('should return false for "0" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = '0';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(false);
    });

    it('should return false for "no" env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'no';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(false);
    });

    it('should be case-insensitive for env values', () => {
      process.env.FEATURE_USER_REGISTRATION = 'TRUE';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);

      process.env.FEATURE_USER_REGISTRATION = 'Yes';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);

      process.env.FEATURE_USER_REGISTRATION = 'ON';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return default for empty string env value', () => {
      process.env.FEATURE_USER_REGISTRATION = '';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(true);
    });

    it('should return false for invalid env value', () => {
      process.env.FEATURE_USER_REGISTRATION = 'invalid';
      expect(isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)).toBe(false);
    });
  });

  describe('getFeatureFlags', () => {
    it('should return all feature flags with their values', () => {
      const flags = getFeatureFlags();

      expect(flags).toHaveProperty(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(flags).toHaveProperty(FEATURE_FLAGS.FEATURE_COMMUNITY_SUGGESTIONS);
      expect(flags).toHaveProperty(FEATURE_FLAGS.FEATURE_ROUTING);
    });

    it('should return current values based on environment', () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';
      process.env.FEATURE_ROUTING = 'true';

      const flags = getFeatureFlags();

      expect(flags[FEATURE_FLAGS.FEATURE_USER_REGISTRATION]).toBe(false);
      expect(flags[FEATURE_FLAGS.FEATURE_ROUTING]).toBe(true);
    });

    it('should include all defined flags', () => {
      const flags = getFeatureFlags();
      const flagCount = Object.keys(FEATURE_FLAGS).length;

      expect(Object.keys(flags).length).toBe(flagCount);
    });
  });

  describe('getClientFeatureFlags', () => {
    it('should return same flags as getFeatureFlags', () => {
      const serverFlags = getFeatureFlags();
      const clientFlags = getClientFeatureFlags();

      expect(clientFlags).toEqual(serverFlags);
    });
  });

  describe('getFeatureFlagMetadata', () => {
    it('should return metadata for specific flag when provided', () => {
      const metadata = getFeatureFlagMetadata(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);

      expect(metadata).toEqual(FEATURE_FLAG_METADATA[FEATURE_FLAGS.FEATURE_USER_REGISTRATION]);
    });

    it('should return all metadata when no flag provided', () => {
      const allMetadata = getFeatureFlagMetadata();

      expect(allMetadata).toEqual(FEATURE_FLAG_METADATA);
    });
  });

  describe('getFeatureFlagsByCategory', () => {
    it('should group flags by category', () => {
      const categories = getFeatureFlagsByCategory();

      expect(categories).toHaveProperty('core');
      expect(categories).toHaveProperty('ui');
      expect(categories).toHaveProperty('ops');
      expect(categories).toHaveProperty('external');
    });

    it('should contain arrays of metadata', () => {
      const categories = getFeatureFlagsByCategory();

      Object.values(categories).forEach(flags => {
        expect(Array.isArray(flags)).toBe(true);
        flags.forEach(flag => {
          expect(flag).toHaveProperty('key');
          expect(flag).toHaveProperty('name');
          expect(flag).toHaveProperty('category');
        });
      });
    });

    it('should have user registration in core category', () => {
      const categories = getFeatureFlagsByCategory();

      const coreFlags = categories.core.map(f => f.key);
      expect(coreFlags).toContain(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
    });

    it('should have theme toggle in ui category', () => {
      const categories = getFeatureFlagsByCategory();

      const uiFlags = categories.ui.map(f => f.key);
      expect(uiFlags).toContain(FEATURE_FLAGS.FEATURE_THEME_TOGGLE);
    });

    it('should have rate limiting in ops category', () => {
      const categories = getFeatureFlagsByCategory();

      const opsFlags = categories.ops.map(f => f.key);
      expect(opsFlags).toContain(FEATURE_FLAGS.FEATURE_RATE_LIMITING);
    });

    it('should have routing in external category', () => {
      const categories = getFeatureFlagsByCategory();

      const externalFlags = categories.external.map(f => f.key);
      expect(externalFlags).toContain(FEATURE_FLAGS.FEATURE_ROUTING);
    });
  });

  describe('featureFlagGuard', () => {
    it('should return null when feature is enabled', () => {
      // Feature is enabled by default
      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(result).toBeNull();
    });

    it('should return Response when feature is disabled', () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it('should include feature flag info in response headers', async () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(result?.headers.get('X-Feature-Flag')).toBe(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      expect(result?.headers.get('X-Feature-Enabled')).toBe('false');
    });

    it('should include error details in response body', async () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      const body = await result?.json();

      expect(body.error).toBe('Feature Disabled');
      expect(body.feature).toBe(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
    });

    it('should use custom message when provided', async () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION, 'Custom error message');
      const body = await result?.json();

      expect(body.message).toBe('Custom error message');
    });

    it('should use default message from metadata when no custom message', async () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const result = featureFlagGuard(FEATURE_FLAGS.FEATURE_USER_REGISTRATION);
      const body = await result?.json();

      expect(body.message).toContain('User Registration');
      expect(body.message).toContain('disabled');
    });
  });

  describe('withFeatureFlag', () => {
    it('should call handler when feature is enabled', async () => {
      const mockHandler = vi.fn().mockResolvedValue(Response.json({ data: 'test' }));
      const wrappedHandler = withFeatureFlag(FEATURE_FLAGS.FEATURE_USER_REGISTRATION, mockHandler);

      await wrappedHandler();

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should return guard response when feature is disabled', async () => {
      process.env.FEATURE_USER_REGISTRATION = 'false';

      const mockHandler = vi.fn().mockResolvedValue(Response.json({ data: 'test' }));
      const wrappedHandler = withFeatureFlag(FEATURE_FLAGS.FEATURE_USER_REGISTRATION, mockHandler);

      const result = await wrappedHandler();

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });

    it('should pass through handler arguments', async () => {
      const mockHandler = vi.fn().mockResolvedValue(Response.json({ data: 'test' }));
      const wrappedHandler = withFeatureFlag(FEATURE_FLAGS.FEATURE_USER_REGISTRATION, mockHandler);

      const arg1 = { request: 'data' };
      const arg2 = { context: 'info' };

      await wrappedHandler(arg1, arg2);

      expect(mockHandler).toHaveBeenCalledWith(arg1, arg2);
    });

    it('should return handler response when enabled', async () => {
      const expectedResponse = Response.json({ success: true });
      const mockHandler = vi.fn().mockResolvedValue(expectedResponse);
      const wrappedHandler = withFeatureFlag(FEATURE_FLAGS.FEATURE_USER_REGISTRATION, mockHandler);

      const result = await wrappedHandler();

      expect(result).toBe(expectedResponse);
    });
  });
});
