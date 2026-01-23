import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { isValidEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Use Payload's built-in forgotPassword method
    // This will send an email with a reset token if the user exists
    // Note: Payload doesn't reveal if the email exists for security reasons
    try {
      await payload.forgotPassword({
        collection: 'users',
        data: {
          email: email.toLowerCase(),
        },
      });
    } catch {
      // Silently fail - don't reveal if email exists or not
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
