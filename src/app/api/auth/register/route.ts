import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { isValidEmail, isValidPassword } from '@/lib/auth';
import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  // Check if registration is enabled
  if (!isFeatureEnabled(FEATURE_FLAGS.FEATURE_USER_REGISTRATION)) {
    return NextResponse.json(
      {
        error: 'Feature Disabled',
        message: 'User registration is currently disabled. Please try again later.',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Check if user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email.toLowerCase(),
        },
      },
      limit: 1,
    });

    if (existingUsers.docs.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create user - Payload will automatically send verification email
    // Use overrideAccess to bypass the admin-only create restriction for public registration
    const user = await payload.create({
      collection: 'users',
      data: {
        email: email.toLowerCase(),
        password,
        name: name.trim(),
        role: 'contributor', // Default role
        reputation: 0,
      },
      overrideAccess: true, // Allow public registration
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Payload validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Validation error. Please check your input.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
