/**
 * Geocoding service for converting location text to coordinates
 * Uses Mapbox Geocoding API (same as the map display)
 */

// HCMC bounding box for geocoding
const HCMC_BBOX: [number, number, number, number] = [106.3, 10.3, 107.1, 11.2];

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, [number, number] | null>();

// Known district coordinates (fallback when API fails)
const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  'Quận 1': [106.6953, 10.7769],
  'Quận 3': [106.6844, 10.7834],
  'Quận 4': [106.7015, 10.7574],
  'Quận 5': [106.6631, 10.7548],
  'Quận 6': [106.6350, 10.7482],
  'Quận 7': [106.7361, 10.7343],
  'Quận 8': [106.6283, 10.7220],
  'Quận 10': [106.6626, 10.7731],
  'Quận 11': [106.6503, 10.7659],
  'Quận 12': [106.6542, 10.8671],
  'Bình Thạnh': [106.7113, 10.8115],
  'Gò Vấp': [106.6547, 10.8387],
  'Phú Nhuận': [106.6808, 10.7999],
  'Tân Bình': [106.6478, 10.8024],
  'Tân Phú': [106.6279, 10.7909],
  'Thủ Đức': [106.7614, 10.8579],
  'Bình Tân': [106.5892, 10.7657],
  'Củ Chi': [106.4930, 10.9739],
  'Hóc Môn': [106.5856, 10.8866],
  'Bình Chánh': [106.5422, 10.6836],
  'Nhà Bè': [106.7004, 10.6625],
  'Cần Giờ': [106.9549, 10.4113],
  // Abbreviations
  'Q1': [106.6953, 10.7769],
  'Q3': [106.6844, 10.7834],
  'Q4': [106.7015, 10.7574],
  'Q5': [106.6631, 10.7548],
  'Q6': [106.6350, 10.7482],
  'Q7': [106.7361, 10.7343],
  'Q8': [106.6283, 10.7220],
  'Q10': [106.6626, 10.7731],
  'Q11': [106.6503, 10.7659],
  'Q12': [106.6542, 10.8671],
};

/**
 * Geocode a location string to coordinates
 * Uses Mapbox Geocoding API with fallback to known districts
 */
export async function geocodeLocation(
  location: string,
  city: string = 'Ho Chi Minh City'
): Promise<[number, number] | null> {
  const cacheKey = `${location}|${city}`.toLowerCase();

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Check known district coordinates
  const normalizedLocation = location.trim();
  if (DISTRICT_COORDINATES[normalizedLocation]) {
    const coords = DISTRICT_COORDINATES[normalizedLocation];
    geocodeCache.set(cacheKey, coords);
    return coords;
  }

  // Try Mapbox Geocoding API
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    console.warn('Mapbox token not configured, using fallback coordinates');
    geocodeCache.set(cacheKey, null);
    return null;
  }

  try {
    const query = encodeURIComponent(`${location}, ${city}, Vietnam`);
    const bbox = HCMC_BBOX.join(',');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&bbox=${bbox}&limit=1&types=address,poi,locality,neighborhood`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;

      // Validate coordinates are within HCMC bounds
      if (isWithinBounds(lng, lat)) {
        const coords: [number, number] = [lng, lat];
        geocodeCache.set(cacheKey, coords);
        return coords;
      }
    }

    geocodeCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Check if coordinates are within HCMC bounds
 */
function isWithinBounds(lng: number, lat: number): boolean {
  return (
    lng >= HCMC_BBOX[0] &&
    lng <= HCMC_BBOX[2] &&
    lat >= HCMC_BBOX[1] &&
    lat <= HCMC_BBOX[3]
  );
}

/**
 * Batch geocode multiple locations
 */
export async function batchGeocodeLocations(
  locations: string[],
  city: string = 'Ho Chi Minh City'
): Promise<Map<string, [number, number] | null>> {
  const results = new Map<string, [number, number] | null>();

  // Process with rate limiting
  for (const location of locations) {
    const coords = await geocodeLocation(location, city);
    results.set(location, coords);

    // Rate limit: 600 requests per minute for free tier
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Extract and geocode all locations from text
 */
export async function extractAndGeocodeLocations(
  text: string
): Promise<Array<{ location: string; coordinates: [number, number] | null }>> {
  const locations: Array<{ location: string; coordinates: [number, number] | null }> = [];

  // Find district mentions
  for (const [district, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (text.toLowerCase().includes(district.toLowerCase())) {
      locations.push({ location: district, coordinates: coords });
    }
  }

  // Find street names
  const streetPattern = /đường\s+([A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\w\s]+?)(?:,|\s+(?:quận|phường|Q\d))/gi;
  let match;
  while ((match = streetPattern.exec(text)) !== null) {
    const streetName = match[1].trim();
    if (streetName.length > 2 && streetName.length < 50) {
      const coords = await geocodeLocation(`đường ${streetName}`);
      locations.push({ location: `đường ${streetName}`, coordinates: coords });
    }
  }

  return locations;
}

/**
 * Get coordinates for a district by name
 */
export function getDistrictCoordinates(district: string): [number, number] | null {
  return DISTRICT_COORDINATES[district] || null;
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
