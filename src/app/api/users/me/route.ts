import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config });

    // Get current user from auth
    const { user } = await payload.auth({ headers: request.headers as unknown as Headers });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        reputation: user.reputation,
      },
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
