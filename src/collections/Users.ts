import type { CollectionConfig } from 'payload';
import { logAuthEvent } from '@/lib/logger';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: {
    verify: {
      generateEmailHTML: ({ token, user }) => {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
        return `
          <h1>Verify your email</h1>
          <p>Hello ${user.name || 'there'},</p>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verifyUrl}">${verifyUrl}</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `;
      },
      generateEmailSubject: () => 'OpenSite - Verify your email',
    },
    forgotPassword: {
      generateEmailHTML: (args) => {
        const token = args?.token;
        const user = args?.user;
        const resetUrl = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        return `
          <h1>Reset your password</h1>
          <p>Hello ${user?.name || user?.email || 'there'},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        `;
      },
      generateEmailSubject: () => 'OpenSite - Reset your password',
    },
    tokenExpiration: 7200, // 2 hours in seconds
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      domain: undefined,
    },
  },
  access: {
    // Anyone can read their own user data
    read: ({ req }) => {
      if (!req.user) return false;
      if (['admin', 'moderator'].includes(req.user.role as string)) return true;
      return {
        id: {
          equals: req.user.id,
        },
      };
    },
    // Only admins can create users via admin panel; public registration is via API
    create: ({ req }) => req.user?.role === 'admin',
    // Users can update their own profile, admins can update anyone
    update: ({ req }) => {
      if (!req.user) return false;
      if (req.user.role === 'admin') return true;
      return {
        id: {
          equals: req.user.id,
        },
      };
    },
    // Only admins can delete users
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'contributor',
      options: [
        { label: 'Contributor', value: 'contributor' },
        { label: 'Sponsor User', value: 'sponsor_user' },
        { label: 'Sponsor Admin', value: 'sponsor_admin' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        // Only admins can change roles
        update: ({ req }) => req.user?.role === 'admin',
      },
      admin: {
        position: 'sidebar',
      },
    },
    // Organization relationship (for sponsor roles)
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        position: 'sidebar',
        condition: (data) =>
          ['sponsor_user', 'sponsor_admin'].includes(data?.role as string),
        description: 'Organization this user belongs to (required for sponsor roles)',
      },
    },
    {
      name: 'reputation',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        description: 'A short bio about yourself',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Profile picture',
      },
    },
    // Email verification status is handled automatically by Payload when auth.verify is enabled
    // The _verified field is added automatically
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Prevent non-admins from changing their own role
        if (operation === 'update' && req.user && req.user.role !== 'admin') {
          if (data.role && data.role !== req.user.role) {
            delete data.role;
          }
        }
        return data;
      },
    ],
    afterLogin: [
      async ({ user, req }) => {
        const ip = req.headers.get?.('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get?.('x-real-ip')
          || 'unknown';
        const userAgent = req.headers.get?.('user-agent') || 'unknown';

        logAuthEvent({
          event: 'login',
          userId: user.id.toString(),
          email: user.email,
          ip,
          userAgent,
          success: true,
        });
      },
    ],
    afterLogout: [
      async ({ req }) => {
        const ip = req.headers.get?.('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get?.('x-real-ip')
          || 'unknown';

        logAuthEvent({
          event: 'logout',
          userId: req.user?.id?.toString(),
          email: req.user?.email,
          ip,
          success: true,
        });
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          logAuthEvent({
            event: 'register',
            userId: doc.id.toString(),
            email: doc.email,
            success: true,
          });
        }
      },
    ],
  },
};
