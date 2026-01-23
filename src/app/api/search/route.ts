import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Where } from 'payload';

// Extract plain text from Lexical rich text content
function extractPlainText(richText: unknown): string {
  if (!richText || typeof richText !== 'object') return '';

  const root = (richText as { root?: unknown }).root;
  if (!root || typeof root !== 'object') return '';

  const children = (root as { children?: unknown[] }).children;
  if (!Array.isArray(children)) return '';

  const extractText = (nodes: unknown[]): string => {
    return nodes
      .map((node) => {
        if (!node || typeof node !== 'object') return '';
        const n = node as { type?: string; text?: string; children?: unknown[] };
        if (n.type === 'text' && typeof n.text === 'string') {
          return n.text;
        }
        if (Array.isArray(n.children)) {
          return extractText(n.children);
        }
        return '';
      })
      .join(' ');
  };

  return extractText(children);
}

// Get centroid from geometry
function getCentroid(
  geometry: GeoJSON.Geometry | null,
  centroid: [number, number] | null
): [number, number] | null {
  if (centroid && Array.isArray(centroid) && centroid.length === 2) {
    return centroid;
  }

  if (!geometry) return null;

  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates as [number, number];
    case 'LineString': {
      const midIndex = Math.floor(geometry.coordinates.length / 2);
      return geometry.coordinates[midIndex] as [number, number];
    }
    case 'Polygon': {
      const ring = geometry.coordinates[0];
      const avgLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
      const avgLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
      return [avgLng, avgLat];
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const district = searchParams.get('district') || '';
    const startDateFrom = searchParams.get('startDateFrom') || '';
    const startDateTo = searchParams.get('startDateTo') || '';
    const endDateFrom = searchParams.get('endDateFrom') || '';
    const endDateTo = searchParams.get('endDateTo') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const payload = await getPayload({ config });

    // Build Payload where clause
    const where: Where = {
      _status: { equals: 'published' },
    };

    // Filter by construction type
    if (type) {
      where.constructionType = { equals: type };
    }

    // Filter by construction status
    if (status) {
      where.constructionStatus = { equals: status };
    }

    // Filter by district (relationship)
    if (district) {
      where.district = { equals: parseInt(district, 10) };
    }

    // Filter by start date range
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        where.startDate.greater_than_equal = startDateFrom;
      }
      if (startDateTo) {
        where.startDate.less_than_equal = startDateTo;
      }
    }

    // Filter by expected end date range
    if (endDateFrom || endDateTo) {
      where.expectedEndDate = {};
      if (endDateFrom) {
        where.expectedEndDate.greater_than_equal = endDateFrom;
      }
      if (endDateTo) {
        where.expectedEndDate.less_than_equal = endDateTo;
      }
    }

    // Fetch constructions with filters
    const { docs: constructions, totalDocs } = await payload.find({
      collection: 'constructions',
      where,
      limit: query ? 1000 : limit, // Fetch more for text search, then filter client-side
      page: query ? 1 : page,
      depth: 1, // Include district relationship
    });

    // Apply full-text search on title and description if query provided
    let filteredResults = constructions;

    if (query) {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

      filteredResults = constructions.filter((c) => {
        const title = c.title?.toLowerCase() || '';
        const descriptionText = extractPlainText(c.description).toLowerCase();
        const contractor = (c.details as { contractor?: string })?.contractor?.toLowerCase() || '';

        // Check if all search terms appear in title, description, or contractor
        return searchTerms.every(
          (term) =>
            title.includes(term) ||
            descriptionText.includes(term) ||
            contractor.includes(term)
        );
      });

      // Sort by relevance (title matches first, then description)
      filteredResults.sort((a, b) => {
        const aTitle = a.title?.toLowerCase() || '';
        const bTitle = b.title?.toLowerCase() || '';
        const queryLower = query.toLowerCase();

        const aTitleMatch = aTitle.includes(queryLower);
        const bTitleMatch = bTitle.includes(queryLower);

        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        return 0;
      });

      // Apply pagination to filtered results
      const startIndex = (page - 1) * limit;
      filteredResults = filteredResults.slice(startIndex, startIndex + limit);
    }

    // Transform results
    const results = filteredResults.map((c) => {
      const center = getCentroid(
        c.geometry as GeoJSON.Geometry | null,
        c.centroid as [number, number] | null
      );

      // Get district info
      const districtData = c.district as { id: number; name: string; nameEn?: string } | null;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        constructionType: c.constructionType,
        constructionStatus: c.constructionStatus,
        progress: c.progress,
        district: districtData
          ? {
              id: districtData.id,
              name: districtData.name,
              nameEn: districtData.nameEn,
            }
          : null,
        startDate: c.startDate,
        expectedEndDate: c.expectedEndDate,
        center,
        excerpt: extractPlainText(c.description).slice(0, 150),
      };
    });

    // Calculate total for pagination
    const totalPages = Math.ceil(
      (query
        ? constructions.filter((c) => {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
            const title = c.title?.toLowerCase() || '';
            const descriptionText = extractPlainText(c.description).toLowerCase();
            const contractor = (c.details as { contractor?: string })?.contractor?.toLowerCase() || '';
            return searchTerms.every(
              (term) =>
                title.includes(term) ||
                descriptionText.includes(term) ||
                contractor.includes(term)
            );
          }).length
        : totalDocs) / limit
    );

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total: query
          ? constructions.filter((c) => {
              const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
              const title = c.title?.toLowerCase() || '';
              const descriptionText = extractPlainText(c.description).toLowerCase();
              const contractor = (c.details as { contractor?: string })?.contractor?.toLowerCase() || '';
              return searchTerms.every(
                (term) =>
                  title.includes(term) ||
                  descriptionText.includes(term) ||
                  contractor.includes(term)
              );
            }).length
          : totalDocs,
        totalPages: Math.ceil(totalPages),
        hasMore: page < totalPages,
      },
      filters: {
        query,
        type,
        status,
        district,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also create an endpoint to get available filter options
export async function OPTIONS() {
  return NextResponse.json({
    types: [
      { value: 'road', label: 'Công trình đường' },
      { value: 'highway', label: 'Cao tốc' },
      { value: 'metro', label: 'Metro' },
      { value: 'bridge', label: 'Cầu' },
      { value: 'tunnel', label: 'Hầm' },
      { value: 'interchange', label: 'Nút giao' },
      { value: 'station', label: 'Trạm' },
      { value: 'other', label: 'Khác' },
    ],
    statuses: [
      { value: 'planned', label: 'Kế hoạch' },
      { value: 'in-progress', label: 'Đang thi công' },
      { value: 'completed', label: 'Hoàn thành' },
      { value: 'paused', label: 'Tạm dừng' },
      { value: 'cancelled', label: 'Đã hủy' },
    ],
  });
}
