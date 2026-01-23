import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Media } from '@/payload-types';

// Helper to safely extract user data
function extractUserResponse(user: unknown) {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  const avatar = u.avatar;
  let avatarUrl: string | null = null;

  if (avatar && typeof avatar === 'object') {
    avatarUrl = (avatar as Media).url || null;
  }

  return {
    id: String(u.id || ''),
    email: String(u.email || ''),
    name: String(u.name || ''),
    role: String(u.role || 'contributor'),
    _verified: Boolean(u._verified),
    reputation: Number(u.reputation) || 0,
    bio: u.bio as string | null | undefined,
    avatar: avatarUrl,
    createdAt: u.createdAt as string | undefined,
    updatedAt: u.updatedAt as string | undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('payload-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await getPayload({ config });

    const { user } = await payload.auth({
      headers: new Headers({ Cookie: `payload-token=${token}` }),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userData = extractUserResponse(user);

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('payload-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await getPayload({ config });

    const { user } = await payload.auth({
      headers: new Headers({ Cookie: `payload-token=${token}` }),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, bio } = body;

    // Only allow updating name and bio through this endpoint
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Name must be at least 2 characters long' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updatedUser = await payload.update({
      collection: 'users',
      id: String(user.id),
      data: updateData,
    });

    const userData = extractUserResponse(updatedUser);

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
