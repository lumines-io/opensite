import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Verify the email using Payload's built-in verification
    const result = await payload.verifyEmail({
      collection: 'users',
      token,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now access all features.',
    });
  } catch (error) {
    console.error('Email verification error:', error);

    // Handle expired token
    if (error instanceof Error && error.message.includes('expired')) {
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Email verification failed. Please try again or request a new verification email.' },
      { status: 500 }
    );
  }
}
