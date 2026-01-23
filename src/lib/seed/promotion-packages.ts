import { getPayload } from 'payload';
import config from '@/payload.config';

/**
 * Seed initial promotion packages
 * Run with: npx ts-node -r tsconfig-paths/register src/lib/seed/promotion-packages.ts
 */
export async function seedPromotionPackages() {
  const payload = await getPayload({ config });

  const packages = [
    {
      name: {
        vi: 'Gói Cơ Bản',
        en: 'Basic Boost',
      },
      slug: 'basic-boost',
      description: {
        vi: 'Tăng khả năng hiển thị cơ bản trong 7 ngày',
        en: 'Basic visibility boost for 7 days',
      },
      durationDays: 7,
      costInCredits: 200000,
      features: {
        priorityBoost: 10,
        showFeaturedBadge: true,
        useCustomMarker: false,
        homepageSpotlight: false,
        searchBoost: 0,
      },
      isActive: true,
      sortOrder: 1,
    },
    {
      name: {
        vi: 'Gói Tiêu Chuẩn',
        en: 'Standard Boost',
      },
      slug: 'standard-boost',
      description: {
        vi: 'Tăng khả năng hiển thị nâng cao trong 14 ngày với marker tùy chỉnh',
        en: 'Enhanced visibility for 14 days with custom marker',
      },
      durationDays: 14,
      costInCredits: 350000,
      features: {
        priorityBoost: 20,
        showFeaturedBadge: true,
        useCustomMarker: true,
        homepageSpotlight: false,
        searchBoost: 5,
      },
      isActive: true,
      sortOrder: 2,
      badge: {
        text: {
          vi: 'Phổ biến nhất',
          en: 'Most Popular',
        },
        color: '#2563eb',
      },
    },
    {
      name: {
        vi: 'Gói Chuyên Nghiệp',
        en: 'Professional',
      },
      slug: 'professional',
      description: {
        vi: 'Tăng khả năng hiển thị toàn diện trong 30 ngày',
        en: 'Comprehensive visibility boost for 30 days',
      },
      durationDays: 30,
      costInCredits: 600000,
      features: {
        priorityBoost: 30,
        showFeaturedBadge: true,
        useCustomMarker: true,
        homepageSpotlight: false,
        searchBoost: 10,
      },
      isActive: true,
      sortOrder: 3,
    },
    {
      name: {
        vi: 'Gói Premium',
        en: 'Premium',
      },
      slug: 'premium',
      description: {
        vi: 'Tất cả tính năng + hiển thị trên trang chủ trong 30 ngày',
        en: 'All features + homepage spotlight for 30 days',
      },
      durationDays: 30,
      costInCredits: 1000000,
      features: {
        priorityBoost: 40,
        showFeaturedBadge: true,
        useCustomMarker: true,
        homepageSpotlight: true,
        searchBoost: 20,
      },
      isActive: true,
      sortOrder: 4,
      badge: {
        text: {
          vi: 'Giá trị tốt nhất',
          en: 'Best Value',
        },
        color: '#10b981',
      },
      autoRenewalDefault: true,
    },
    {
      name: {
        vi: 'Gói Doanh Nghiệp',
        en: 'Enterprise',
      },
      slug: 'enterprise',
      description: {
        vi: 'Ưu tiên tối đa và hiển thị đặc biệt trong 60 ngày',
        en: 'Maximum priority and dedicated placement for 60 days',
      },
      durationDays: 60,
      costInCredits: 1800000,
      features: {
        priorityBoost: 50,
        showFeaturedBadge: true,
        useCustomMarker: true,
        homepageSpotlight: true,
        searchBoost: 30,
      },
      isActive: true,
      sortOrder: 5,
      autoRenewalDefault: true,
    },
  ];

  console.log('Seeding promotion packages...');

  for (const pkg of packages) {
    // Check if package already exists
    const existing = await payload.find({
      collection: 'promotion-packages',
      where: {
        slug: { equals: pkg.slug },
      },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`Package "${pkg.slug}" already exists, updating...`);
      await payload.update({
        collection: 'promotion-packages',
        id: existing.docs[0].id,
        data: pkg,
      });
    } else {
      console.log(`Creating package "${pkg.slug}"...`);
      await payload.create({
        collection: 'promotion-packages',
        data: pkg,
      });
    }
  }

  console.log('Promotion packages seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedPromotionPackages()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
