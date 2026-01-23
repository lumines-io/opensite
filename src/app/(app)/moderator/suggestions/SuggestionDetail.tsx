'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Suggestion,
  SuggestionStatus,
  SUGGESTION_STATUS_CONFIG,
  SUGGESTION_TYPE_CONFIG,
  SOURCE_TYPE_CONFIG,
} from '@/types/suggestion';

interface SuggestionDetailProps {
  suggestion: Suggestion;
  onClose: () => void;
  onUpdate: (updated: Suggestion) => void;
}

export function SuggestionDetail({ suggestion, onClose, onUpdate }: SuggestionDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(suggestion.reviewNotes || '');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<SuggestionStatus | null>(null);

  const statusConfig = SUGGESTION_STATUS_CONFIG[suggestion.status];
  const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.suggestionType];
  const sourceConfig = SOURCE_TYPE_CONFIG[suggestion.sourceType];

  const handleStatusUpdate = useCallback(
    async (newStatus: SuggestionStatus) => {
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/suggestions/${suggestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            reviewNotes: reviewNotes || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update suggestion');
        }

        const updated = await response.json();
        onUpdate(updated);
        setShowReviewForm(false);
        setPendingAction(null);
      } catch (error) {
        console.error('Update error:', error);
        alert('Không thể cập nhật đề xuất. Vui lòng thử lại.');
      } finally {
        setIsUpdating(false);
      }
    },
    [suggestion.id, reviewNotes, onUpdate]
  );

  const handleAction = useCallback((action: SuggestionStatus) => {
    setPendingAction(action);
    setShowReviewForm(true);
  }, []);

  const handleAssignToMe = useCallback(async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/suggestions/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'under_review',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign suggestion');
      }

      const updated = await response.json();
      onUpdate(updated);
    } catch (error) {
      console.error('Assign error:', error);
      alert('Không thể nhận xử lý đề xuất. Vui lòng thử lại.');
    } finally {
      setIsUpdating(false);
    }
  }, [suggestion.id, onUpdate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReviewForm) {
          setShowReviewForm(false);
          setPendingAction(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showReviewForm]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-card shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  #{suggestion.id}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground truncate">
                {suggestion.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Map Preview */}
          {suggestion.proposedGeometry && (
            <div className="border-b border-border">
              <GeometryMapPreview geometry={suggestion.proposedGeometry} />
            </div>
          )}

          <div className="p-4 space-y-6">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Loại đề xuất:</span>
                <p className="font-medium text-foreground">{typeConfig.label}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nguồn:</span>
                <p className="font-medium text-foreground">{sourceConfig.label}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ngày tạo:</span>
                <p className="font-medium text-foreground">{formatDate(suggestion.createdAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Người gửi:</span>
                <p className="font-medium text-foreground">
                  {suggestion.submittedBy?.name || suggestion.submittedBy?.email || 'N/A'}
                </p>
              </div>
            </div>

            {/* Related construction */}
            {suggestion.construction && (
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Công trình liên quan:</span>
                <p className="font-medium text-foreground">{suggestion.construction.title}</p>
                <p className="text-sm text-muted-foreground">
                  {suggestion.construction.constructionType} - {suggestion.construction.constructionStatus}
                </p>
              </div>
            )}

            {/* Location description */}
            {suggestion.locationDescription && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Mô tả vị trí</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {suggestion.locationDescription}
                </p>
              </div>
            )}

            {/* Justification */}
            {suggestion.justification && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Lý do đề xuất</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {suggestion.justification}
                </p>
              </div>
            )}

            {/* Proposed Data */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Dữ liệu đề xuất</h3>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto text-foreground">
                {JSON.stringify(suggestion.proposedData, null, 2)}
              </pre>
            </div>

            {/* Evidence URLs */}
            {suggestion.evidenceUrls && suggestion.evidenceUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Nguồn chứng cứ ({suggestion.evidenceUrls.length})
                </h3>
                <ul className="space-y-2">
                  {suggestion.evidenceUrls.map((evidence, index) => (
                    <li key={index}>
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        {evidence.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source URL for scraped/api sources */}
            {suggestion.sourceUrl && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">URL nguồn</h3>
                <a
                  href={suggestion.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {suggestion.sourceUrl}
                </a>
                {suggestion.sourceConfidence !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Độ tin cậy: {Math.round(suggestion.sourceConfidence * 100)}%
                  </p>
                )}
              </div>
            )}

            {/* Review info */}
            {suggestion.reviewedBy && (
              <div className="p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Đã xem xét bởi:</span>
                <p className="font-medium text-foreground">
                  {suggestion.reviewedBy.name || suggestion.reviewedBy.email}
                </p>
                {suggestion.reviewedAt && (
                  <p className="text-sm text-muted-foreground">
                    {formatDate(suggestion.reviewedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Existing review notes */}
            {suggestion.reviewNotes && !showReviewForm && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Ghi chú xem xét</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {suggestion.reviewNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="border-t border-border p-4 bg-muted/50">
            <h3 className="text-sm font-medium text-foreground mb-2">
              {pendingAction === 'approved' && 'Phê duyệt đề xuất'}
              {pendingAction === 'rejected' && 'Từ chối đề xuất'}
              {pendingAction === 'changes_requested' && 'Yêu cầu sửa đổi'}
            </h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                pendingAction === 'changes_requested'
                  ? 'Mô tả những thay đổi cần thiết...'
                  : 'Thêm ghi chú xem xét (tùy chọn)...'
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              required={pendingAction === 'changes_requested'}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowReviewForm(false);
                  setPendingAction(null);
                }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => pendingAction && handleStatusUpdate(pendingAction)}
                disabled={isUpdating || (pendingAction === 'changes_requested' && !reviewNotes.trim())}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  pendingAction === 'approved'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : pendingAction === 'rejected'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {isUpdating ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showReviewForm && (
          <div className="border-t border-border p-4 bg-card">
            <div className="flex flex-wrap items-center gap-2">
              {/* Show assign button for pending suggestions */}
              {suggestion.status === 'pending' && (
                <button
                  onClick={handleAssignToMe}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isUpdating ? 'Đang xử lý...' : 'Nhận xử lý'}
                </button>
              )}

              {/* Show review actions for under_review or changes_requested */}
              {['pending', 'under_review', 'changes_requested'].includes(suggestion.status) && (
                <>
                  <button
                    onClick={() => handleAction('approved')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleAction('changes_requested')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Yêu cầu sửa đổi
                  </button>
                </>
              )}

              {/* Show status for completed reviews */}
              {['approved', 'rejected', 'merged', 'superseded'].includes(suggestion.status) && (
                <span className="text-sm text-muted-foreground">
                  Đề xuất đã được xử lý với trạng thái: {statusConfig.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Geometry Map Preview Component
function GeometryMapPreview({ geometry }: { geometry: GeoJSON.Geometry }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    // Calculate center from geometry
    let center: [number, number] = [106.6297, 10.8231]; // Default HCMC center

    if (geometry.type === 'Point') {
      center = geometry.coordinates as [number, number];
    } else if (geometry.type === 'LineString') {
      const coords = geometry.coordinates as [number, number][];
      const midIndex = Math.floor(coords.length / 2);
      center = coords[midIndex];
    } else if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0] as [number, number][];
      const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      center = [avgLng, avgLat];
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom: 13,
      interactive: true,
      attributionControl: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add source
      map.current.addSource('proposed-geometry', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry,
          properties: {},
        },
      });

      // Add layers based on geometry type
      if (geometry.type === 'Point') {
        map.current.addLayer({
          id: 'proposed-point',
          type: 'circle',
          source: 'proposed-geometry',
          paint: {
            'circle-radius': 10,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
      } else if (geometry.type === 'LineString') {
        map.current.addLayer({
          id: 'proposed-line',
          type: 'line',
          source: 'proposed-geometry',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });
      } else if (geometry.type === 'Polygon') {
        map.current.addLayer({
          id: 'proposed-polygon-fill',
          type: 'fill',
          source: 'proposed-geometry',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3,
          },
        });
        map.current.addLayer({
          id: 'proposed-polygon-outline',
          type: 'line',
          source: 'proposed-geometry',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        });
      }

      // Fit bounds
      if (geometry.type !== 'Point') {
        const bounds = new mapboxgl.LngLatBounds();

        if (geometry.type === 'LineString') {
          (geometry.coordinates as [number, number][]).forEach((coord) => {
            bounds.extend(coord);
          });
        } else if (geometry.type === 'Polygon') {
          (geometry.coordinates[0] as [number, number][]).forEach((coord) => {
            bounds.extend(coord);
          });
        }

        map.current.fitBounds(bounds, {
          padding: 40,
          maxZoom: 15,
        });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [geometry]);

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-64 w-full" />
      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded text-xs text-muted-foreground">
        Hình học đề xuất ({geometry.type})
      </div>
    </div>
  );
}
