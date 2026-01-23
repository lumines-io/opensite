'use client';

import { useRef, useState, useCallback } from 'react';
import { MapDrawer, MapDrawerRef } from '@/components/Map';

interface GeometryEditorProps {
  value?: GeoJSON.Geometry | null;
  onChange?: (geometry: GeoJSON.Geometry | null) => void;
  constructionType?: 'road' | 'highway' | 'metro' | 'bridge' | 'tunnel' | 'interchange' | 'station' | 'other';
  accessToken: string;
  height?: string;
}

export function GeometryEditor({
  value,
  onChange,
  constructionType = 'road',
  accessToken,
  height = '500px',
}: GeometryEditorProps) {
  const mapDrawerRef = useRef<MapDrawerRef>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'import' | 'preview'>('draw');

  // Determine if snap-to-road should be enabled based on construction type
  const enableSnapToRoad = ['road', 'highway', 'metro'].includes(constructionType);

  const handleGeometryChange = useCallback((geometry: GeoJSON.Geometry | null) => {
    onChange?.(geometry);
  }, [onChange]);

  const handleImport = useCallback(() => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);

      let geometry: GeoJSON.Geometry;

      // Handle different GeoJSON formats
      if (parsed.type === 'FeatureCollection') {
        if (parsed.features.length === 0) {
          throw new Error('FeatureCollection is empty');
        }
        geometry = parsed.features[0].geometry;
      } else if (parsed.type === 'Feature') {
        geometry = parsed.geometry;
      } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(parsed.type)) {
        geometry = parsed;
      } else {
        throw new Error('Invalid GeoJSON format');
      }

      // Set geometry in the map drawer
      mapDrawerRef.current?.setGeometry(geometry);
      onChange?.(geometry);
      setImportText('');
      setActiveTab('draw');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  }, [importText, onChange]);

  const handleExport = useCallback(() => {
    const geometry = mapDrawerRef.current?.getGeometry();
    if (geometry) {
      const geojson = JSON.stringify(geometry, null, 2);
      navigator.clipboard.writeText(geojson);
      alert('GeoJSON copied to clipboard!');
    }
  }, []);

  const handleSnapToRoad = useCallback(async () => {
    await mapDrawerRef.current?.snapToRoad();
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear the geometry?')) {
      mapDrawerRef.current?.clearAll();
      onChange?.(null);
    }
  }, [onChange]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('draw')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'draw'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Draw
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'import'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Import GeoJSON
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'preview'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Preview JSON
          </button>
        </div>
        <div className="flex gap-2">
          {enableSnapToRoad && (
            <button
              onClick={handleSnapToRoad}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Snap drawn line to nearest road"
            >
              Snap to Road
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            Copy GeoJSON
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ height }}>
        {activeTab === 'draw' && (
          <MapDrawer
            ref={mapDrawerRef}
            accessToken={accessToken}
            initialGeometry={value}
            onGeometryChange={handleGeometryChange}
            snapToRoad={enableSnapToRoad}
            showControls={false}
          />
        )}

        {activeTab === 'import' && (
          <div className="p-4 h-full flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">
              Paste GeoJSON (Feature, FeatureCollection, or Geometry)
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="flex-1 w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none"
              placeholder='{"type": "LineString", "coordinates": [[106.6297, 10.8231], [106.6397, 10.8331]]}'
            />
            {importError && (
              <p className="text-red-500 text-sm mt-2">{importError}</p>
            )}
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="mt-3 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
            >
              Import
            </button>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="p-4 h-full overflow-auto">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-auto h-full">
              {value ? JSON.stringify(value, null, 2) : '// No geometry defined'}
            </pre>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-gray-50 border-t border-gray-300 px-3 py-2 text-xs text-gray-500">
        {constructionType === 'metro' && (
          <span>Tip: Draw the metro line path, then add individual stations in the Metro Stations section below.</span>
        )}
        {['road', 'highway'].includes(constructionType) && (
          <span>Tip: Draw a rough path and click &quot;Snap to Road&quot; to align to actual roads.</span>
        )}
        {constructionType === 'station' && (
          <span>Tip: Place a point marker at the station location.</span>
        )}
        {!['metro', 'road', 'highway', 'station'].includes(constructionType) && (
          <span>Draw the construction area or line on the map.</span>
        )}
      </div>
    </div>
  );
}
