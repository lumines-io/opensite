import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock payload
const mockPayload = {
  auth: vi.fn(),
  find: vi.fn(),
};

vi.mock('payload', () => ({
  getPayload: vi.fn(() => Promise.resolve(mockPayload)),
}));

vi.mock('@payload-config', () => ({
  default: {},
}));

vi.mock('@/lib/api-utils', () => ({
  withApiHandler: (handler: Function) => handler,
}));

// Import after mocks
import { GET } from '../route';

// Helper to create mock NextRequest
function createMockRequest(): NextRequest {
  return {
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('GET /api/map/saved-places', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty feature collection for unauthenticated users', async () => {
    mockPayload.auth.mockResolvedValue({ user: null });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toEqual([]);
  });

  it('should return features for authenticated user', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'Home',
        addressText: '123 Main St',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        note: 'My home',
        addressList: { id: '1', name: 'Saved Places' },
        construction: null,
        tags: [{ tag: 'home' }],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        label: 'Office',
        location: { type: 'Point', coordinates: [106.8, 10.9] },
        addressList: '2',
        tags: [],
        createdAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toHaveLength(2);

    // Check first feature
    expect(data.features[0].id).toBe('1');
    expect(data.features[0].geometry.type).toBe('Point');
    expect(data.features[0].geometry.coordinates).toEqual([106.7, 10.8]);
    expect(data.features[0].properties.label).toBe('Home');
    expect(data.features[0].properties.addressText).toBe('123 Main St');
    expect(data.features[0].properties.listName).toBe('Saved Places');
    expect(data.features[0].properties.tags).toEqual(['home']);
  });

  it('should skip addresses with invalid location', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'Valid',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        label: 'Invalid - wrong type',
        location: { type: 'LineString', coordinates: [[106.7, 10.8], [106.8, 10.9]] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '3',
        label: 'Invalid - missing coordinates',
        location: { type: 'Point' },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '4',
        label: 'Invalid - wrong coordinate count',
        location: { type: 'Point', coordinates: [106.7] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '5',
        label: 'Invalid - null location',
        location: null,
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties.label).toBe('Valid');
  });

  it('should handle coordinates out of bounds', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'Valid coordinates',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        label: 'Invalid longitude',
        location: { type: 'Point', coordinates: [200, 10.8] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '3',
        label: 'Invalid latitude',
        location: { type: 'Point', coordinates: [106.7, 100] },
        addressList: '1',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties.label).toBe('Valid coordinates');
  });

  it('should include construction info when linked', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'Near Metro',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        construction: {
          id: '100',
          title: 'Metro Line 1',
          slug: 'metro-line-1',
        },
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features[0].properties.construction).toEqual({
      id: '100',
      title: 'Metro Line 1',
      slug: 'metro-line-1',
    });
  });

  it('should handle construction as string ID', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'With string construction',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        construction: '100', // String ID instead of object
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features[0].properties.construction).toBeUndefined();
  });

  it('should extract list name from expanded addressList', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'With expanded list',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: { id: '1', name: 'Favorites' },
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features[0].properties.listName).toBe('Favorites');
    expect(data.features[0].properties.listId).toBe('1');
  });

  it('should filter empty tags', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'With mixed tags',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        tags: [{ tag: 'valid' }, { tag: '' }, { tag: 'another' }, {}],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features[0].properties.tags).toEqual(['valid', 'another']);
  });

  it('should handle null tags array', async () => {
    const mockAddresses = [
      {
        id: '1',
        label: 'No tags',
        location: { type: 'Point', coordinates: [106.7, 10.8] },
        addressList: '1',
        tags: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockPayload.auth.mockResolvedValue({ user: { id: '1' } });
    mockPayload.find.mockResolvedValue({ docs: mockAddresses });

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.features[0].properties.tags).toEqual([]);
  });

  it('should call payload.find with correct parameters', async () => {
    mockPayload.auth.mockResolvedValue({ user: { id: 'user123' } });
    mockPayload.find.mockResolvedValue({ docs: [] });

    const request = createMockRequest();
    await GET(request);

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'addresses',
      where: {
        user: { equals: 'user123' },
      },
      limit: 500,
      depth: 1,
    });
  });
});
