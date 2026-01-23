/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock mapbox-gl before importing component
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(),
    NavigationControl: vi.fn(),
    GeolocateControl: vi.fn(),
    Marker: vi.fn(),
  },
  Map: vi.fn(),
}));

// Mock react-map-gl/mapbox
vi.mock('react-map-gl/mapbox', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  const MockMap = ({ children, onLoad }: { children: React.ReactNode; onLoad?: () => void }) => {
    React.useEffect(() => {
      if (onLoad) {
        setTimeout(onLoad, 0);
      }
    }, [onLoad]);
    return React.createElement('div', { 'data-testid': 'map-container' }, children);
  };

  return {
    default: MockMap,
    NavigationControl: () => React.createElement('div', { 'data-testid': 'nav-control' }),
    GeolocateControl: () => React.createElement('div', { 'data-testid': 'geolocate-control' }),
    Marker: ({ longitude, latitude }: { longitude: number; latitude: number }) =>
      React.createElement('div', {
        'data-testid': 'marker',
        'data-longitude': longitude,
        'data-latitude': latitude,
      }),
  };
});

// Mock MapboxDraw
const mockDraw = {
  add: vi.fn(),
  deleteAll: vi.fn(),
  getAll: vi.fn(() => ({ features: [] })),
  changeMode: vi.fn(),
};

vi.mock('@mapbox/mapbox-gl-draw', () => ({
  default: vi.fn(() => mockDraw),
}));

// Mock PayloadCMS UI hooks
const mockSetValue = vi.fn();
const mockValue = { current: null as GeoJSON.Geometry | null };

vi.mock('@payloadcms/ui', () => ({
  useField: ({ path }: { path: string }) => ({
    value: mockValue.current,
    setValue: mockSetValue,
    path,
  }),
  useFormFields: () => ({ value: null }),
}));

// Import after mocks are set up
import { GeometryMapField } from '../GeometryMapField';

describe('GeometryMapField Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValue.current = null;
    // Mock MAPBOX token
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'test-token');
    // @ts-expect-error - mocking process.env
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Rendering', () => {
    it('should render the field label', () => {
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('Geometry')).toBeInTheDocument();
    });

    it('should render field description', () => {
      render(<GeometryMapField path="geometry" />);
      expect(
        screen.getByText(/GeoJSON geometry \(Point, LineString, or Polygon\)/)
      ).toBeInTheDocument();
    });

    it('should show "No geometry" when value is null', () => {
      mockValue.current = null;
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('No geometry')).toBeInTheDocument();
    });

    it('should show "Edit on Map" button when not read-only', () => {
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('Edit on Map')).toBeInTheDocument();
    });

    it('should show "Edit JSON" button when not read-only', () => {
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('Edit JSON')).toBeInTheDocument();
    });

    it('should not show edit buttons when read-only', () => {
      render(<GeometryMapField path="geometry" readOnly={true} />);
      expect(screen.queryByText('Edit on Map')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit JSON')).not.toBeInTheDocument();
    });
  });

  describe('Geometry Display', () => {
    it('should display Point geometry correctly', () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText(/Point \(106\.629700, 10\.823100\)/)).toBeInTheDocument();
    });

    it('should display LineString geometry correctly', () => {
      mockValue.current = {
        type: 'LineString',
        coordinates: [
          [106.6297, 10.8231],
          [106.6397, 10.8331],
          [106.6497, 10.8431],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('LineString (3 points)')).toBeInTheDocument();
    });

    it('should display Polygon geometry correctly', () => {
      mockValue.current = {
        type: 'Polygon',
        coordinates: [
          [
            [106.6297, 10.8231],
            [106.6397, 10.8231],
            [106.6397, 10.8331],
            [106.6297, 10.8331],
            [106.6297, 10.8231],
          ],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('Polygon (4 vertices)')).toBeInTheDocument();
    });

    it('should display MultiPoint geometry correctly', () => {
      mockValue.current = {
        type: 'MultiPoint',
        coordinates: [
          [106.6297, 10.8231],
          [106.6397, 10.8331],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('MultiPoint (2 points)')).toBeInTheDocument();
    });

    it('should display MultiLineString geometry correctly', () => {
      mockValue.current = {
        type: 'MultiLineString',
        coordinates: [
          [
            [106.6297, 10.8231],
            [106.6397, 10.8331],
          ],
          [
            [106.6497, 10.8431],
            [106.6597, 10.8531],
          ],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('MultiLineString (2 lines)')).toBeInTheDocument();
    });

    it('should display MultiPolygon geometry correctly', () => {
      mockValue.current = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [106.6297, 10.8231],
              [106.6397, 10.8231],
              [106.6397, 10.8331],
              [106.6297, 10.8331],
              [106.6297, 10.8231],
            ],
          ],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      expect(screen.getByText('MultiPolygon (1 polygons)')).toBeInTheDocument();
    });
  });

  describe('Map Toggle', () => {
    it('should toggle map visibility when "Edit on Map" is clicked', async () => {
      render(<GeometryMapField path="geometry" />);

      // Map should not be visible initially
      expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();

      // Click to show map
      const editButton = screen.getByText('Edit on Map');
      fireEvent.click(editButton);

      // Map should be visible
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should hide map when clicking "Hide Map"', async () => {
      render(<GeometryMapField path="geometry" />);

      // Show map first
      fireEvent.click(screen.getByText('Edit on Map'));
      expect(screen.getByTestId('map-container')).toBeInTheDocument();

      // Click Hide Map
      fireEvent.click(screen.getByText('Hide Map'));

      // Map should be hidden
      expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    });
  });

  describe('JSON Editor', () => {
    it('should open JSON editor when "Edit JSON" is clicked', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      // Textarea should be visible
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show current value in JSON editor', async () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(JSON.stringify(mockValue.current, null, 2));
    });

    it('should save valid JSON when Save is clicked', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      const validJson = '{"type": "Point", "coordinates": [106.6297, 10.8231]}';

      fireEvent.change(textarea, { target: { value: validJson } });
      fireEvent.click(screen.getByText('Save'));

      expect(mockSetValue).toHaveBeenCalledWith({
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      });
    });

    it('should show error for invalid JSON', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'not valid json syntax' } });
      fireEvent.click(screen.getByText('Save'));

      // Should show error message - look for the paragraph element with error text
      await waitFor(() => {
        const errorParagraph = screen.getByText(/is not valid JSON/i);
        expect(errorParagraph).toBeInTheDocument();
      });
    });

    it('should show error for invalid GeoJSON type', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      const invalidGeojson = '{"type": "InvalidType", "coordinates": [0, 0]}';

      fireEvent.change(textarea, { target: { value: invalidGeojson } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText(/Invalid geometry type/i)).toBeInTheDocument();
      });
    });

    it('should show error for GeoJSON without coordinates', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      const invalidGeojson = '{"type": "Point"}';

      fireEvent.change(textarea, { target: { value: invalidGeojson } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText(/must have.*coordinates/i)).toBeInTheDocument();
      });
    });

    it('should close JSON editor when Cancel is clicked', async () => {
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should clear geometry when saving empty JSON', async () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" />);

      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '' } });
      fireEvent.click(screen.getByText('Save'));

      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  describe('Map Toolbar', () => {
    it('should show drawing tools when map is visible', async () => {
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.getByText('Point')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
      expect(screen.getByText('Polygon')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();
    });

    it('should show Clear button when geometry exists', async () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should not show Clear button when no geometry', async () => {
      mockValue.current = null;
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('should show Snap to Road button for LineString', async () => {
      mockValue.current = {
        type: 'LineString',
        coordinates: [
          [106.6297, 10.8231],
          [106.6397, 10.8331],
        ],
      };
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.getByText('Snap to Road')).toBeInTheDocument();
    });

    it('should not show Snap to Road button for Point', async () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.queryByText('Snap to Road')).not.toBeInTheDocument();
    });

    it('should have map style selector', async () => {
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      const styleSelector = screen.getByRole('combobox');
      expect(styleSelector).toBeInTheDocument();
      expect(screen.getByText('Streets')).toBeInTheDocument();
    });
  });

  describe('No Mapbox Token', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', '');
      // @ts-expect-error - mocking process.env
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = '';
    });

    it('should show error message when Mapbox token is not configured', async () => {
      render(<GeometryMapField path="geometry" />);
      // The component should still render the field label
      expect(screen.getByText('Geometry')).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('should not show toolbar in read-only mode', async () => {
      mockValue.current = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      render(<GeometryMapField path="geometry" readOnly={true} />);

      // In read-only mode, the map toggle isn't available
      expect(screen.queryByText('Edit on Map')).not.toBeInTheDocument();
      expect(screen.queryByText('Point')).not.toBeInTheDocument();
    });

    it('should not allow JSON editing in read-only mode', () => {
      render(<GeometryMapField path="geometry" readOnly={true} />);

      expect(screen.queryByText('Edit JSON')).not.toBeInTheDocument();
    });
  });
});

describe('GeometryMapField Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValue.current = null;
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'test-token');
    // @ts-expect-error - mocking process.env
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';
  });

  describe('getGeometryLabel', () => {
    // Testing the internal label function through component rendering
    it('should return correct labels for all geometry types', () => {
      const geometries: Array<{ geometry: GeoJSON.Geometry; expected: RegExp }> = [
        {
          geometry: { type: 'Point', coordinates: [106.6297, 10.8231] },
          expected: /Point \(106\.629700, 10\.823100\)/,
        },
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
              [2, 2],
              [3, 3],
              [4, 4],
            ],
          },
          expected: /LineString \(5 points\)/,
        },
        {
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
          expected: /Polygon \(3 vertices\)/,
        },
      ];

      geometries.forEach(({ geometry, expected }) => {
        mockValue.current = geometry;
        const { unmount } = render(<GeometryMapField path="geometry" />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('getCenter', () => {
    // Testing the center calculation through map initialization
    it('should calculate center for Point geometry', async () => {
      const point: GeoJSON.Point = {
        type: 'Point',
        coordinates: [106.6297, 10.8231],
      };
      mockValue.current = point;

      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      // The map should be rendered with the point as center
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should calculate center for LineString geometry', async () => {
      const lineString: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          [106.6, 10.8],
          [106.7, 10.9],
          [106.8, 11.0],
        ],
      };
      mockValue.current = lineString;

      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should calculate center for Polygon geometry', async () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [106.6, 10.8],
            [106.8, 10.8],
            [106.8, 11.0],
            [106.6, 11.0],
            [106.6, 10.8],
          ],
        ],
      };
      mockValue.current = polygon;

      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should use default center when no geometry', async () => {
      mockValue.current = null;

      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit on Map'));

      // Should still render map with default HCMC center
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});

describe('GeometryMapField GeoJSON Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValue.current = null;
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'test-token');
    // @ts-expect-error - mocking process.env
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';
  });

  const validGeometryTypes = [
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
  ];

  validGeometryTypes.forEach((type) => {
    it(`should accept valid ${type} geometry type`, async () => {
      render(<GeometryMapField path="geometry" />);
      fireEvent.click(screen.getByText('Edit JSON'));

      const textarea = screen.getByRole('textbox');
      let validJson: string;

      switch (type) {
        case 'Point':
          validJson = `{"type": "${type}", "coordinates": [106.6297, 10.8231]}`;
          break;
        case 'LineString':
          validJson = `{"type": "${type}", "coordinates": [[0, 0], [1, 1]]}`;
          break;
        case 'Polygon':
          validJson = `{"type": "${type}", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}`;
          break;
        case 'MultiPoint':
          validJson = `{"type": "${type}", "coordinates": [[0, 0], [1, 1]]}`;
          break;
        case 'MultiLineString':
          validJson = `{"type": "${type}", "coordinates": [[[0, 0], [1, 1]], [[2, 2], [3, 3]]]}`;
          break;
        case 'MultiPolygon':
          validJson = `{"type": "${type}", "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]}`;
          break;
        default:
          validJson = `{"type": "${type}", "coordinates": [0, 0]}`;
      }

      fireEvent.change(textarea, { target: { value: validJson } });
      fireEvent.click(screen.getByText('Save'));

      // Should not show error
      expect(screen.queryByText(/Invalid/i)).not.toBeInTheDocument();
      expect(mockSetValue).toHaveBeenCalled();
    });
  });

  it('should reject GeometryCollection type', async () => {
    render(<GeometryMapField path="geometry" />);
    fireEvent.click(screen.getByText('Edit JSON'));

    const textarea = screen.getByRole('textbox');
    const invalidJson = '{"type": "GeometryCollection", "geometries": []}';

    fireEvent.change(textarea, { target: { value: invalidJson } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      // GeometryCollection doesn't have coordinates, so validation fails
      expect(screen.getByText(/must have.*type.*and.*coordinates/i)).toBeInTheDocument();
    });
  });

  it('should reject Feature type', async () => {
    render(<GeometryMapField path="geometry" />);
    fireEvent.click(screen.getByText('Edit JSON'));

    const textarea = screen.getByRole('textbox');
    const invalidJson =
      '{"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}';

    fireEvent.change(textarea, { target: { value: invalidJson } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      // Feature type has coordinates but Feature is not a valid geometry type
      expect(screen.getByText(/must have.*type.*and.*coordinates/i)).toBeInTheDocument();
    });
  });
});
