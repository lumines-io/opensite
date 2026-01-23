/**
 * Seed script for creating test accounts for the Sponsor/Developer experience.
 *
 * This script creates:
 * - 1 Admin user
 * - 1 Moderator user
 * - 2 Organizations (Vinhomes and Novaland for sponsor testing)
 * - 2 Sponsor Admin users (one per organization)
 * - 2 Sponsor User users (one per organization)
 * - 2 Contributor users
 *
 * All accounts use the password: test123
 *
 * Note: Private constructions are now seeded via seed-hcmc-constructions.ts
 * Run this script first to create organizations, then run seed:hcmc to create constructions.
 *
 * Usage:
 *   npx tsx src/seed-test-accounts.ts
 *
 * Or add to package.json scripts:
 *   "seed:accounts": "tsx src/seed-test-accounts.ts"
 */

import 'dotenv/config';
import { getPayload } from 'payload';
import config from '@payload-config';

const TEST_PASSWORD = 'test123';

interface TestUser {
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'sponsor_admin' | 'sponsor_user' | 'contributor';
  organization?: string; // Organization slug for sponsor roles
  bio?: string;
}

interface TestOrganization {
  name: string;
  slug: string;
  description: string;
  businessType: 'developer' | 'construction' | 'investment' | 'property_management' | 'other';
  tier: 'basic' | 'professional' | 'enterprise';
  status: 'pending' | 'active' | 'suspended';
  contactInfo: {
    email: string;
    phone?: string;
    website?: string;
    address?: string;
  };
}

// Test organizations
const testOrganizations: TestOrganization[] = [
  {
    name: 'Vinhomes Development',
    slug: 'vinhomes',
    description: 'Leading real estate developer in Vietnam',
    businessType: 'developer',
    tier: 'enterprise',
    status: 'active',
    contactInfo: {
      email: 'contact@vinhomes.test',
      phone: '1900 232 389',
      website: 'https://vinhomes.test',
      address: 'No. 7, Bang Lang 1 Street, Vinhomes Riverside, Long Bien, Hanoi',
    },
  },
  {
    name: 'Novaland Group',
    slug: 'novaland',
    description: 'Premium residential and commercial developer',
    businessType: 'developer',
    tier: 'professional',
    status: 'active',
    contactInfo: {
      email: 'contact@novaland.test',
      phone: '028 3636 5555',
      website: 'https://novaland.test',
      address: '65 Nguyen Du Street, Ben Nghe Ward, District 1, Ho Chi Minh City',
    },
  },
];

// Test users
const testUsers: TestUser[] = [
  // Admin
  {
    email: 'admin@test.local',
    name: 'Admin User',
    role: 'admin',
    bio: 'Platform administrator with full access.',
  },

  // Moderator
  {
    email: 'moderator@test.local',
    name: 'Moderator User',
    role: 'moderator',
    bio: 'Content moderator responsible for reviewing submissions.',
  },

  // Sponsor Admins (one per organization)
  {
    email: 'sponsor-admin@vinhomes.test',
    name: 'Vinhomes Admin',
    role: 'sponsor_admin',
    organization: 'vinhomes',
    bio: 'Vinhomes organization administrator.',
  },
  {
    email: 'sponsor-admin@novaland.test',
    name: 'Novaland Admin',
    role: 'sponsor_admin',
    organization: 'novaland',
    bio: 'Novaland organization administrator.',
  },

  // Sponsor Users (one per organization)
  {
    email: 'sponsor-user@vinhomes.test',
    name: 'Vinhomes Staff',
    role: 'sponsor_user',
    organization: 'vinhomes',
    bio: 'Vinhomes team member for content management.',
  },
  {
    email: 'sponsor-user@novaland.test',
    name: 'Novaland Staff',
    role: 'sponsor_user',
    organization: 'novaland',
    bio: 'Novaland team member for content management.',
  },

  // Contributors (regular public users)
  {
    email: 'contributor1@test.local',
    name: 'Nguyen Van A',
    role: 'contributor',
    bio: 'Community contributor interested in urban development.',
  },
  {
    email: 'contributor2@test.local',
    name: 'Tran Thi B',
    role: 'contributor',
    bio: 'Local resident tracking neighborhood construction.',
  },
];

async function seedTestAccounts() {
  console.log('='.repeat(60));
  console.log('SEED TEST ACCOUNTS');
  console.log('='.repeat(60));
  console.log('');

  const payload = await getPayload({ config });

  // Store organization IDs for later use
  const organizationIds: Record<string, string> = {};

  // ============================================
  // STEP 1: Create Organizations
  // ============================================
  console.log('STEP 1: Creating Organizations');
  console.log('-'.repeat(40));

  for (const org of testOrganizations) {
    // Check if organization already exists
    const existing = await payload.find({
      collection: 'organizations',
      where: { slug: { equals: org.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  [EXISTS] ${org.name} (${org.slug})`);
      organizationIds[org.slug] = String(existing.docs[0].id);
    } else {
      const created = await payload.create({
        collection: 'organizations',
        overrideAccess: true,
        data: {
          name: org.name,
          slug: org.slug,
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', text: org.description }],
                },
              ],
            },
          },
          businessType: org.businessType,
          tier: org.tier,
          status: org.status,
          contactInfo: org.contactInfo,
          brandColor: org.slug === 'vinhomes' ? '#0066CC' : '#FF6600',
          limits: {
            maxUsers: org.tier === 'enterprise' ? 50 : org.tier === 'professional' ? 20 : 5,
            maxActiveProjects: org.tier === 'enterprise' ? 100 : org.tier === 'professional' ? 50 : 10,
            canUsePriorityPlacement: org.tier !== 'basic',
            canUseCustomBranding: org.tier !== 'basic',
            canUseLeadCapture: org.tier === 'enterprise',
          },
        },
      });
      organizationIds[org.slug] = String(created.id);
      console.log(`  [CREATED] ${org.name} (${org.slug})`);
    }
  }

  console.log('');

  // ============================================
  // STEP 2: Create Users
  // ============================================
  console.log('STEP 2: Creating Test Users');
  console.log('-'.repeat(40));

  const createdUsers: Array<{ email: string; role: string; organization?: string }> = [];

  for (const user of testUsers) {
    // Check if user already exists
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  [EXISTS] ${user.email} (${user.role})`);
      createdUsers.push({
        email: user.email,
        role: user.role,
        organization: user.organization,
      });
    } else {
      // Determine organization ID for sponsor roles
      let organizationId: string | undefined;
      if (user.organization && organizationIds[user.organization]) {
        organizationId = organizationIds[user.organization];
      }

      // Create user
      const created = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: user.email,
          password: TEST_PASSWORD,
          name: user.name,
          role: user.role,
          bio: user.bio,
          reputation: user.role === 'admin' ? 1000 : user.role === 'moderator' ? 500 : 0,
          organization: organizationId,
        },
      });

      // Mark user as verified
      await payload.update({
        collection: 'users',
        id: created.id,
        overrideAccess: true,
        data: { _verified: true },
      });

      console.log(`  [CREATED] ${user.email} (${user.role})`);
      createdUsers.push({
        email: user.email,
        role: user.role,
        organization: user.organization,
      });
    }
  }

  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Password for all accounts: ${TEST_PASSWORD}`);
  console.log('');
  console.log('Test Accounts:');
  console.log('-'.repeat(40));

  // Group by role for display
  const roleGroups: Record<string, typeof createdUsers> = {};
  for (const u of createdUsers) {
    if (!roleGroups[u.role]) roleGroups[u.role] = [];
    roleGroups[u.role].push(u);
  }

  const roleOrder = ['admin', 'moderator', 'sponsor_admin', 'sponsor_user', 'contributor'];
  for (const role of roleOrder) {
    if (roleGroups[role]) {
      console.log(`\n${role.toUpperCase()}:`);
      for (const u of roleGroups[role]) {
        const orgInfo = u.organization ? ` (org: ${u.organization})` : '';
        console.log(`  - ${u.email}${orgInfo}`);
      }
    }
  }

  console.log('');
  console.log('Organizations:');
  console.log('-'.repeat(40));
  for (const org of testOrganizations) {
    console.log(`  - ${org.name} (${org.slug}) - ${org.tier} tier`);
  }

  console.log('');
  console.log('Note: Run seed:hcmc to create private constructions for these organizations.');

  console.log('');
  console.log('='.repeat(60));
  console.log('Seed complete!');
  console.log('='.repeat(60));

  process.exit(0);
}

seedTestAccounts().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
