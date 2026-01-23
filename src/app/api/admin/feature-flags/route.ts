import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  getFeatureFlags,
  getFeatureFlagsByCategory,
  FEATURE_FLAG_METADATA,
  type FeatureFlagValue,
} from '@/lib/feature-flags';
import { logSecurityEvent, getClientInfo } from '@/lib/security-logger';

/**
 * Verify admin authentication using Payload
 * SECURITY: Only admins should access detailed feature flag info
 */
async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });

    if (!user) {
      return { authorized: false };
    }

    // Require admin role for detailed feature flag info
    if (user.role !== 'admin') {
      return { authorized: false };
    }

    return { authorized: true, userId: String(user.id) };
  } catch {
    return { authorized: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication - no public access to detailed flag info
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      logSecurityEvent('api_auth_failure', {
        reason: 'Unauthorized access to feature flags endpoint',
        endpoint: '/api/admin/feature-flags',
        method: 'GET',
        ...getClientInfo(request),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all flags with their current values
    const flagValues = getFeatureFlags();
    const categorizedFlags = getFeatureFlagsByCategory();

    // SECURITY: Build flag data WITHOUT exposing internal routes and components
    const flags = Object.entries(flagValues).map(([key, enabled]) => {
      const metadata = FEATURE_FLAG_METADATA[key as FeatureFlagValue];
      return {
        key,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        impact: metadata.impact,
        enabled,
        // SECURITY: Don't expose affected routes/components to prevent information disclosure
        // affectedRoutes: metadata.affectedRoutes,
        // affectedComponents: metadata.affectedComponents,
      };
    });

    // Build categories with minimal flag data
    const categories = Object.entries(categorizedFlags).reduce(
      (acc, [category, metadataList]) => {
        acc[category] = metadataList.map((metadata) => ({
          key: metadata.key,
          name: metadata.name,
          description: metadata.description,
          category: metadata.category,
          impact: metadata.impact,
          enabled: flagValues[metadata.key],
        }));
        return acc;
      },
      {} as Record<string, typeof flags>
    );

    return NextResponse.json({
      flags,
      categories,
      summary: {
        total: flags.length,
        enabled: flags.filter((f) => f.enabled).length,
        disabled: flags.filter((f) => !f.enabled).length,
        byCategory: {
          core: categorizedFlags.core.length,
          ui: categorizedFlags.ui.length,
          ops: categorizedFlags.ops.length,
          external: categorizedFlags.external.length,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}
