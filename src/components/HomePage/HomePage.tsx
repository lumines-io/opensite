'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { MapSearchPanel, MapRoutingPanel } from '@/components/Map';
import { FilterSearchOverlay } from '@/components/FilterSearchOverlay';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/Auth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useFeatureFlag, FEATURE_FLAGS } from '@/lib/feature-flags/provider';
import type { Construction, ConstructionAlert, SearchResultItem } from '@/types/construction';

// Dynamically import heavy map component to prevent memory issues during dev compilation
const ConstructionMap = dynamic(
  () => import('@/components/Map/ConstructionMap').then(mod => ({ default: mod.ConstructionMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <span className="text-slate-500 dark:text-slate-400">Đang tải bản đồ...</span>
        </div>
      </div>
    ),
  }
);

interface HomePageProps {
  mapboxToken: string;
}

export function HomePage({ mapboxToken }: HomePageProps) {
  const t = useTranslations('home');
  const [isFilterSearchOpen, setIsFilterSearchOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([106.6297, 10.8231]);
  const [mapZoom, setMapZoom] = useState(11);
  const [mapKey, setMapKey] = useState(0);
  const [currentRoute, setCurrentRoute] = useState<GeoJSON.LineString | null>(null);
  const [routeAlerts, setRouteAlerts] = useState<ConstructionAlert[]>([]);

  // Feature flags
  const isRoutingEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_ROUTING);
  const isAdvancedSearchEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_ADVANCED_SEARCH);
  const isThemeToggleEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_THEME_TOGGLE);
  const isI18nEnabled = useFeatureFlag(FEATURE_FLAGS.FEATURE_I18N);

  const handleLocationSelect = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
    setMapKey(prev => prev + 1); // Force map re-render to fly to new location
  }, []);

  const handleRouteCalculated = useCallback((route: GeoJSON.LineString | null, alerts: ConstructionAlert[]) => {
    setCurrentRoute(route);
    setRouteAlerts(alerts);
    if (route) {
      setMapKey(prev => prev + 1); // Force map re-render
    }
  }, []);

  // Handle construction selection from panels
  const handleConstructionSelect = useCallback((construction: Construction | ConstructionAlert) => {
    if (construction.center) {
      setMapCenter(construction.center);
      setMapZoom(15);
      setMapKey(prev => prev + 1);
    }
  }, []);

  // Handle construction selection from filter search
  const handleFilterSearchSelect = useCallback((construction: SearchResultItem) => {
    if (construction.center) {
      setMapCenter(construction.center);
      setMapZoom(15);
      setMapKey(prev => prev + 1);
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Header - Minimal on map page, positioned at top-right */}
      <header className="absolute top-0 right-0 z-10 px-4 py-3 pointer-events-none">
        <nav className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-md pointer-events-auto">
          {/* Filter Search button - only show if advanced search is enabled */}
          {isAdvancedSearchEnabled && (
            <button
              onClick={() => setIsFilterSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-body-sm bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">{t('searchConstruction')}</span>
            </button>
          )}
          {isI18nEnabled && <LanguageSwitcher />}
          {isThemeToggleEnabled && <ThemeToggle />}
          <UserMenu />
        </nav>
      </header>

      {/* Map */}
      <main className="h-full w-full">
        {mapboxToken ? (
          <>
            <ConstructionMap
              key={mapKey}
              accessToken={mapboxToken}
              initialCenter={mapCenter}
              initialZoom={mapZoom}
              route={isRoutingEnabled ? currentRoute : null}
              routeAlerts={isRoutingEnabled ? routeAlerts : []}
            />
            {/* Google Maps-style search and routing panels */}
            <MapSearchPanel
              accessToken={mapboxToken}
              onLocationSelect={handleLocationSelect}
              onConstructionSelect={handleConstructionSelect}
            />
            {isRoutingEnabled && (
              <MapRoutingPanel
                accessToken={mapboxToken}
                onRouteCalculated={handleRouteCalculated}
                onConstructionSelect={handleConstructionSelect}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="text-heading-lg text-foreground mb-2">
                {t('mapboxRequired')}
              </h2>
              <p className="text-body-sm text-muted-foreground max-w-md">
                {t('mapboxRequiredDesc')}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Filter Search Overlay - only render if advanced search is enabled */}
      {isAdvancedSearchEnabled && (
        <FilterSearchOverlay
          isOpen={isFilterSearchOpen}
          onClose={() => setIsFilterSearchOpen(false)}
          onConstructionSelect={handleFilterSearchSelect}
        />
      )}
    </div>
  );
}
