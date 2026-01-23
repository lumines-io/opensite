import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { withApiHandler } from '@/lib/api-utils';

// Helper to check if location is a valid GeoJSON Point
function isValidPoint(location: unknown): location is GeoJSON.Point {
  if (!location || typeof location !== 'object') return false;
  const loc = location as Record<string, unknown>;
  if (loc.type !== 'Point') return false;
  if (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) return false;
  const [lng, lat] = loc.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
  return true;
}

// GET /api/map/saved-places - Get user's saved places as GeoJSON
export const GET = withApiHandler(async (request: NextRequest) => {
  const payload = await getPayload({ config });

  // Authenticate user
  const authResult = await payload.auth({ headers: request.headers });
  const user = authResult.user;

  if (!user) {
    // Return empty feature collection for unauthenticated users
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
    });
  }

  // Fetch user's saved addresses
  const { docs: addresses } = await payload.find({
    collection: 'addresses',
    where: {
      user: { equals: user.id },
    },
    limit: 500, // Reasonable limit for map display
    depth: 1, // Include addressList data
  });

  // Convert to GeoJSON FeatureCollection
  const features: GeoJSON.Feature[] = [];

  for (const address of addresses) {
    // Validate location
    if (!isValidPoint(address.location)) {
      continue;
    }

    // Get list name
    let listName: string | undefined;
    if (address.addressList) {
      const list = address.addressList as { name?: string } | string | number;
      if (typeof list === 'object' && list !== null && 'name' in list) {
        listName = list.name;
      }
    }

    // Get construction info if linked
    let constructionInfo: { id: number | string; title?: string; slug?: string } | undefined;
    if (address.construction) {
      const construction = address.construction as { id: number | string; title?: string; slug?: string } | string | number;
      if (typeof construction === 'object' && construction !== null) {
        constructionInfo = {
          id: construction.id,
          title: construction.title,
          slug: construction.slug,
        };
      }
    }

    features.push({
      type: 'Feature',
      id: address.id,
      geometry: address.location,
      properties: {
        id: address.id,
        label: address.label,
        addressText: address.addressText,
        note: address.note,
        listId: typeof address.addressList === 'object' ? address.addressList.id : address.addressList,
        listName,
        construction: constructionInfo,
        tags: address.tags?.map((t: { tag?: string }) => t.tag).filter(Boolean) || [],
        createdAt: address.createdAt,
      },
    });
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  return NextResponse.json(geojson);
});
