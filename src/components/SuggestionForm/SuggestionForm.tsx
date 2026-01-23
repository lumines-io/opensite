'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Check, Pencil, RotateCcw, Link, X, Loader2 } from 'lucide-react';
import { GeometryEditor } from '@/components/GeometryEditor';
import { CoordinateAdjuster, type CoordinatePoint } from '@/components/Map';
import { useSuggestionDraft } from '@/hooks/useSuggestionDraft';
import { FieldLabelWithIndicator, ChangeSummaryBanner } from './FieldChangeIndicator';

// Format number with comma separators for VND display
function formatVNDNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toLocaleString('vi-VN');
}

// Parse formatted VND string back to number
function parseVNDNumber(formattedValue: string): number | undefined {
  const cleaned = formattedValue.replace(/[.,\s]/g, '');
  if (cleaned === '') return undefined;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? undefined : parsed;
}

// Types
export type SuggestionType = 'create' | 'update' | 'complete' | 'correction';
export type ConstructionType = 'road' | 'highway' | 'metro' | 'bridge' | 'tunnel' | 'interchange' | 'station' | 'other';
export type ConstructionStatus = 'planned' | 'in-progress' | 'completed' | 'paused' | 'cancelled';

export interface SuggestionFormData {
  // Step 1: Basic Info
  title: string;
  suggestionType: SuggestionType;
  construction?: number; // For update/complete/correction

  // Step 2: Details
  proposedData: {
    title?: string;
    description?: string;
    constructionType?: ConstructionType;
    constructionStatus?: ConstructionStatus;
    progress?: number;
    startDate?: string;
    expectedEndDate?: string;
    contractor?: string;
    budget?: number;
    fundingSource?: string;
  };

  // Step 3: Geometry
  proposedGeometry?: GeoJSON.Geometry | null;
  coordinateAdjustments?: Record<string, { longitude: number; latitude: number }>;
  locationDescription?: string;

  // Step 4: Sources & Evidence
  justification?: string;
  evidenceUrls: { url: string }[];
}

interface Construction {
  id: number;
  title: string;
  slug: string;
  constructionType: string;
  constructionStatus: string;
  geometry?: GeoJSON.Geometry | null;
  centroid?: [number, number] | null;
}

interface InitialData {
  title: string;
  suggestionType: SuggestionType;
  construction?: Construction;
  proposedData: SuggestionFormData['proposedData'];
  proposedGeometry?: GeoJSON.Geometry | null;
  locationDescription?: string;
  justification?: string;
  evidenceUrls?: { url: string }[];
}

interface SuggestionFormProps {
  accessToken: string;
  constructions?: Construction[];
  onSubmit?: (data: SuggestionFormData) => Promise<void>;
  initialConstruction?: Construction;
  initialData?: InitialData;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Type and title of your suggestion' },
  { id: 2, name: 'Details', description: 'Proposed changes and information' },
  { id: 3, name: 'Location', description: 'Adjust coordinates or draw geometry' },
  { id: 4, name: 'Sources', description: 'Evidence and references' },
];

const SUGGESTION_TYPE_LABELS: Record<SuggestionType, { label: string; description: string }> = {
  create: { label: 'New Project', description: 'Suggest a new construction project to add' },
  update: { label: 'Update Existing', description: 'Update information about an existing project' },
  complete: { label: 'Mark Completed', description: 'Report that a project has been completed' },
  correction: { label: 'Report Correction', description: 'Fix incorrect information' },
};

const CONSTRUCTION_TYPE_LABELS: Record<ConstructionType, string> = {
  road: 'Road Construction',
  highway: 'Highway/Expressway',
  metro: 'Metro Line',
  bridge: 'Bridge',
  tunnel: 'Tunnel',
  interchange: 'Interchange',
  station: 'Station',
  other: 'Other',
};

const CONSTRUCTION_STATUS_LABELS: Record<ConstructionStatus, string> = {
  planned: 'Planned',
  'in-progress': 'In Progress',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

// Extract coordinates from geometry for the coordinate adjuster
function extractCoordinatesFromGeometry(geometry: GeoJSON.Geometry | null | undefined): CoordinatePoint[] {
  if (!geometry) return [];

  const points: CoordinatePoint[] = [];

  switch (geometry.type) {
    case 'Point':
      points.push({
        id: 'point-0',
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
        label: 'Location',
        color: '#F59E0B',
      });
      break;
    case 'LineString':
      geometry.coordinates.forEach((coord, index) => {
        const isFirst = index === 0;
        const isLast = index === geometry.coordinates.length - 1;
        points.push({
          id: `line-${index}`,
          longitude: coord[0],
          latitude: coord[1],
          label: isFirst ? 'Start' : isLast ? 'End' : `Point ${index + 1}`,
          color: isFirst ? '#22C55E' : isLast ? '#EF4444' : '#F59E0B',
        });
      });
      break;
    case 'Polygon':
      // Only show exterior ring coordinates (first ring)
      const exteriorRing = geometry.coordinates[0];
      exteriorRing.slice(0, -1).forEach((coord, index) => { // Skip last point (same as first)
        points.push({
          id: `polygon-${index}`,
          longitude: coord[0],
          latitude: coord[1],
          label: `Vertex ${index + 1}`,
          color: '#F59E0B',
        });
      });
      break;
    case 'MultiPoint':
      geometry.coordinates.forEach((coord, index) => {
        points.push({
          id: `multipoint-${index}`,
          longitude: coord[0],
          latitude: coord[1],
          label: `Point ${index + 1}`,
          color: '#F59E0B',
        });
      });
      break;
    // For more complex types, just show the first few significant points
    case 'MultiLineString':
      geometry.coordinates.forEach((line, lineIndex) => {
        if (lineIndex > 2) return; // Limit to first 3 lines
        points.push({
          id: `multiline-${lineIndex}-start`,
          longitude: line[0][0],
          latitude: line[0][1],
          label: `Line ${lineIndex + 1} Start`,
          color: '#22C55E',
        });
        points.push({
          id: `multiline-${lineIndex}-end`,
          longitude: line[line.length - 1][0],
          latitude: line[line.length - 1][1],
          label: `Line ${lineIndex + 1} End`,
          color: '#EF4444',
        });
      });
      break;
  }

  return points;
}

// Apply coordinate adjustments back to geometry
function applyCoordinateAdjustments(
  geometry: GeoJSON.Geometry | null | undefined,
  adjustments: Record<string, { longitude: number; latitude: number }>
): GeoJSON.Geometry | null {
  if (!geometry) return null;
  if (Object.keys(adjustments).length === 0) return geometry;

  // Deep clone the geometry
  const adjusted = JSON.parse(JSON.stringify(geometry)) as GeoJSON.Geometry;

  for (const [pointId, coords] of Object.entries(adjustments)) {
    const [type, indexStr] = pointId.split('-');
    const index = parseInt(indexStr, 10);

    switch (adjusted.type) {
      case 'Point':
        if (type === 'point') {
          adjusted.coordinates = [coords.longitude, coords.latitude];
        }
        break;
      case 'LineString':
        if (type === 'line' && index < adjusted.coordinates.length) {
          adjusted.coordinates[index] = [coords.longitude, coords.latitude];
        }
        break;
      case 'Polygon':
        if (type === 'polygon' && index < adjusted.coordinates[0].length - 1) {
          adjusted.coordinates[0][index] = [coords.longitude, coords.latitude];
          // If it's the first point, also update the last point (they should be the same)
          if (index === 0) {
            adjusted.coordinates[0][adjusted.coordinates[0].length - 1] = [coords.longitude, coords.latitude];
          }
        }
        break;
      case 'MultiPoint':
        if (type === 'multipoint' && index < adjusted.coordinates.length) {
          adjusted.coordinates[index] = [coords.longitude, coords.latitude];
        }
        break;
      case 'MultiLineString':
        if (type === 'multiline') {
          const [lineIndexStr, position] = indexStr.split('-');
          const lineIndex = parseInt(lineIndexStr, 10);
          if (lineIndex < adjusted.coordinates.length) {
            const line = adjusted.coordinates[lineIndex];
            if (position === 'start') {
              line[0] = [coords.longitude, coords.latitude];
            } else if (position === 'end') {
              line[line.length - 1] = [coords.longitude, coords.latitude];
            }
          }
        }
        break;
    }
  }

  return adjusted;
}

export function SuggestionForm({
  accessToken,
  constructions = [],
  onSubmit,
  initialConstruction,
  initialData,
}: SuggestionFormProps) {
  // Determine if we're editing an existing construction
  const isEditMode = !!initialData?.construction;

  // Initial data for draft comparison
  const originalProposedData = useMemo(() => ({
    title: initialData?.proposedData.title,
    constructionType: initialData?.proposedData.constructionType,
    constructionStatus: initialData?.proposedData.constructionStatus,
    progress: initialData?.proposedData.progress,
    startDate: initialData?.proposedData.startDate,
    expectedEndDate: initialData?.proposedData.expectedEndDate,
    contractor: initialData?.proposedData.contractor,
    budget: initialData?.proposedData.budget,
    fundingSource: initialData?.proposedData.fundingSource,
    proposedGeometry: initialData?.proposedGeometry,
    locationDescription: initialData?.locationDescription || '',
    justification: initialData?.justification || '',
  }), [initialData]);

  // Session storage draft management
  const {
    draftData,
    changedFields,
    isFieldChanged,
    updateDraft,
    clearDraft,
    hasChanges,
    lastSavedAt,
  } = useSuggestionDraft({
    constructionId: initialData?.construction?.id || 0,
    constructionSlug: initialData?.construction?.slug || '',
    initialData: originalProposedData,
  });

  const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : 1); // Skip to details if editing
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [locationTab, setLocationTab] = useState<'adjust' | 'draw'>('adjust');

  const [formData, setFormData] = useState<SuggestionFormData>(() => {
    // Restore from draft if available
    if (draftData && initialData) {
      return {
        title: initialData.title,
        suggestionType: initialData.suggestionType,
        construction: initialData.construction?.id,
        proposedData: {
          ...initialData.proposedData,
          ...draftData.proposedData,
        },
        proposedGeometry: draftData.proposedGeometry !== undefined
          ? draftData.proposedGeometry
          : initialData.proposedGeometry || null,
        coordinateAdjustments: draftData.coordinateAdjustments || {},
        locationDescription: draftData.locationDescription || initialData.locationDescription || '',
        justification: draftData.justification || initialData.justification || '',
        evidenceUrls: draftData.evidenceUrls || initialData.evidenceUrls || [],
      };
    }

    if (initialData) {
      return {
        title: initialData.title,
        suggestionType: initialData.suggestionType,
        construction: initialData.construction?.id,
        proposedData: initialData.proposedData,
        proposedGeometry: initialData.proposedGeometry || null,
        coordinateAdjustments: {},
        locationDescription: initialData.locationDescription || '',
        justification: initialData.justification || '',
        evidenceUrls: initialData.evidenceUrls || [],
      };
    }
    return {
      title: '',
      suggestionType: initialConstruction ? 'update' : 'create',
      construction: initialConstruction?.id,
      proposedData: {
        constructionType: 'road',
        constructionStatus: 'planned',
        progress: 0,
      },
      proposedGeometry: null,
      coordinateAdjustments: {},
      locationDescription: '',
      justification: '',
      evidenceUrls: [],
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Coordinate points for the adjuster
  const coordinatePoints = useMemo(() => {
    const baseGeometry = initialData?.proposedGeometry;
    const points = extractCoordinatesFromGeometry(baseGeometry);

    // Apply any existing adjustments
    if (formData.coordinateAdjustments) {
      return points.map(p => {
        const adjustment = formData.coordinateAdjustments?.[p.id];
        if (adjustment) {
          return { ...p, longitude: adjustment.longitude, latitude: adjustment.latitude };
        }
        return p;
      });
    }

    return points;
  }, [initialData?.proposedGeometry, formData.coordinateAdjustments]);

  // Update form data and persist to draft
  const updateFormData = useCallback(<K extends keyof SuggestionFormData>(
    field: K,
    value: SuggestionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Save to draft
    if (isEditMode) {
      const draftUpdate: Partial<typeof draftData> = {};
      if (field === 'proposedGeometry') {
        draftUpdate.proposedGeometry = value as GeoJSON.Geometry | null;
      } else if (field === 'coordinateAdjustments') {
        draftUpdate.coordinateAdjustments = value as Record<string, { longitude: number; latitude: number }>;
      } else if (field === 'locationDescription') {
        draftUpdate.locationDescription = value as string;
      } else if (field === 'justification') {
        draftUpdate.justification = value as string;
      } else if (field === 'evidenceUrls') {
        draftUpdate.evidenceUrls = value as { url: string }[];
      }
      if (Object.keys(draftUpdate).length > 0) {
        updateDraft(draftUpdate);
      }
    }
  }, [isEditMode, updateDraft]);

  const updateProposedData = useCallback(<K extends keyof SuggestionFormData['proposedData']>(
    field: K,
    value: SuggestionFormData['proposedData'][K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      proposedData: { ...prev.proposedData, [field]: value },
    }));

    // Save to draft
    if (isEditMode) {
      updateDraft({
        proposedData: {
          ...formData.proposedData,
          [field]: value,
        },
      });
    }
  }, [isEditMode, updateDraft, formData.proposedData]);

  // Handle coordinate adjustment
  const handleCoordinateChange = useCallback((pointId: string, longitude: number, latitude: number) => {
    const newAdjustments = {
      ...formData.coordinateAdjustments,
      [pointId]: { longitude, latitude },
    };
    updateFormData('coordinateAdjustments', newAdjustments);

    // Also update the proposed geometry with the adjustment
    const adjustedGeometry = applyCoordinateAdjustments(
      initialData?.proposedGeometry,
      newAdjustments
    );
    setFormData(prev => ({ ...prev, proposedGeometry: adjustedGeometry }));

    if (isEditMode) {
      updateDraft({
        coordinateAdjustments: newAdjustments,
        proposedGeometry: adjustedGeometry,
      });
    }
  }, [formData.coordinateAdjustments, initialData?.proposedGeometry, isEditMode, updateDraft, updateFormData]);

  // Handle clearing all changes
  const handleClearChanges = useCallback(() => {
    if (confirm('Are you sure you want to discard all changes? This cannot be undone.')) {
      clearDraft();
      if (initialData) {
        setFormData({
          title: initialData.title,
          suggestionType: initialData.suggestionType,
          construction: initialData.construction?.id,
          proposedData: initialData.proposedData,
          proposedGeometry: initialData.proposedGeometry || null,
          coordinateAdjustments: {},
          locationDescription: initialData.locationDescription || '',
          justification: initialData.justification || '',
          evidenceUrls: initialData.evidenceUrls || [],
        });
      }
    }
  }, [clearDraft, initialData]);

  // Navigation
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        if (!formData.title.trim() || formData.title.length < 3) return false;
        if (formData.suggestionType !== 'create' && !formData.construction) return false;
        return true;
      case 2:
        return true; // Details are optional
      case 3:
        return true; // Geometry is optional
      case 4:
        return true; // Sources are optional
      default:
        return false;
    }
  }, [currentStep, formData]);

  const goNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // URL management
  const addUrl = () => {
    if (newUrl.trim()) {
      try {
        new URL(newUrl);
        const newUrls = [...formData.evidenceUrls, { url: newUrl.trim() }];
        setFormData((prev) => ({
          ...prev,
          evidenceUrls: newUrls,
        }));
        if (isEditMode) {
          updateDraft({ evidenceUrls: newUrls });
        }
        setNewUrl('');
      } catch {
        // Invalid URL
      }
    }
  };

  const removeUrl = (index: number) => {
    const newUrls = formData.evidenceUrls.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      evidenceUrls: newUrls,
    }));
    if (isEditMode) {
      updateDraft({ evidenceUrls: newUrls });
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission to API
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit suggestion');
        }
      }

      // Clear draft on successful submission
      clearDraft();
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter constructions for search
  const filteredConstructions = constructions.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count changed fields
  const changedFieldCount = Object.keys(changedFields).length;

  // Success state
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            Suggestion Submitted!
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-6">
            Thank you for your contribution. Our moderators will review your suggestion shortly.
          </p>
          <button
            onClick={() => {
              setSubmitSuccess(false);
              setFormData({
                title: '',
                suggestionType: 'create',
                proposedData: {
                  constructionType: 'road',
                  constructionStatus: 'planned',
                  progress: 0,
                },
                coordinateAdjustments: {},
                evidenceUrls: [],
              });
              setCurrentStep(1);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Submit Another Suggestion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Edit mode header */}
      {isEditMode && initialData?.construction && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Pencil className="w-5 h-5" />
            <span className="font-medium">Editing: {initialData.construction.title}</span>
          </div>
        </div>
      )}

      {/* Changes summary banner */}
      {isEditMode && (
        <ChangeSummaryBanner
          changedFieldCount={changedFieldCount}
          onClearChanges={handleClearChanges}
          lastSavedAt={lastSavedAt}
        />
      )}

      {/* Step indicator */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {STEPS.map((step, index) => {
            // In edit mode, skip step 1 in the indicator
            if (isEditMode && step.id === 1) return null;
            return (
            <li key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`flex items-center ${step.id < currentStep ? 'cursor-pointer' : step.id > currentStep ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    step.id < currentStep
                      ? 'bg-amber-500 text-white'
                      : step.id === currentStep
                      ? 'bg-amber-500 text-white ring-4 ring-amber-200 dark:ring-amber-900'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </span>
                <span className="ml-3 hidden sm:block">
                  <span className={`text-sm font-medium ${step.id === currentStep ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </span>
              </button>
              {index < STEPS.length - 1 && !isEditMode && (
                <div className={`flex-1 h-0.5 mx-4 ${step.id < currentStep ? 'bg-amber-500' : 'bg-muted'}`} />
              )}
              {index < STEPS.length - 1 && isEditMode && index > 0 && (
                <div className={`flex-1 h-0.5 mx-4 ${step.id < currentStep ? 'bg-amber-500' : 'bg-muted'}`} />
              )}
            </li>
          );
          })}
        </ol>
      </nav>

      {/* Form content */}
      <div className="bg-card border border-border rounded-lg p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
              <p className="text-sm text-muted-foreground">What type of suggestion are you making?</p>
            </div>

            {/* Suggestion Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(SUGGESTION_TYPE_LABELS) as [SuggestionType, { label: string; description: string }][]).map(
                ([type, { label, description }]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateFormData('suggestionType', type)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      formData.suggestionType === type
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  </button>
                )
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Suggestion Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Metro Line 2 - Extension to District 12"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
              {formData.title.length > 0 && formData.title.length < 3 && (
                <p className="text-sm text-red-500 mt-1">Title must be at least 3 characters</p>
              )}
            </div>

            {/* Construction selector (for update/complete/correction) */}
            {formData.suggestionType !== 'create' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Construction <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search constructions..."
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none mb-2"
                />
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                  {filteredConstructions.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      No constructions found
                    </p>
                  ) : (
                    filteredConstructions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateFormData('construction', c.id)}
                        className={`w-full p-3 text-left border-b border-border last:border-b-0 hover:bg-muted transition-colors ${
                          formData.construction === c.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                        }`}
                      >
                        <span className="font-medium">{c.title}</span>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">{c.constructionType}</span>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">{c.constructionStatus}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Project Details</h2>
              <p className="text-sm text-muted-foreground">
                {formData.suggestionType === 'create'
                  ? 'Provide details about the new project'
                  : 'Specify the changes you want to propose'}
              </p>
            </div>

            {/* Construction Type */}
            <div>
              <FieldLabelWithIndicator
                label="Construction Type"
                isChanged={isFieldChanged('constructionType')}
              />
              <select
                value={formData.proposedData.constructionType || 'road'}
                onChange={(e) => updateProposedData('constructionType', e.target.value as ConstructionType)}
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                  isFieldChanged('constructionType') ? 'border-amber-500' : 'border-border'
                }`}
              >
                {(Object.entries(CONSTRUCTION_TYPE_LABELS) as [ConstructionType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {isFieldChanged('constructionType') && initialData?.proposedData.constructionType && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {CONSTRUCTION_TYPE_LABELS[initialData.proposedData.constructionType]}
                </p>
              )}
            </div>

            {/* Construction Status */}
            <div>
              <FieldLabelWithIndicator
                label="Construction Status"
                isChanged={isFieldChanged('constructionStatus')}
              />
              <select
                value={formData.proposedData.constructionStatus || 'planned'}
                onChange={(e) => updateProposedData('constructionStatus', e.target.value as ConstructionStatus)}
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                  isFieldChanged('constructionStatus') ? 'border-amber-500' : 'border-border'
                }`}
              >
                {(Object.entries(CONSTRUCTION_STATUS_LABELS) as [ConstructionStatus, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {isFieldChanged('constructionStatus') && initialData?.proposedData.constructionStatus && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {CONSTRUCTION_STATUS_LABELS[initialData.proposedData.constructionStatus]}
                </p>
              )}
            </div>

            {/* Progress */}
            <div>
              <FieldLabelWithIndicator
                label={`Progress: ${formData.proposedData.progress || 0}%`}
                isChanged={isFieldChanged('progress')}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={formData.proposedData.progress || 0}
                onChange={(e) => updateProposedData('progress', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              {isFieldChanged('progress') && initialData?.proposedData.progress !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {initialData.proposedData.progress}%
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <FieldLabelWithIndicator
                label="Description"
                isChanged={isFieldChanged('description')}
              />
              <textarea
                value={formData.proposedData.description || ''}
                onChange={(e) => updateProposedData('description', e.target.value)}
                placeholder="Describe the construction project..."
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none ${
                  isFieldChanged('description') ? 'border-amber-500' : 'border-border'
                }`}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabelWithIndicator
                  label="Start Date"
                  isChanged={isFieldChanged('startDate')}
                />
                <input
                  type="date"
                  value={formData.proposedData.startDate || ''}
                  onChange={(e) => updateProposedData('startDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                    isFieldChanged('startDate') ? 'border-amber-500' : 'border-border'
                  }`}
                />
                {isFieldChanged('startDate') && initialData?.proposedData.startDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {initialData.proposedData.startDate}
                  </p>
                )}
              </div>
              <div>
                <FieldLabelWithIndicator
                  label="Expected End Date"
                  isChanged={isFieldChanged('expectedEndDate')}
                />
                <input
                  type="date"
                  value={formData.proposedData.expectedEndDate || ''}
                  onChange={(e) => updateProposedData('expectedEndDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                    isFieldChanged('expectedEndDate') ? 'border-amber-500' : 'border-border'
                  }`}
                />
                {isFieldChanged('expectedEndDate') && initialData?.proposedData.expectedEndDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {initialData.proposedData.expectedEndDate}
                  </p>
                )}
              </div>
            </div>

            {/* Budget & Contractor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabelWithIndicator
                  label="Contractor"
                  isChanged={isFieldChanged('contractor')}
                />
                <input
                  type="text"
                  value={formData.proposedData.contractor || ''}
                  onChange={(e) => updateProposedData('contractor', e.target.value)}
                  placeholder="e.g., HCMC Infrastructure Corp"
                  className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                    isFieldChanged('contractor') ? 'border-amber-500' : 'border-border'
                  }`}
                />
                {isFieldChanged('contractor') && initialData?.proposedData.contractor && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {initialData.proposedData.contractor}
                  </p>
                )}
              </div>
              <div>
                <FieldLabelWithIndicator
                  label="Budget (VND)"
                  isChanged={isFieldChanged('budget')}
                />
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatVNDNumber(formData.proposedData.budget)}
                    onChange={(e) => {
                      const parsed = parseVNDNumber(e.target.value);
                      updateProposedData('budget', parsed);
                    }}
                    placeholder="e.g., 900,000,000"
                    className={`w-full px-4 py-2 pr-14 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                      isFieldChanged('budget') ? 'border-amber-500' : 'border-border'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    VND
                  </span>
                </div>
                {formData.proposedData.budget !== undefined && formData.proposedData.budget > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatVNDNumber(formData.proposedData.budget)} VND
                  </p>
                )}
                {isFieldChanged('budget') && initialData?.proposedData.budget && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Original: {formatVNDNumber(initialData.proposedData.budget)} VND
                  </p>
                )}
              </div>
            </div>

            <div>
              <FieldLabelWithIndicator
                label="Funding Source"
                isChanged={isFieldChanged('fundingSource')}
              />
              <input
                type="text"
                value={formData.proposedData.fundingSource || ''}
                onChange={(e) => updateProposedData('fundingSource', e.target.value)}
                placeholder="e.g., City budget, ODA loan"
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none ${
                  isFieldChanged('fundingSource') ? 'border-amber-500' : 'border-border'
                }`}
              />
              {isFieldChanged('fundingSource') && initialData?.proposedData.fundingSource && (
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {initialData.proposedData.fundingSource}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Location/Geometry */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Location & Geometry</h2>
              <p className="text-sm text-muted-foreground">
                {isEditMode
                  ? 'Adjust existing coordinates or draw new geometry'
                  : 'Draw the construction path or area on the map'}
              </p>
            </div>

            {/* Location description */}
            <div>
              <FieldLabelWithIndicator
                label="Location Description"
                isChanged={isFieldChanged('locationDescription')}
              />
              <textarea
                value={formData.locationDescription || ''}
                onChange={(e) => updateFormData('locationDescription', e.target.value)}
                placeholder="Describe the location (e.g., From Binh Thanh District to District 2, along Vo Van Kiet Boulevard)"
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none ${
                  isFieldChanged('locationDescription') ? 'border-amber-500' : 'border-border'
                }`}
              />
            </div>

            {/* Tab selector for edit mode */}
            {isEditMode && coordinatePoints.length > 0 && (
              <div className="flex gap-2 border-b border-border pb-2">
                <button
                  onClick={() => setLocationTab('adjust')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    locationTab === 'adjust'
                      ? 'bg-amber-500 text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Adjust Coordinates
                  {Object.keys(formData.coordinateAdjustments || {}).length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {Object.keys(formData.coordinateAdjustments || {}).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setLocationTab('draw')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    locationTab === 'draw'
                      ? 'bg-amber-500 text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Draw New Geometry
                </button>
              </div>
            )}

            {/* Coordinate Adjuster (for edit mode with existing geometry) */}
            {isEditMode && locationTab === 'adjust' && coordinatePoints.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">
                    Drag the markers to adjust coordinate positions
                  </p>
                  {Object.keys(formData.coordinateAdjustments || {}).length > 0 && (
                    <button
                      onClick={() => {
                        updateFormData('coordinateAdjustments', {});
                        updateFormData('proposedGeometry', initialData?.proposedGeometry || null);
                      }}
                      className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset coordinates
                    </button>
                  )}
                </div>
                <CoordinateAdjuster
                  accessToken={accessToken}
                  points={coordinatePoints}
                  onPointChange={handleCoordinateChange}
                  height="400px"
                />

                {/* Coordinate adjustments summary */}
                {Object.keys(formData.coordinateAdjustments || {}).length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Modified Coordinates
                    </h4>
                    <div className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                      {Object.entries(formData.coordinateAdjustments || {}).map(([pointId, coords]) => {
                        const originalPoint = extractCoordinatesFromGeometry(initialData?.proposedGeometry).find(p => p.id === pointId);
                        return (
                          <div key={pointId} className="flex items-center gap-2">
                            <span className="font-medium">{originalPoint?.label || pointId}:</span>
                            <span className="font-mono">
                              {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                            </span>
                            {originalPoint && (
                              <span className="text-amber-600 dark:text-amber-400">
                                (was: {originalPoint.latitude.toFixed(6)}, {originalPoint.longitude.toFixed(6)})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Geometry Editor (for draw mode or create mode) */}
            {(!isEditMode || locationTab === 'draw' || coordinatePoints.length === 0) && (
              <div>
                <FieldLabelWithIndicator
                  label="Draw Geometry"
                  isChanged={isFieldChanged('geometry')}
                />
                <GeometryEditor
                  value={formData.proposedGeometry}
                  onChange={(geometry) => updateFormData('proposedGeometry', geometry)}
                  constructionType={formData.proposedData.constructionType}
                  accessToken={accessToken}
                  height="400px"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Sources */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Sources & Evidence</h2>
              <p className="text-sm text-muted-foreground">
                Provide references to support your suggestion
              </p>
            </div>

            {/* Justification */}
            <div>
              <FieldLabelWithIndicator
                label="Why are you suggesting this?"
                isChanged={isFieldChanged('justification')}
              />
              <textarea
                value={formData.justification || ''}
                onChange={(e) => updateFormData('justification', e.target.value)}
                placeholder="Explain why this suggestion should be added/updated..."
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none ${
                  isFieldChanged('justification') ? 'border-amber-500' : 'border-border'
                }`}
              />
            </div>

            {/* Evidence URLs */}
            <div>
              <FieldLabelWithIndicator
                label="Reference URLs"
                isChanged={isFieldChanged('evidenceUrls')}
              />
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/news-article"
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addUrl}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.evidenceUrls.length > 0 && (
                <ul className="space-y-2">
                  {formData.evidenceUrls.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                    >
                      <Link className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-sm">{item.url}</span>
                      <button
                        type="button"
                        onClick={() => removeUrl(index)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Add links to news articles, government announcements, or other sources
              </p>
            </div>

            {/* Summary */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-3">Submission Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Type:</dt>
                  <dd>{SUGGESTION_TYPE_LABELS[formData.suggestionType].label}</dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Title:</dt>
                  <dd>{formData.title}</dd>
                </div>
                {formData.proposedData.constructionType && (
                  <div className="flex">
                    <dt className="w-32 text-muted-foreground">Project Type:</dt>
                    <dd className="flex items-center gap-2">
                      {CONSTRUCTION_TYPE_LABELS[formData.proposedData.constructionType]}
                      {isFieldChanged('constructionType') && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">(modified)</span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Status:</dt>
                  <dd className="flex items-center gap-2">
                    {CONSTRUCTION_STATUS_LABELS[formData.proposedData.constructionStatus || 'planned']}
                    {isFieldChanged('constructionStatus') && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">(modified)</span>
                    )}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Progress:</dt>
                  <dd className="flex items-center gap-2">
                    {formData.proposedData.progress || 0}%
                    {isFieldChanged('progress') && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">(modified)</span>
                    )}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Geometry:</dt>
                  <dd className="flex items-center gap-2">
                    {formData.proposedGeometry ? 'Provided' : 'Not provided'}
                    {(isFieldChanged('geometry') || Object.keys(formData.coordinateAdjustments || {}).length > 0) && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">(modified)</span>
                    )}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-32 text-muted-foreground">Sources:</dt>
                  <dd>{formData.evidenceUrls.length} URL(s)</dd>
                </div>
                {hasChanges && (
                  <div className="flex pt-2 border-t border-border">
                    <dt className="w-32 text-amber-600 dark:text-amber-400 font-medium">Total Changes:</dt>
                    <dd className="text-amber-600 dark:text-amber-400 font-medium">{changedFieldCount} field(s) modified</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1 || (isEditMode && currentStep === 2)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <div className="flex gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed()}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Suggestion'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
