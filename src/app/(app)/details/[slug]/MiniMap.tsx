'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';

interface MiniMapProps {
  centroid: [number, number]; // [lng, lat]
  slug: string;
  title: string;
}

export function MiniMap({ centroid, slug, title }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: centroid,
      zoom: 14,
      interactive: false, // Static map for preview
      attributionControl: false,
    });

    // Add marker
    const markerEl = document.createElement('div');
    markerEl.className = 'mini-map-marker';
    markerEl.innerHTML = `
      <div class="relative">
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
      </div>
    `;

    new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
      .setLngLat(centroid)
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [centroid]);

  return (
    <div className="relative">
      {/* Map container */}
      <div ref={mapContainer} className="h-48 w-full" />

      {/* Overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      {/* Action footer */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate max-w-[150px]">{title}</span>
        </div>

        <Link
          href={`/?construction=${slug}`}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Mở bản đồ
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      {/* Coordinates badge */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-slate-500 font-mono">
        {centroid[1].toFixed(4)}, {centroid[0].toFixed(4)}
      </div>
    </div>
  );
}
