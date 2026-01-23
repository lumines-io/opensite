import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * GET /api/sponsor/promotions/packages
 * Get available promotion packages (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config });

    const packages = await payload.find({
      collection: 'promotion-packages',
      where: {
        isActive: { equals: true },
      },
      sort: 'sortOrder',
      limit: 100,
    });

    // Format the response
    const formattedPackages = packages.docs.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      durationDays: pkg.durationDays,
      costInCredits: pkg.costInCredits,
      features: pkg.features,
      badge: pkg.badge,
      autoRenewalDefault: pkg.autoRenewalDefault,
    }));

    return NextResponse.json({
      packages: formattedPackages,
    });
  } catch (error) {
    console.error('Error getting promotion packages:', error);
    return NextResponse.json(
      { error: 'Failed to get promotion packages' },
      { status: 500 }
    );
  }
}
