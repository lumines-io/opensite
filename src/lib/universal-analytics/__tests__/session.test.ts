import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock storage
const mockSessionStorage: Record<string, string> = {};
const mockLocalStorage: Record<string, string> = {};

const createStorageMock = (storage: Record<string, string>) => ({
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
  length: 0,
  key: vi.fn(),
});

// Setup global mocks before importing
const sessionStorageMock = createStorageMock(mockSessionStorage);
const localStorageMock = createStorageMock(mockLocalStorage);

// Must stub window first so isBrowser() check passes
vi.stubGlobal('window', {});
vi.stubGlobal('sessionStorage', sessionStorageMock);
vi.stubGlobal('localStorage', localStorageMock);

import { SESSION_CONFIG } from '../constants';

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Clear mock storage
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    // Reset Date.now mock
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getSessionId', () => {
    it('should create a new session ID when none exists', async () => {
      const { getSessionId } = await import('../session');
      const sessionId = getSessionId();

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_CONFIG.SESSION_KEY,
        sessionId
      );
    });

    it('should return existing session ID when available', async () => {
      const existingId = 'existing-session-123';
      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = existingId;
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = Date.now().toString();

      const { getSessionId } = await import('../session');
      const sessionId = getSessionId();

      expect(sessionId).toBe(existingId);
    });

    it('should generate consistent session ID format (timestamp-random)', async () => {
      const { getSessionId } = await import('../session');
      const sessionId = getSessionId();

      // Should contain a hyphen separating timestamp and random parts
      expect(sessionId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should update last activity timestamp', async () => {
      const { getSessionId } = await import('../session');
      getSessionId();

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_CONFIG.LAST_ACTIVITY_KEY,
        expect.any(String)
      );
    });

    it('should create new session when expired (after 30 minutes)', async () => {
      const oldTime = Date.now() - (SESSION_CONFIG.TIMEOUT + 1000); // 30 minutes + 1 second ago
      const oldSessionId = 'old-session-id';

      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = oldSessionId;
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = oldTime.toString();

      const { getSessionId } = await import('../session');
      const newSessionId = getSessionId();

      expect(newSessionId).not.toBe(oldSessionId);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_CONFIG.SESSION_KEY,
        newSessionId
      );
    });

    it('should preserve session within 30 minute timeout', async () => {
      const recentTime = Date.now() - (SESSION_CONFIG.TIMEOUT - 60000); // 29 minutes ago
      const existingId = 'valid-session-id';

      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = existingId;
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = recentTime.toString();

      const { getSessionId } = await import('../session');
      const sessionId = getSessionId();

      expect(sessionId).toBe(existingId);
    });

    it('should generate unique session IDs', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        vi.resetModules();
        // Clear storage to force new ID generation
        delete mockSessionStorage[SESSION_CONFIG.SESSION_KEY];
        delete mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY];

        const { getSessionId } = await import('../session');
        const id = getSessionId();
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('getAnonymousId', () => {
    it('should create a new anonymous ID when none exists', async () => {
      const { getAnonymousId } = await import('../session');
      const anonId = getAnonymousId();

      expect(anonId).toBeTruthy();
      expect(typeof anonId).toBe('string');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_CONFIG.ANONYMOUS_KEY,
        anonId
      );
    });

    it('should return existing anonymous ID when available', async () => {
      const existingId = 'existing-anon-123';
      mockLocalStorage[SESSION_CONFIG.ANONYMOUS_KEY] = existingId;

      const { getAnonymousId } = await import('../session');
      const anonId = getAnonymousId();

      expect(anonId).toBe(existingId);
    });

    it('should persist across sessions (using localStorage)', async () => {
      const { getAnonymousId } = await import('../session');
      const anonId1 = getAnonymousId();

      // Clear session storage but keep localStorage
      Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);

      vi.resetModules();
      const { getAnonymousId: getAnonymousId2 } = await import('../session');
      const anonId2 = getAnonymousId2();

      expect(anonId1).toBe(anonId2);
    });

    it('should generate consistent ID format', async () => {
      const { getAnonymousId } = await import('../session');
      const anonId = getAnonymousId();

      expect(anonId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('clearSession', () => {
    it('should remove session ID from storage', async () => {
      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = 'session-to-clear';
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = Date.now().toString();

      const { clearSession } = await import('../session');
      clearSession();

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(SESSION_CONFIG.SESSION_KEY);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        SESSION_CONFIG.LAST_ACTIVITY_KEY
      );
    });

    it('should not throw when session does not exist', async () => {
      const { clearSession } = await import('../session');
      expect(() => clearSession()).not.toThrow();
    });
  });

  describe('clearAnonymousId', () => {
    it('should remove anonymous ID from localStorage', async () => {
      mockLocalStorage[SESSION_CONFIG.ANONYMOUS_KEY] = 'anon-to-clear';

      const { clearAnonymousId } = await import('../session');
      clearAnonymousId();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SESSION_CONFIG.ANONYMOUS_KEY);
    });

    it('should not throw when anonymous ID does not exist', async () => {
      const { clearAnonymousId } = await import('../session');
      expect(() => clearAnonymousId()).not.toThrow();
    });
  });

  describe('touchSession', () => {
    it('should update last activity timestamp', async () => {
      const beforeTouch = Date.now();

      const { touchSession } = await import('../session');
      touchSession();

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_CONFIG.LAST_ACTIVITY_KEY,
        expect.any(String)
      );

      // Verify timestamp is recent
      const storedTime = parseInt(
        mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] || '0',
        10
      );
      expect(storedTime).toBeGreaterThanOrEqual(beforeTouch);
    });
  });

  describe('isSessionActive', () => {
    it('should return true when session is within timeout', async () => {
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = Date.now().toString();

      const { isSessionActive } = await import('../session');
      expect(isSessionActive()).toBe(true);
    });

    it('should return false when session is expired', async () => {
      const expiredTime = Date.now() - (SESSION_CONFIG.TIMEOUT + 1000);
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = expiredTime.toString();

      const { isSessionActive } = await import('../session');
      expect(isSessionActive()).toBe(false);
    });

    it('should return false when no last activity recorded', async () => {
      const { isSessionActive } = await import('../session');
      expect(isSessionActive()).toBe(false);
    });

    it('should return true just before timeout', async () => {
      const almostExpired = Date.now() - (SESSION_CONFIG.TIMEOUT - 1000);
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = almostExpired.toString();

      const { isSessionActive } = await import('../session');
      expect(isSessionActive()).toBe(true);
    });

    it('should return false just after timeout', async () => {
      const justExpired = Date.now() - (SESSION_CONFIG.TIMEOUT + 1);
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = justExpired.toString();

      const { isSessionActive } = await import('../session');
      expect(isSessionActive()).toBe(false);
    });
  });

  describe('getSessionStartTime', () => {
    it('should return null when no session exists', async () => {
      const { getSessionStartTime } = await import('../session');
      expect(getSessionStartTime()).toBeNull();
    });

    it('should return timestamp from session ID', async () => {
      // Create a session first
      const { getSessionId, getSessionStartTime } = await import('../session');
      getSessionId();

      const startTime = getSessionStartTime();

      expect(startTime).not.toBeNull();
      expect(typeof startTime).toBe('number');
      // Start time should be close to now (within 1 second)
      expect(Math.abs(Date.now() - (startTime as number))).toBeLessThan(1000);
    });

    it('should parse timestamp correctly from session ID format', async () => {
      const now = Date.now();
      const timestampBase36 = now.toString(36);
      const mockId = `${timestampBase36}-randompart`;
      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = mockId;

      const { getSessionStartTime } = await import('../session');
      const startTime = getSessionStartTime();

      expect(startTime).toBe(now);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid timestamp in last activity', async () => {
      mockSessionStorage[SESSION_CONFIG.SESSION_KEY] = 'valid-session';
      mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY] = 'invalid-timestamp';

      const { getSessionId } = await import('../session');
      // Should create new session due to NaN comparison
      const sessionId = getSessionId();
      expect(sessionId).toBeTruthy();
    });

    it('should handle concurrent session ID generation', async () => {
      // Clear storage
      delete mockSessionStorage[SESSION_CONFIG.SESSION_KEY];
      delete mockSessionStorage[SESSION_CONFIG.LAST_ACTIVITY_KEY];

      const { getSessionId } = await import('../session');
      // Generate multiple IDs concurrently
      const promises = Array(10)
        .fill(null)
        .map(() => Promise.resolve(getSessionId()));

      const ids = await Promise.all(promises);

      // All should get the same ID since first one creates it
      // and subsequent calls should return the cached one
      expect(new Set(ids).size).toBe(1);
    });
  });
});

describe('Session Management - Server-side (no window)', () => {
  // Save original window
  const originalWindow = global.window;

  beforeEach(() => {
    vi.resetModules();
    // Remove window to simulate server environment
    // @ts-expect-error - intentionally removing window for test
    delete global.window;
  });

  afterEach(() => {
    // Restore window
    global.window = originalWindow;
  });

  it('getSessionId should return empty string on server', async () => {
    // Re-import to get fresh module state
    const { getSessionId: serverGetSessionId } = await import('../session');

    expect(serverGetSessionId()).toBe('');
  });

  it('getAnonymousId should return empty string on server', async () => {
    const { getAnonymousId: serverGetAnonymousId } = await import('../session');

    expect(serverGetAnonymousId()).toBe('');
  });

  it('isSessionActive should return false on server', async () => {
    const { isSessionActive: serverIsSessionActive } = await import('../session');

    expect(serverIsSessionActive()).toBe(false);
  });

  it('getSessionStartTime should return null on server', async () => {
    const { getSessionStartTime: serverGetSessionStartTime } = await import('../session');

    expect(serverGetSessionStartTime()).toBeNull();
  });

  it('clearSession should not throw on server', async () => {
    const { clearSession: serverClearSession } = await import('../session');

    expect(() => serverClearSession()).not.toThrow();
  });

  it('touchSession should not throw on server', async () => {
    const { touchSession: serverTouchSession } = await import('../session');

    expect(() => serverTouchSession()).not.toThrow();
  });
});
