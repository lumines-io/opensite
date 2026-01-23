import 'dotenv/config';
import { getPayload } from 'payload';
import config from '@payload-config';

// Helper to create rich text description
const createDescription = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text }],
      },
    ],
  },
});

// ============================================
// DEVELOPMENTS (Private/Sponsor projects)
// ============================================
// Note: These require organizations to exist first.
// Run seed:accounts first to create organizations.
interface DevelopmentData {
  slug: string;
  title: string;
  organizationSlug: string;
  developmentType: 'residential' | 'commercial' | 'office' | 'mixed_use' | 'industrial' | 'hospitality' | 'retail' | 'healthcare' | 'educational' | 'other';
  approvalStatus: 'draft' | 'internal_review' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'rejected' | 'published';
  developmentStatus: 'announced' | 'planning' | 'in-progress' | 'paused' | 'completed';
  progress: number;
  coordinates: [number, number];
  description: string;
  headline: string;
  priceMin?: number;
  priceMax?: number;
  pricePerSqm?: number;
  displayPrice?: string;
}

const developments: DevelopmentData[] = [
  // Vinhomes projects (different workflow statuses)
  {
    slug: 'vinhomes-grand-park-q9',
    title: 'Vinhomes Grand Park - Phase 2',
    organizationSlug: 'vinhomes',
    developmentType: 'residential',
    approvalStatus: 'draft',
    developmentStatus: 'in-progress',
    progress: 45,
    coordinates: [106.8456, 10.8234],
    description: 'Vinhomes Grand Park Phase 2 is a premium residential development in Thu Duc City, featuring modern apartments with world-class amenities.',
    headline: 'Live the Dream at Vinhomes Grand Park',
    priceMin: 2500000000,
    priceMax: 8000000000,
    pricePerSqm: 65000000,
    displayPrice: 'From 2.5 billion VND',
  },
  {
    slug: 'vinhomes-central-park-tower',
    title: 'Vinhomes Central Park - Landmark Tower',
    organizationSlug: 'vinhomes',
    developmentType: 'mixed_use',
    approvalStatus: 'published', // Visible on map
    developmentStatus: 'in-progress',
    progress: 78,
    coordinates: [106.7219, 10.7945],
    description: 'Iconic 81-story tower in Binh Thanh District, the tallest building in Vietnam featuring luxury residences, Grade A offices, and 6-star hotel.',
    headline: 'The Landmark of Saigon',
    priceMin: 5000000000,
    priceMax: 50000000000,
    pricePerSqm: 120000000,
    displayPrice: 'From 5 billion VND',
  },
  {
    slug: 'vinhomes-ocean-park-3',
    title: 'Vinhomes Ocean Park 3 - The Crown',
    organizationSlug: 'vinhomes',
    developmentType: 'residential',
    approvalStatus: 'published', // Visible on map
    developmentStatus: 'planning',
    progress: 15,
    coordinates: [106.0234, 21.0156],
    description: 'The latest phase of Ocean Park mega township in Hung Yen, featuring coastal living with artificial beach and extensive amenities.',
    headline: 'Seaside Living in the Heart of the North',
    priceMin: 1800000000,
    priceMax: 5000000000,
    pricePerSqm: 45000000,
    displayPrice: 'From 1.8 billion VND',
  },
  {
    slug: 'vinhomes-smart-city-phase-2',
    title: 'Vinhomes Smart City - Phase 2',
    organizationSlug: 'vinhomes',
    developmentType: 'residential',
    approvalStatus: 'submitted',
    developmentStatus: 'announced',
    progress: 0,
    coordinates: [105.7456, 21.0123],
    description: 'Expansion of the smart city concept in Tay Mo - Dai Mo area with AI-integrated smart homes and sustainable urban design.',
    headline: 'The Future of Urban Living',
    priceMin: 2200000000,
    priceMax: 6000000000,
    pricePerSqm: 55000000,
    displayPrice: 'From 2.2 billion VND',
  },

  // Novaland projects
  {
    slug: 'novaland-aqua-city',
    title: 'Aqua City - Phoenix Island',
    organizationSlug: 'novaland',
    developmentType: 'residential',
    approvalStatus: 'published', // Visible on map
    developmentStatus: 'in-progress',
    progress: 62,
    coordinates: [106.9123, 10.8567],
    description: 'Eco-friendly township in Dong Nai featuring riverfront villas and modern townhouses with integrated smart city infrastructure.',
    headline: 'Where Rivers Meet Dreams',
    priceMin: 6000000000,
    priceMax: 25000000000,
    pricePerSqm: 85000000,
    displayPrice: 'From 6 billion VND',
  },
  {
    slug: 'novaland-the-grand-manhattan',
    title: 'The Grand Manhattan',
    organizationSlug: 'novaland',
    developmentType: 'commercial',
    approvalStatus: 'published', // Visible on map
    developmentStatus: 'completed',
    progress: 100,
    coordinates: [106.6892, 10.7723],
    description: 'Luxury mixed-use development in District 1 featuring premium apartments, boutique retail, and fine dining establishments.',
    headline: 'Manhattan Style Living in Saigon',
    priceMin: 8000000000,
    priceMax: 30000000000,
    pricePerSqm: 150000000,
    displayPrice: 'From 8 billion VND',
  },
  {
    slug: 'novaland-novaworld-phan-thiet',
    title: 'NovaWorld Phan Thiet - Festival Town',
    organizationSlug: 'novaland',
    developmentType: 'hospitality',
    approvalStatus: 'approved',
    developmentStatus: 'in-progress',
    progress: 55,
    coordinates: [108.2567, 10.8934],
    description: 'Entertainment and resort complex featuring theme parks, golf courses, and beachfront properties in Binh Thuan Province.',
    headline: "Vietnam's Premier Entertainment Destination",
    priceMin: 3500000000,
    priceMax: 15000000000,
    pricePerSqm: 75000000,
    displayPrice: 'From 3.5 billion VND',
  },
  {
    slug: 'novaland-victoria-village',
    title: 'Victoria Village - District 2',
    organizationSlug: 'novaland',
    developmentType: 'residential',
    approvalStatus: 'under_review',
    developmentStatus: 'planning',
    progress: 10,
    coordinates: [106.7534, 10.7845],
    description: 'Premium low-rise development in An Phu area featuring garden villas and townhouses with riverside views.',
    headline: 'Exclusive Riverside Living',
    priceMin: 12000000000,
    priceMax: 45000000000,
    pricePerSqm: 180000000,
    displayPrice: 'From 12 billion VND',
  },
];

const seedDevelopments = async () => {
  const payload = await getPayload({ config });

  // Check for --clear flag
  const shouldClear = process.argv.includes('--clear');

  console.log('🏢 Seeding private developments (sponsor projects)...\n');

  if (shouldClear) {
    console.log('🗑️  --clear flag detected. Removing all existing development data...');
    const existing = await payload.find({
      collection: 'developments',
      limit: 1000,
    });

    let deleted = 0;
    for (const doc of existing.docs) {
      await payload.delete({
        collection: 'developments',
        id: doc.id,
        overrideAccess: true,
      });
      deleted++;
    }
    console.log(`🗑️  Deleted ${deleted} existing records\n`);
  }

  console.log('='.repeat(60));

  // First, look up organization IDs
  const organizationIds: Record<string, string> = {};
  const orgSlugs = [...new Set(developments.map((d) => d.organizationSlug))];

  for (const slug of orgSlugs) {
    const org = await payload.find({
      collection: 'organizations',
      where: { slug: { equals: slug } },
      limit: 1,
    });

    if (org.docs.length > 0) {
      organizationIds[slug] = String(org.docs[0].id);
      console.log(`   Found organization: ${slug} (ID: ${organizationIds[slug]})`);
    } else {
      console.log(`   ⚠️  Organization not found: ${slug} - run seed:accounts first`);
    }
  }

  console.log('');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const development of developments) {
    const organizationId = organizationIds[development.organizationSlug];

    if (!organizationId) {
      console.log(`⏭️  Skipped: ${development.title} (organization not found)`);
      skipped++;
      continue;
    }

    // Check if development already exists
    const existing = await payload.find({
      collection: 'developments',
      where: { slug: { equals: development.slug } },
      limit: 1,
    });

    const developmentData = {
      title: development.title,
      slug: development.slug,
      developmentType: development.developmentType,
      organization: organizationId,
      approvalStatus: development.approvalStatus,
      developmentStatus: development.developmentStatus,
      progress: development.progress,
      description: createDescription(development.description),
      geometry: {
        type: 'Point' as const,
        coordinates: development.coordinates,
      },
      centroid: development.coordinates,
      announcedDate: '2023-01-15',
      launchDate: development.progress > 0 ? '2023-06-01' : undefined,
      expectedCompletion: '2026-12-31',
      marketing: {
        headline: development.headline,
        keyFeatures: [
          { feature: 'Premium location', icon: 'location' as const },
          { feature: 'World-class amenities', icon: 'amenities' as const },
          { feature: 'Smart home technology', icon: 'security' as const },
          { feature: 'Green living spaces', icon: 'garden' as const },
        ],
        priceRange: development.priceMin
          ? {
              min: development.priceMin,
              max: development.priceMax,
              pricePerSqm: development.pricePerSqm,
              displayText: development.displayPrice,
            }
          : undefined,
      },
      cta: {
        primaryButton: {
          text: 'Contact Sales',
          action: 'phone' as const,
        },
        contactPhone: development.organizationSlug === 'vinhomes' ? '1800 1234' : '028 3636 5555',
        contactEmail: `sales@${development.organizationSlug}.test`,
        salesOffice: `${development.organizationSlug === 'vinhomes' ? 'Vinhomes' : 'Novaland'} Sales Gallery`,
      },
      displayOptions: {
        featured: development.approvalStatus === 'published',
        priority: development.approvalStatus === 'published' ? 10 : 0,
        showSponsoredBadge: true,
        useCustomMarker: development.approvalStatus === 'published',
      },
      _status: development.approvalStatus === 'published' ? ('published' as const) : ('draft' as const),
    };

    if (existing.docs.length > 0) {
      try {
        await payload.update({
          collection: 'developments',
          id: existing.docs[0].id,
          overrideAccess: true,
          data: developmentData,
        });
        console.log(`🔄 Updated: ${development.title} (${development.approvalStatus})`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${development.title}:`, error);
      }
    } else {
      try {
        await payload.create({
          collection: 'developments',
          overrideAccess: true,
          data: developmentData,
        });
        console.log(`✅ Created: ${development.title} (${development.approvalStatus})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${development.title}:`, error);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📍 Total: ${developments.length}`);
  console.log('\n🎉 Development data seeding complete!');

  process.exit(0);
};

seedDevelopments().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
