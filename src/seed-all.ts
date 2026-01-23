/**
 * Unified seed script that creates all test data:
 * - Organizations (Vinhomes and Novaland)
 * - Users (admin, moderator, sponsor admins, sponsor users, contributors)
 * - HCMC Constructions (public infrastructure projects)
 * - Developments (private/sponsor projects)
 *
 * All test accounts use the password: test123
 *
 * Usage:
 *   npx tsx src/seed-all.ts          # Seed all data (upsert mode)
 *   npx tsx src/seed-all.ts --clear  # Clear existing data first, then seed
 *
 * Or via package.json scripts:
 *   npm run seed         # Seed all data
 *   npm run seed:clear   # Clear and seed
 */

import 'dotenv/config';
import { getPayload } from 'payload';
import config from '@payload-config';

// ============================================
// HELPER FUNCTIONS
// ============================================

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
// TEST DATA: ORGANIZATIONS
// ============================================

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

// ============================================
// TEST DATA: USERS
// ============================================

const TEST_PASSWORD = 'test123';

interface TestUser {
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'sponsor_admin' | 'sponsor_user' | 'contributor';
  organization?: string;
  bio?: string;
}

const testUsers: TestUser[] = [
  {
    email: 'admin@test.local',
    name: 'Admin User',
    role: 'admin',
    bio: 'Platform administrator with full access.',
  },
  {
    email: 'moderator@test.local',
    name: 'Moderator User',
    role: 'moderator',
    bio: 'Content moderator responsible for reviewing submissions.',
  },
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

// ============================================
// TEST DATA: DEVELOPMENTS (Private/Sponsor)
// ============================================

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
  // Vinhomes projects
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
    approvalStatus: 'published',
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
    approvalStatus: 'published',
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
    approvalStatus: 'published',
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
    approvalStatus: 'published',
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

// ============================================
// TEST DATA: HCMC CONSTRUCTIONS (Public)
// ============================================

const hcmcConstructions = [
  // METRO LINES
  {
    title: 'Tuyến Metro số 1 (Bến Thành - Suối Tiên)',
    slug: 'metro-line-1-ben-thanh-suoi-tien',
    description: createDescription(
      'Tuyến metro số 1 TP.HCM là tuyến đường sắt đô thị đầu tiên của Việt Nam, chạy từ ga Bến Thành (Quận 1) đến depot Suối Tiên (TP. Thủ Đức). Tổng chiều dài 19.7 km với 14 nhà ga, trong đó có 3 ga ngầm và 11 ga trên cao. Dự án sử dụng công nghệ đường sắt Nhật Bản, được tài trợ bởi JICA và chính thức khai trương vào ngày 22/12/2024.'
    ),
    constructionType: 'metro' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.6981, 10.7731],
        [106.7025, 10.7765],
        [106.7089, 10.7836],
        [106.7178, 10.7925],
        [106.7267, 10.8014],
        [106.7456, 10.8089],
        [106.7623, 10.8178],
        [106.7834, 10.8267],
        [106.8012, 10.8356],
        [106.8189, 10.8445],
        [106.8378, 10.8534],
        [106.8567, 10.8623],
        [106.8756, 10.8712],
        [106.9012, 10.8834],
      ],
    },
    centroid: [106.7834, 10.8267],
    announcedDate: '2007-11-21',
    startDate: '2012-08-28',
    expectedEndDate: '2024-12-22',
    actualEndDate: '2024-12-22',
    details: {
      budget: 43757000000000,
      fundingSource: 'Vốn ODA Nhật Bản (JICA) và ngân sách TP.HCM',
      contractor: 'Liên danh Sumitomo Corporation - CIENCO 6',
    },
    metroStations: [
      { name: 'Bến Thành', nameEn: 'Ben Thanh', stationOrder: 1, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.6981, 10.7731] }, openedAt: '2024-12-22' },
      { name: 'Nhà hát Thành phố', nameEn: 'Opera House', stationOrder: 2, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7025, 10.7765] }, openedAt: '2024-12-22' },
      { name: 'Ba Son', nameEn: 'Ba Son', stationOrder: 3, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7089, 10.7836] }, openedAt: '2024-12-22' },
      { name: 'Văn Thánh', nameEn: 'Van Thanh', stationOrder: 4, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7178, 10.7925] }, openedAt: '2024-12-22' },
      { name: 'Tân Cảng', nameEn: 'Tan Cang', stationOrder: 5, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7267, 10.8014] }, openedAt: '2024-12-22' },
      { name: 'Thảo Điền', nameEn: 'Thao Dien', stationOrder: 6, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7456, 10.8089] }, openedAt: '2024-12-22' },
      { name: 'An Phú', nameEn: 'An Phu', stationOrder: 7, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7623, 10.8178] }, openedAt: '2024-12-22' },
      { name: 'Rạch Chiếc', nameEn: 'Rach Chiec', stationOrder: 8, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7834, 10.8267] }, openedAt: '2024-12-22' },
      { name: 'Phước Long', nameEn: 'Phuoc Long', stationOrder: 9, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8012, 10.8356] }, openedAt: '2024-12-22' },
      { name: 'Bình Thái', nameEn: 'Binh Thai', stationOrder: 10, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8189, 10.8445] }, openedAt: '2024-12-22' },
      { name: 'Thủ Đức', nameEn: 'Thu Duc', stationOrder: 11, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8378, 10.8534] }, openedAt: '2024-12-22' },
      { name: 'Khu Công Nghệ Cao', nameEn: 'High-Tech Park', stationOrder: 12, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8567, 10.8623] }, openedAt: '2024-12-22' },
      { name: 'Đại học Quốc gia', nameEn: 'National University', stationOrder: 13, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8756, 10.8712] }, openedAt: '2024-12-22' },
      { name: 'Suối Tiên', nameEn: 'Suoi Tien', stationOrder: 14, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.9012, 10.8834] }, openedAt: '2024-12-22' },
    ],
    sources: [{ url: 'https://maur.hochiminhcity.gov.vn/', title: 'Ban Quản lý Đường sắt Đô thị TP.HCM (MAUR)', publishedAt: '2024-12-22' }],
  },
  {
    title: 'Tuyến Metro số 2 (Bến Thành - Tham Lương)',
    slug: 'metro-line-2-ben-thanh-tham-luong',
    description: createDescription(
      'Tuyến metro số 2 chạy từ ga Bến Thành qua các quận trung tâm đến Tham Lương (Quận 12). Tổng chiều dài 11.3 km với 10 nhà ga ngầm. Dự án được tài trợ bởi KfW (Đức), ADB và EIB. Đây là tuyến metro ngầm hoàn toàn đầu tiên của Việt Nam.'
    ),
    constructionType: 'metro' as const,
    constructionStatus: 'in-progress' as const,
    progress: 15,
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.6981, 10.7731],
        [106.6889, 10.7756],
        [106.6734, 10.7812],
        [106.6623, 10.7889],
        [106.6567, 10.7978],
        [106.6512, 10.8089],
        [106.6478, 10.8212],
        [106.6423, 10.8334],
        [106.6389, 10.8467],
        [106.6345, 10.8623],
      ],
    },
    centroid: [106.6567, 10.8089],
    announcedDate: '2010-03-15',
    startDate: '2022-09-26',
    expectedEndDate: '2030-12-31',
    details: {
      budget: 30000000000000,
      fundingSource: 'Vốn ODA Đức (KfW), ADB, EIB và ngân sách TP.HCM',
      contractor: 'Liên danh GS Engineering & Construction - Hyundai',
    },
    metroStations: [
      { name: 'Bến Thành', nameEn: 'Ben Thanh', stationOrder: 1, stationStatus: 'in-progress', stationProgress: 20, location: { type: 'Point', coordinates: [106.6981, 10.7731] } },
      { name: 'Tao Đàn', nameEn: 'Tao Dan', stationOrder: 2, stationStatus: 'in-progress', stationProgress: 15, location: { type: 'Point', coordinates: [106.6889, 10.7756] } },
      { name: 'Dân Chủ', nameEn: 'Dan Chu', stationOrder: 3, stationStatus: 'in-progress', stationProgress: 10, location: { type: 'Point', coordinates: [106.6734, 10.7812] } },
      { name: 'Hòa Hưng', nameEn: 'Hoa Hung', stationOrder: 4, stationStatus: 'planned', stationProgress: 5, location: { type: 'Point', coordinates: [106.6623, 10.7889] } },
      { name: 'Lê Thị Riêng', nameEn: 'Le Thi Rieng', stationOrder: 5, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6567, 10.7978] } },
      { name: 'Phạm Văn Hai', nameEn: 'Pham Van Hai', stationOrder: 6, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6512, 10.8089] } },
      { name: 'Bà Quẹo', nameEn: 'Ba Queo', stationOrder: 7, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6478, 10.8212] } },
      { name: 'Phạm Văn Bạch', nameEn: 'Pham Van Bach', stationOrder: 8, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6423, 10.8334] } },
      { name: 'Tân Bình', nameEn: 'Tan Binh', stationOrder: 9, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6389, 10.8467] } },
      { name: 'Tham Lương', nameEn: 'Tham Luong', stationOrder: 10, stationStatus: 'planned', stationProgress: 0, location: { type: 'Point', coordinates: [106.6345, 10.8623] } },
    ],
    sources: [{ url: 'https://maur.hochiminhcity.gov.vn/', title: 'Ban Quản lý Đường sắt Đô thị TP.HCM - Metro Line 2', publishedAt: '2024-01-01' }],
  },

  // RING ROADS & EXPRESSWAYS
  {
    title: 'Đường Vành đai 2 TP.HCM',
    slug: 'vanh-dai-2-tphcm',
    description: createDescription(
      'Đường Vành đai 2 là tuyến đường vành đai nội đô quan trọng của TP.HCM, tổng chiều dài khoảng 64 km, đi qua các quận Thủ Đức, Bình Tân, Quận 12, Gò Vấp, Bình Thạnh và Quận 7. Dự án bao gồm nhiều phân đoạn, trong đó một số đoạn đã hoàn thành và đưa vào sử dụng.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'in-progress' as const,
    progress: 65,
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.7523, 10.8456], [106.7234, 10.8623], [106.6945, 10.8534], [106.6656, 10.8345],
        [106.6367, 10.8156], [106.6078, 10.7967], [106.5789, 10.7678], [106.5945, 10.7345],
        [106.6234, 10.7123], [106.6789, 10.6945],
      ],
    },
    centroid: [106.6567, 10.7945],
    announcedDate: '2010-05-15',
    startDate: '2018-03-15',
    expectedEndDate: '2025-12-31',
    details: { budget: 38000000000000, fundingSource: 'Ngân sách TP.HCM và vốn xã hội hóa', contractor: 'Nhiều nhà thầu theo từng phân đoạn' },
    sources: [{ url: 'https://sggp.org.vn/', title: 'Tiến độ đường Vành đai 2 TP.HCM', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Đường Vành đai 3 TP.HCM',
    slug: 'vanh-dai-3-tphcm',
    description: createDescription(
      'Đường Vành đai 3 là dự án hạ tầng giao thông trọng điểm quốc gia, kết nối TP.HCM với các tỉnh Đồng Nai, Bình Dương và Long An. Tổng chiều dài 76.34 km, trong đó đoạn qua TP.HCM dài 47.5 km. Dự án được Quốc hội thông qua chủ trương đầu tư tháng 6/2022 và khởi công tháng 6/2023.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'in-progress' as const,
    progress: 35,
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.8847, 10.8789], [106.8456, 10.8945], [106.7923, 10.8812], [106.7234, 10.8567],
        [106.6545, 10.8123], [106.5856, 10.7678], [106.5167, 10.7034], [106.5523, 10.6345],
        [106.6345, 10.5856], [106.7523, 10.5678], [106.8234, 10.6234], [106.8847, 10.8789],
      ],
    },
    centroid: [106.7034, 10.7623],
    announcedDate: '2022-06-15',
    startDate: '2023-06-18',
    expectedEndDate: '2027-06-30',
    details: { budget: 75378000000000, fundingSource: 'Ngân sách nhà nước trung ương và địa phương', contractor: 'Liên danh các nhà thầu trong nước' },
    sources: [{ url: 'https://thuvienphapluat.vn/van-ban/Xay-dung-Do-thi/Nghi-quyet-57-2022-QH15-chu-truong-dau-tu-duong-Vanh-dai-3-Ho-Chi-Minh-520366.aspx', title: 'Nghị quyết 57/2022/QH15 về chủ trương đầu tư đường Vành đai 3', publishedAt: '2022-06-16' }],
  },
  {
    title: 'Đường Vành đai 4 TP.HCM',
    slug: 'vanh-dai-4-tphcm',
    description: createDescription(
      'Đường Vành đai 4 là tuyến đường vành đai ngoài cùng của vùng TP.HCM, tổng chiều dài khoảng 197 km, kết nối các tỉnh Bà Rịa - Vũng Tàu, Đồng Nai, Bình Dương, Bình Phước, Tây Ninh và Long An. Dự án đang trong giai đoạn nghiên cứu và chuẩn bị đầu tư.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'planned' as const,
    progress: 5,
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.9234, 10.9512], [106.8012, 10.9723], [106.6789, 10.9534], [106.5567, 10.8945],
        [106.4345, 10.7856], [106.3523, 10.6567], [106.4234, 10.5178], [106.5456, 10.4389],
        [106.7234, 10.3856], [106.9012, 10.4567], [107.0234, 10.5678], [106.9234, 10.9512],
      ],
    },
    centroid: [106.6234, 10.6945],
    announcedDate: '2023-01-15',
    startDate: '2025-06-01',
    expectedEndDate: '2030-12-31',
    details: { budget: 100000000000000, fundingSource: 'Ngân sách nhà nước và vốn PPP', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Quy hoạch đường Vành đai 4 vùng TP.HCM', publishedAt: '2023-06-15' }],
  },
  {
    title: 'Cao tốc Long Thành - Bến Lức',
    slug: 'cao-toc-long-thanh-ben-luc',
    description: createDescription(
      'Cao tốc Long Thành - Bến Lức là tuyến đường cao tốc dài 57.1 km kết nối cao tốc TP.HCM - Long Thành - Dầu Giây với cao tốc TP.HCM - Trung Lương. Dự án chia làm 2 giai đoạn: phía Đông (đã hoàn thành 2019) và phía Nam (đang thi công).'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'in-progress' as const,
    progress: 75,
    geometry: {
      type: 'LineString',
      coordinates: [[106.8923, 10.6234], [106.8234, 10.5945], [106.7545, 10.5656], [106.6856, 10.5367], [106.6167, 10.5078], [106.5478, 10.4789]],
    },
    centroid: [106.7234, 10.5512],
    announcedDate: '2010-09-15',
    startDate: '2014-07-01',
    expectedEndDate: '2025-12-31',
    details: { budget: 40000000000000, fundingSource: 'Vốn vay ADB và ngân sách nhà nước', contractor: 'Posco E&C, Sumitomo và các nhà thầu trong nước' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Cao tốc Bến Lức - Long Thành sắp hoàn thành', publishedAt: '2024-09-15' }],
  },
  {
    title: 'Cao tốc TP.HCM - Long Thành - Dầu Giây',
    slug: 'cao-toc-tphcm-long-thanh-dau-giay',
    description: createDescription(
      'Cao tốc TP.HCM - Long Thành - Dầu Giây dài 55.7 km, kết nối TP.HCM với sân bay Long Thành và các tỉnh miền Đông Nam Bộ. Đây là tuyến cao tốc đầu tiên của miền Nam, được khánh thành năm 2015.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7523, 10.8234], [106.8234, 10.7945], [106.8945, 10.7656], [106.9656, 10.7367]],
    },
    centroid: [106.8589, 10.7800],
    announcedDate: '2009-01-15',
    startDate: '2009-10-15',
    expectedEndDate: '2015-02-08',
    actualEndDate: '2015-02-08',
    details: { budget: 20630000000000, fundingSource: 'Vốn vay ADB, JICA và ngân sách nhà nước', contractor: 'Liên danh Posco - Lotte - GS E&C' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cao tốc Long Thành - Dầu Giây', publishedAt: '2015-02-08' }],
  },

  // BRIDGES
  {
    title: 'Cầu Thủ Thiêm 2',
    slug: 'cau-thu-thiem-2',
    description: createDescription(
      'Cầu Thủ Thiêm 2 là cầu dây văng bắc qua sông Sài Gòn, nối Quận 1 với Khu đô thị mới Thủ Thiêm (TP. Thủ Đức). Cầu dài 1.465 m, rộng 27.6 m với 6 làn xe, khánh thành tháng 4/2022. Cầu có thiết kế kiến trúc độc đáo, trở thành biểu tượng mới của thành phố.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7089, 10.7812], [106.7145, 10.7834], [106.7212, 10.7856], [106.7278, 10.7878]],
    },
    centroid: [106.7178, 10.7845],
    announcedDate: '2015-02-15',
    startDate: '2015-06-15',
    expectedEndDate: '2018-12-31',
    actualEndDate: '2022-04-28',
    details: { budget: 1800000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Tổng công ty Xây dựng Số 1 (CC1)' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cầu Thủ Thiêm 2', publishedAt: '2022-04-28' }],
  },
  {
    title: 'Cầu Thủ Thiêm 4',
    slug: 'cau-thu-thiem-4',
    description: createDescription(
      'Cầu Thủ Thiêm 4 là cầu dây văng nối Quận 7 với Khu đô thị mới Thủ Thiêm, dài khoảng 2.1 km. Đây là một trong những cầu quan trọng kết nối các khu đô thị mới của TP.HCM, dự kiến khởi công năm 2025.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'planned' as const,
    progress: 10,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7234, 10.7534], [106.7323, 10.7612], [106.7412, 10.7689]],
    },
    centroid: [106.7323, 10.7612],
    announcedDate: '2020-06-15',
    startDate: '2025-06-01',
    expectedEndDate: '2028-12-31',
    details: { budget: 5000000000000, fundingSource: 'Ngân sách TP.HCM và vốn PPP', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Quy hoạch cầu Thủ Thiêm 4', publishedAt: '2024-03-15' }],
  },
  {
    title: 'Cầu Cát Lái',
    slug: 'cau-cat-lai',
    description: createDescription(
      'Cầu Cát Lái thay thế phà Cát Lái, nối TP. Thủ Đức với huyện Nhơn Trạch (Đồng Nai). Chiều dài cầu khoảng 4.5 km, rộng 27.6 m với 6 làn xe. Dự án nhằm giải quyết tình trạng ùn tắc tại bến phà và kết nối vùng kinh tế trọng điểm phía Nam.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'in-progress' as const,
    progress: 25,
    geometry: {
      type: 'LineString',
      coordinates: [[106.8234, 10.7623], [106.8412, 10.7534], [106.8589, 10.7445], [106.8767, 10.7356]],
    },
    centroid: [106.8501, 10.7490],
    announcedDate: '2020-12-15',
    startDate: '2024-03-15',
    expectedEndDate: '2027-12-31',
    details: { budget: 7500000000000, fundingSource: 'Ngân sách TP.HCM và tỉnh Đồng Nai', contractor: 'Liên danh Tổng công ty 36 và các nhà thầu' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khởi công cầu Cát Lái', publishedAt: '2024-03-15' }],
  },
  {
    title: 'Cầu Cần Giờ',
    slug: 'cau-can-gio',
    description: createDescription(
      'Cầu Cần Giờ nối huyện Nhà Bè với huyện Cần Giờ, thay thế phà Bình Khánh. Chiều dài cầu khoảng 3.4 km, là công trình quan trọng phát triển du lịch và kinh tế huyện Cần Giờ.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'planned' as const,
    progress: 15,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7523, 10.6234], [106.7612, 10.6089], [106.7701, 10.5945]],
    },
    centroid: [106.7612, 10.6089],
    announcedDate: '2021-06-15',
    startDate: '2025-03-01',
    expectedEndDate: '2028-12-31',
    details: { budget: 9000000000000, fundingSource: 'Ngân sách TP.HCM và vốn PPP', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Quy hoạch cầu Cần Giờ', publishedAt: '2024-01-15' }],
  },
  {
    title: 'Cầu Nhị Thiên Đường',
    slug: 'cau-nhi-thien-duong',
    description: createDescription(
      'Cầu Nhị Thiên Đường (Cầu Nhị Thiên Đường mới) bắc qua kênh Đôi, nối Quận 8 với huyện Bình Chánh. Cầu dài 313 m, rộng 25 m với 6 làn xe, khánh thành năm 2022, giúp giảm tải cho cầu cũ.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6234, 10.7345], [106.6189, 10.7289], [106.6145, 10.7234]],
    },
    centroid: [106.6189, 10.7289],
    announcedDate: '2019-01-15',
    startDate: '2019-06-15',
    expectedEndDate: '2022-06-30',
    actualEndDate: '2022-05-15',
    details: { budget: 1000000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Công ty CP Xây dựng Công trình 568' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cầu Nhị Thiên Đường', publishedAt: '2022-05-15' }],
  },
  {
    title: 'Cầu Phú Mỹ',
    slug: 'cau-phu-my',
    description: createDescription(
      'Cầu Phú Mỹ là cầu dây văng lớn nhất TP.HCM, bắc qua sông Sài Gòn nối Quận 2 (nay là TP. Thủ Đức) với Quận 7. Cầu dài 2.060 m, rộng 27.5 m, khánh thành ngày 2/9/2009, là biểu tượng kiến trúc hiện đại của thành phố.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7523, 10.7478], [106.7612, 10.7534], [106.7701, 10.7589]],
    },
    centroid: [106.7612, 10.7534],
    announcedDate: '2005-06-15',
    startDate: '2005-09-15',
    expectedEndDate: '2009-09-02',
    actualEndDate: '2009-09-02',
    details: { budget: 2100000000000, fundingSource: 'Vốn BOT', contractor: 'Công ty Cổ phần Đầu tư Hạ tầng Kỹ thuật TP.HCM (CII)' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cầu Phú Mỹ', publishedAt: '2009-09-02' }],
  },

  // TUNNELS
  {
    title: 'Hầm Thủ Thiêm',
    slug: 'ham-thu-thiem',
    description: createDescription(
      'Hầm Thủ Thiêm là hầm vượt sông đầu tiên tại Việt Nam, nằm dưới sông Sài Gòn nối Quận 1 với Khu đô thị mới Thủ Thiêm. Hầm dài 1.490 m (đoạn hầm chìm dưới sông 370 m), rộng 33 m với 6 làn xe, khánh thành tháng 11/2011.'
    ),
    constructionType: 'tunnel' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7045, 10.7856], [106.7123, 10.7867], [106.7201, 10.7878]],
    },
    centroid: [106.7123, 10.7867],
    announcedDate: '2005-02-15',
    startDate: '2005-03-31',
    expectedEndDate: '2011-11-20',
    actualEndDate: '2011-11-20',
    details: { budget: 7500000000000, fundingSource: 'Vốn vay JICA', contractor: 'Liên danh Obayashi (Nhật Bản) và các nhà thầu' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành hầm Thủ Thiêm', publishedAt: '2011-11-20' }],
  },

  // AIRPORTS
  {
    title: 'Sân bay Quốc tế Long Thành - Giai đoạn 1',
    slug: 'san-bay-long-thanh-giai-doan-1',
    description: createDescription(
      'Sân bay Quốc tế Long Thành là sân bay quốc tế lớn nhất Việt Nam, nằm tại huyện Long Thành, tỉnh Đồng Nai, cách TP.HCM khoảng 40 km. Giai đoạn 1 bao gồm 1 đường băng và 1 nhà ga với công suất 25 triệu hành khách/năm, dự kiến hoàn thành năm 2026.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'in-progress' as const,
    progress: 50,
    geometry: {
      type: 'Polygon',
      coordinates: [[[106.9523, 10.9834], [106.9834, 10.9834], [106.9834, 10.9523], [106.9523, 10.9523], [106.9523, 10.9834]]],
    },
    centroid: [106.9678, 10.9678],
    announcedDate: '2020-01-15',
    startDate: '2021-01-05',
    expectedEndDate: '2026-12-31',
    details: { budget: 100000000000000, fundingSource: 'Vốn nhà nước, ODA và vốn doanh nghiệp (ACV)', contractor: 'Tổng công ty Cảng hàng không Việt Nam (ACV) và các nhà thầu' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ xây dựng sân bay Long Thành', publishedAt: '2024-12-15' }],
  },
  {
    title: 'Nhà ga T3 - Sân bay Tân Sơn Nhất',
    slug: 'nha-ga-t3-tan-son-nhat',
    description: createDescription(
      'Nhà ga T3 sân bay Tân Sơn Nhất là công trình mở rộng quan trọng nhằm nâng công suất sân bay lên 50 triệu hành khách/năm. Nhà ga T3 có công suất 20 triệu hành khách/năm, khởi công tháng 12/2022, dự kiến hoàn thành năm 2025.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'in-progress' as const,
    progress: 65,
    geometry: {
      type: 'Polygon',
      coordinates: [[[106.6567, 10.8234], [106.6678, 10.8234], [106.6678, 10.8123], [106.6567, 10.8123], [106.6567, 10.8234]]],
    },
    centroid: [106.6623, 10.8178],
    announcedDate: '2021-06-15',
    startDate: '2022-12-24',
    expectedEndDate: '2025-12-31',
    details: { budget: 19000000000000, fundingSource: 'Vốn doanh nghiệp (ACV)', contractor: 'Tổng công ty Cảng hàng không Việt Nam (ACV)' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khởi công nhà ga T3 Tân Sơn Nhất', publishedAt: '2022-12-24' }],
  },

  // FLOOD CONTROL & INFRASTRUCTURE
  {
    title: 'Dự án Chống ngập khu vực TP.HCM - Giai đoạn 1',
    slug: 'chong-ngap-tphcm-giai-doan-1',
    description: createDescription(
      'Dự án chống ngập khu vực TP.HCM (giai đoạn 1) bao gồm hệ thống cống kiểm soát triều, đê bao và trạm bơm nhằm giải quyết tình trạng ngập úng tại vùng ven sông Sài Gòn - Nhà Bè. Dự án bảo vệ diện tích 570 km² với dân số 6.5 triệu người.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'in-progress' as const,
    progress: 85,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7012, 10.8234], [106.6845, 10.7945], [106.6678, 10.7656], [106.6512, 10.7367], [106.6345, 10.7078]],
    },
    centroid: [106.6678, 10.7656],
    announcedDate: '2016-06-15',
    startDate: '2016-06-26',
    expectedEndDate: '2025-12-31',
    details: { budget: 12000000000000, fundingSource: 'Vốn vay ODA Nhật Bản và ngân sách TP.HCM', contractor: 'Trung Nam Group' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ dự án chống ngập TP.HCM', publishedAt: '2024-09-15' }],
  },
  {
    title: 'Cải tạo kênh Nhiêu Lộc - Thị Nghè',
    slug: 'cai-tao-kenh-nhieu-loc-thi-nghe',
    description: createDescription(
      'Dự án cải tạo vệ sinh môi trường lưu vực kênh Nhiêu Lộc - Thị Nghè là một trong những dự án môi trường lớn nhất của TP.HCM. Dự án bao gồm nạo vét kênh, xây dựng hệ thống thu gom nước thải và nhà máy xử lý, biến kênh ô nhiễm thành không gian xanh.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6678, 10.7823], [106.6834, 10.7867], [106.6989, 10.7912], [106.7145, 10.7956]],
    },
    centroid: [106.6911, 10.7889],
    announcedDate: '2003-06-15',
    startDate: '2003-09-15',
    expectedEndDate: '2012-12-31',
    actualEndDate: '2012-06-15',
    details: { budget: 7000000000000, fundingSource: 'Vốn vay Ngân hàng Thế giới (WB)', contractor: 'Liên danh các nhà thầu trong và ngoài nước' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Hoàn thành cải tạo kênh Nhiêu Lộc - Thị Nghè', publishedAt: '2012-06-15' }],
  },

  // ADDITIONAL ROADS
  {
    title: 'Tỉnh lộ 25C (Đường liên tỉnh Dĩ An - Nhơn Trạch)',
    slug: 'tinh-lo-25c',
    description: createDescription(
      'Tỉnh lộ 25C kết nối TP. Thủ Đức với huyện Nhơn Trạch (Đồng Nai), đi qua cầu Cát Lái mới. Dự án có tổng chiều dài khoảng 8 km, mặt đường rộng 6 làn xe, là tuyến đường quan trọng kết nối vùng kinh tế phía Đông TP.HCM.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 60,
    geometry: {
      type: 'LineString',
      coordinates: [[106.8234, 10.7623], [106.8456, 10.7534], [106.8678, 10.7445], [106.8901, 10.7356], [106.9123, 10.7267]],
    },
    centroid: [106.8678, 10.7445],
    announcedDate: '2020-03-15',
    startDate: '2021-09-01',
    expectedEndDate: '2025-12-31',
    details: { budget: 8500000000000, fundingSource: 'Ngân sách TP.HCM và tỉnh Đồng Nai', contractor: 'Tổng công ty Xây dựng Số 1' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ Tỉnh lộ 25C', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Tỉnh lộ 25B (Đường Nguyễn Xiển - Lò Lu)',
    slug: 'tinh-lo-25b',
    description: createDescription(
      'Tỉnh lộ 25B nối từ đường Nguyễn Xiển đến Lò Lu, kết nối TP. Thủ Đức với các khu vực phía Đông TP.HCM. Chiều dài khoảng 12 km, mặt đường rộng 6-8 làn xe.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 75,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7891, 10.8123], [106.8012, 10.8234], [106.8234, 10.8345], [106.8456, 10.8456], [106.8678, 10.8567]],
    },
    centroid: [106.8234, 10.8345],
    announcedDate: '2019-06-01',
    startDate: '2020-03-15',
    expectedEndDate: '2025-06-30',
    details: { budget: 4200000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ Tỉnh lộ 25B', publishedAt: '2024-03-15' }],
  },
  {
    title: 'Đường Trần Quốc Hoàn - Cộng Hòa',
    slug: 'duong-tran-quoc-hoan-cong-hoa',
    description: createDescription(
      'Đường Trần Quốc Hoàn - Cộng Hòa là tuyến đường kết nối sân bay Tân Sơn Nhất với đường Cộng Hòa, giúp giảm ùn tắc giao thông khu vực sân bay. Chiều dài khoảng 2.5 km, rộng 6-8 làn xe.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 80,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6523, 10.8167], [106.6612, 10.8212], [106.6701, 10.8256]],
    },
    centroid: [106.6612, 10.8212],
    announcedDate: '2020-06-15',
    startDate: '2021-03-15',
    expectedEndDate: '2025-06-30',
    details: { budget: 4800000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Liên danh Hòa Bình - Coteccons' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ đường Trần Quốc Hoàn', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Mở rộng Quốc lộ 13',
    slug: 'mo-rong-quoc-lo-13',
    description: createDescription(
      'Dự án mở rộng Quốc lộ 13 (đoạn qua TP.HCM) từ ngã tư Bình Phước đến ranh giới tỉnh Bình Dương. Chiều dài khoảng 5.5 km, mở rộng từ 4 làn xe lên 8-10 làn xe, giúp kết nối giao thông giữa TP.HCM và Bình Dương.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 40,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7234, 10.8678], [106.7156, 10.8789], [106.7078, 10.8901], [106.7001, 10.9012]],
    },
    centroid: [106.7117, 10.8845],
    announcedDate: '2018-06-15',
    startDate: '2022-09-15',
    expectedEndDate: '2026-12-31',
    details: { budget: 9800000000000, fundingSource: 'Ngân sách TP.HCM và vốn PPP', contractor: 'Liên danh các nhà thầu' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ mở rộng Quốc lộ 13', publishedAt: '2024-09-15' }],
  },
  {
    title: 'Nút giao thông An Phú',
    slug: 'nut-giao-thong-an-phu',
    description: createDescription(
      'Nút giao thông An Phú là dự án xây dựng nút giao 3 tầng tại ngã ba Cát Lái, kết nối cao tốc TP.HCM - Long Thành - Dầu Giây với đường Mai Chí Thọ và Xa lộ Hà Nội. Đây là nút giao quan trọng giải quyết ùn tắc khu vực cửa ngõ phía Đông thành phố.'
    ),
    constructionType: 'interchange' as const,
    constructionStatus: 'in-progress' as const,
    progress: 55,
    geometry: {
      type: 'Point',
      coordinates: [106.7523, 10.7945],
    },
    centroid: [106.7523, 10.7945],
    announcedDate: '2020-03-15',
    startDate: '2022-12-15',
    expectedEndDate: '2025-12-31',
    details: { budget: 3400000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Liên danh Tổng công ty 36 và các nhà thầu' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ nút giao An Phú', publishedAt: '2024-06-15' }],
  },

  // ADDITIONAL METRO LINES
  {
    title: 'Tuyến Metro số 3a (Bến Thành - Tân Kiên)',
    slug: 'metro-line-3a-ben-thanh-tan-kien',
    description: createDescription(
      'Tuyến metro số 3a chạy từ ga Bến Thành đến Tân Kiên (Bình Chánh), tổng chiều dài 19.8 km với 14 nhà ga (8 ga ngầm, 6 ga trên cao). Tuyến này sẽ kết nối trung tâm thành phố với khu vực phía Tây, hỗ trợ phát triển đô thị vệ tinh.'
    ),
    constructionType: 'metro' as const,
    constructionStatus: 'planned' as const,
    progress: 5,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6981, 10.7731], [106.6856, 10.7678], [106.6712, 10.7623], [106.6567, 10.7567], [106.6423, 10.7512], [106.6278, 10.7456], [106.6134, 10.7401], [106.5989, 10.7345]],
    },
    centroid: [106.6485, 10.7538],
    announcedDate: '2018-06-15',
    startDate: '2025-12-01',
    expectedEndDate: '2035-12-31',
    details: { budget: 68000000000000, fundingSource: 'Vốn ODA và ngân sách TP.HCM', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://maur.hochiminhcity.gov.vn/', title: 'Quy hoạch tuyến Metro số 3a', publishedAt: '2024-01-01' }],
  },
  {
    title: 'Tuyến Metro số 5 giai đoạn 1 (Bến xe Cần Giuộc - Cầu Sài Gòn)',
    slug: 'metro-line-5-phase-1',
    description: createDescription(
      'Tuyến metro số 5 giai đoạn 1 chạy từ Bến xe Cần Giuộc qua Quận 8, Quận 5, Quận 10 đến Cầu Sài Gòn. Tổng chiều dài 8.9 km với 8 nhà ga ngầm. Đây là tuyến metro hướng Đông-Tây quan trọng của thành phố.'
    ),
    constructionType: 'metro' as const,
    constructionStatus: 'planned' as const,
    progress: 3,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6234, 10.7234], [106.6356, 10.7312], [106.6478, 10.7389], [106.6612, 10.7467], [106.6745, 10.7545], [106.6878, 10.7623], [106.7012, 10.7701], [106.7145, 10.7778]],
    },
    centroid: [106.6689, 10.7506],
    announcedDate: '2019-09-15',
    startDate: '2027-01-01',
    expectedEndDate: '2036-12-31',
    details: { budget: 40000000000000, fundingSource: 'Vốn ODA Tây Ban Nha, ADB và ngân sách', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://maur.hochiminhcity.gov.vn/', title: 'Quy hoạch tuyến Metro số 5', publishedAt: '2024-01-01' }],
  },

  // ADDITIONAL EXPRESSWAYS
  {
    title: 'Cao tốc TP.HCM - Mộc Bài',
    slug: 'cao-toc-tphcm-moc-bai',
    description: createDescription(
      'Cao tốc TP.HCM - Mộc Bài kết nối TP.HCM với cửa khẩu Mộc Bài (Tây Ninh), tổng chiều dài 53.5 km. Dự án giúp tăng cường kết nối giao thương với Campuchia và các tỉnh Tây Nam Bộ, thúc đẩy phát triển kinh tế khu vực biên giới.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'planned' as const,
    progress: 10,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6234, 10.8456], [106.5945, 10.8678], [106.5656, 10.8901], [106.5367, 10.9123], [106.5078, 10.9345]],
    },
    centroid: [106.5656, 10.8901],
    announcedDate: '2021-06-15',
    startDate: '2025-06-01',
    expectedEndDate: '2028-12-31',
    details: { budget: 25000000000000, fundingSource: 'Vốn PPP và ngân sách nhà nước', contractor: 'Chưa xác định' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Quy hoạch cao tốc TP.HCM - Mộc Bài', publishedAt: '2024-03-15' }],
  },
  {
    title: 'Cao tốc Biên Hòa - Vũng Tàu',
    slug: 'cao-toc-bien-hoa-vung-tau',
    description: createDescription(
      'Cao tốc Biên Hòa - Vũng Tàu dài 53.7 km, kết nối TP.HCM với tỉnh Bà Rịa - Vũng Tàu qua tỉnh Đồng Nai. Đây là tuyến cao tốc quan trọng phục vụ vận chuyển hàng hóa từ cảng Cái Mép - Thị Vải và phát triển du lịch.'
    ),
    constructionType: 'highway' as const,
    constructionStatus: 'in-progress' as const,
    progress: 45,
    geometry: {
      type: 'LineString',
      coordinates: [[106.8678, 10.8945], [106.9123, 10.8456], [106.9567, 10.7967], [107.0012, 10.7478], [107.0456, 10.6989]],
    },
    centroid: [106.9567, 10.7967],
    announcedDate: '2020-09-15',
    startDate: '2023-06-15',
    expectedEndDate: '2027-12-31',
    details: { budget: 17800000000000, fundingSource: 'Ngân sách nhà nước và vốn PPP', contractor: 'Liên danh các nhà thầu trong nước' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khởi công cao tốc Biên Hòa - Vũng Tàu', publishedAt: '2023-06-15' }],
  },

  // ADDITIONAL BRIDGES
  {
    title: 'Cầu Bình Khánh',
    slug: 'cau-binh-khanh',
    description: createDescription(
      'Cầu Bình Khánh nằm trên tuyến cao tốc Bến Lức - Long Thành, bắc qua sông Soài Rạp nối huyện Nhà Bè với huyện Cần Giờ. Đây là cầu dây văng lớn với nhịp chính dài 375m, tổng chiều dài cầu 2.76 km.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'in-progress' as const,
    progress: 30,
    geometry: {
      type: 'LineString',
      coordinates: [[106.7234, 10.6534], [106.7389, 10.6389], [106.7545, 10.6245]],
    },
    centroid: [106.7389, 10.6389],
    announcedDate: '2015-06-15',
    startDate: '2023-03-15',
    expectedEndDate: '2026-12-31',
    details: { budget: 3500000000000, fundingSource: 'Vốn vay ADB và ngân sách nhà nước', contractor: 'Liên danh nhà thầu Nhật Bản - Việt Nam' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ cầu Bình Khánh', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Cầu Rạch Miễu 2',
    slug: 'cau-rach-mieu-2',
    description: createDescription(
      'Cầu Rạch Miễu 2 song song với cầu Rạch Miễu hiện hữu, nối tỉnh Tiền Giang với tỉnh Bến Tre. Cầu dài 2.65 km với 4 làn xe, giúp giảm tải cho cầu cũ và tăng cường kết nối miền Tây Nam Bộ.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[106.3678, 10.3456], [106.3834, 10.3367], [106.3989, 10.3278]],
    },
    centroid: [106.3834, 10.3367],
    announcedDate: '2019-09-15',
    startDate: '2021-03-15',
    expectedEndDate: '2024-06-30',
    actualEndDate: '2024-04-27',
    details: { budget: 5200000000000, fundingSource: 'Ngân sách nhà nước', contractor: 'Liên danh Tổng công ty 36 - Cienco 4' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cầu Rạch Miễu 2', publishedAt: '2024-04-27' }],
  },
  {
    title: 'Cầu Mỹ Thuận 2',
    slug: 'cau-my-thuan-2',
    description: createDescription(
      'Cầu Mỹ Thuận 2 là cầu dây văng song song với cầu Mỹ Thuận hiện hữu, bắc qua sông Tiền nối tỉnh Tiền Giang với Vĩnh Long. Cầu dài 6.61 km (bao gồm đường dẫn), nhịp chính dài 350m.'
    ),
    constructionType: 'bridge' as const,
    constructionStatus: 'completed' as const,
    progress: 100,
    geometry: {
      type: 'LineString',
      coordinates: [[105.9123, 10.2567], [105.9234, 10.2456], [105.9345, 10.2345]],
    },
    centroid: [105.9234, 10.2456],
    announcedDate: '2018-12-15',
    startDate: '2020-02-28',
    expectedEndDate: '2023-12-31',
    actualEndDate: '2023-12-24',
    details: { budget: 5000000000000, fundingSource: 'Ngân sách nhà nước', contractor: 'Tổng công ty Xây dựng Trường Sơn' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Khánh thành cầu Mỹ Thuận 2', publishedAt: '2023-12-24' }],
  },

  // ADDITIONAL INTERCHANGES
  {
    title: 'Nút giao thông Mỹ Thủy',
    slug: 'nut-giao-thong-my-thuy',
    description: createDescription(
      'Nút giao thông Mỹ Thủy là dự án xây dựng nút giao 3 tầng tại ngã tư Mỹ Thủy (TP. Thủ Đức), kết nối đường Võ Chí Công với đường vành đai 2. Dự án giúp giảm ùn tắc tại khu vực cảng Cát Lái.'
    ),
    constructionType: 'interchange' as const,
    constructionStatus: 'in-progress' as const,
    progress: 45,
    geometry: {
      type: 'Point',
      coordinates: [106.7734, 10.7789],
    },
    centroid: [106.7734, 10.7789],
    announcedDate: '2021-06-15',
    startDate: '2023-09-15',
    expectedEndDate: '2026-06-30',
    details: { budget: 2800000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Tổng công ty Xây dựng Số 1' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ nút giao Mỹ Thủy', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Nút giao thông Nguyễn Văn Linh - Nguyễn Hữu Thọ',
    slug: 'nut-giao-nguyen-van-linh-nguyen-huu-tho',
    description: createDescription(
      'Nút giao Nguyễn Văn Linh - Nguyễn Hữu Thọ là dự án xây dựng cầu vượt và hầm chui tại ngã tư này (Quận 7), giúp giải quyết tình trạng ùn tắc nghiêm trọng khu vực cửa ngõ phía Nam thành phố.'
    ),
    constructionType: 'interchange' as const,
    constructionStatus: 'in-progress' as const,
    progress: 70,
    geometry: {
      type: 'Point',
      coordinates: [106.6989, 10.7178],
    },
    centroid: [106.6989, 10.7178],
    announcedDate: '2020-03-15',
    startDate: '2022-06-15',
    expectedEndDate: '2025-06-30',
    details: { budget: 1500000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ nút giao Nguyễn Văn Linh', publishedAt: '2024-06-15' }],
  },

  // ADDITIONAL ROADS
  {
    title: 'Mở rộng đường Nguyễn Hữu Thọ',
    slug: 'mo-rong-duong-nguyen-huu-tho',
    description: createDescription(
      'Dự án mở rộng đường Nguyễn Hữu Thọ từ cầu Kênh Tẻ đến đường Nguyễn Văn Linh (Quận 7 và Nhà Bè). Chiều dài 6.5 km, mở rộng từ 4 làn xe lên 8-10 làn xe, đáp ứng nhu cầu giao thông khu Nam thành phố.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 70,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6923, 10.7456], [106.6978, 10.7312], [106.7034, 10.7167], [106.7089, 10.7023]],
    },
    centroid: [106.7006, 10.7239],
    announcedDate: '2019-06-15',
    startDate: '2020-12-15',
    expectedEndDate: '2025-12-31',
    details: { budget: 6800000000000, fundingSource: 'Ngân sách TP.HCM và vốn PPP', contractor: 'Liên danh Hòa Bình - IDICO' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ mở rộng đường Nguyễn Hữu Thọ', publishedAt: '2024-06-15' }],
  },
  {
    title: 'Đường nối Trần Quốc Hoàn - Cộng Hòa (mở rộng giai đoạn 2)',
    slug: 'duong-tran-quoc-hoan-cong-hoa-giai-doan-2',
    description: createDescription(
      'Giai đoạn 2 của dự án đường Trần Quốc Hoàn - Cộng Hòa, bao gồm cầu vượt và mở rộng tuyến đường kết nối với nhà ga T3 sân bay Tân Sơn Nhất. Giúp tăng cường năng lực giao thông khu vực sân bay.'
    ),
    constructionType: 'road' as const,
    constructionStatus: 'in-progress' as const,
    progress: 50,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6623, 10.8189], [106.6678, 10.8212], [106.6734, 10.8234]],
    },
    centroid: [106.6678, 10.8212],
    announcedDate: '2022-06-15',
    startDate: '2023-06-15',
    expectedEndDate: '2026-06-30',
    details: { budget: 2500000000000, fundingSource: 'Ngân sách TP.HCM', contractor: 'Liên danh Hòa Bình - Coteccons' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ đường Trần Quốc Hoàn giai đoạn 2', publishedAt: '2024-06-15' }],
  },

  // ADDITIONAL FLOOD CONTROL
  {
    title: 'Cải tạo kênh Tham Lương - Bến Cát - Rạch Nước Lên',
    slug: 'cai-tao-kenh-tham-luong-ben-cat',
    description: createDescription(
      'Dự án cải tạo vệ sinh môi trường kênh Tham Lương - Bến Cát - Rạch Nước Lên, tổng chiều dài 32.7 km, đi qua các quận 12, Bình Tân, Bình Chánh và Tân Phú. Dự án bao gồm nạo vét kênh, xây dựng bờ kè và hệ thống thu gom nước thải.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'in-progress' as const,
    progress: 60,
    geometry: {
      type: 'LineString',
      coordinates: [[106.6145, 10.8567], [106.6012, 10.8389], [106.5878, 10.8212], [106.5745, 10.8034]],
    },
    centroid: [106.5945, 10.8301],
    announcedDate: '2017-06-15',
    startDate: '2019-09-15',
    expectedEndDate: '2026-12-31',
    details: { budget: 8000000000000, fundingSource: 'Vốn vay Ngân hàng Thế giới và ngân sách TP.HCM', contractor: 'Liên danh các nhà thầu trong nước' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ cải tạo kênh Tham Lương', publishedAt: '2024-06-15' }],
  },

  // PORTS
  {
    title: 'Cảng Cát Lái - Mở rộng giai đoạn 3',
    slug: 'cang-cat-lai-mo-rong-giai-doan-3',
    description: createDescription(
      'Dự án mở rộng cảng Cát Lái giai đoạn 3 nhằm nâng công suất cảng container lớn nhất Việt Nam từ 5 triệu TEU/năm lên 8 triệu TEU/năm. Dự án bao gồm mở rộng bãi container, nâng cấp cầu cảng và hiện đại hóa thiết bị.'
    ),
    constructionType: 'other' as const,
    constructionStatus: 'in-progress' as const,
    progress: 55,
    geometry: {
      type: 'Polygon',
      coordinates: [[[106.7956, 10.7534], [106.8123, 10.7534], [106.8123, 10.7389], [106.7956, 10.7389], [106.7956, 10.7534]]],
    },
    centroid: [106.8039, 10.7462],
    announcedDate: '2019-06-15',
    startDate: '2020-12-15',
    expectedEndDate: '2026-12-31',
    details: { budget: 4500000000000, fundingSource: 'Vốn doanh nghiệp (Tân Cảng Sài Gòn)', contractor: 'Tổng công ty Tân Cảng Sài Gòn' },
    sources: [{ url: 'https://vnexpress.net/', title: 'Tiến độ mở rộng cảng Cát Lái', publishedAt: '2024-06-15' }],
  },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

const seedAll = async () => {
  const payload = await getPayload({ config });

  // Check for --clear flag
  const shouldClear = process.argv.includes('--clear');

  console.log('='.repeat(60));
  console.log('UNIFIED SEED SCRIPT');
  console.log('='.repeat(60));
  console.log('');

  if (shouldClear) {
    console.log('--clear flag detected. Clearing existing data...\n');
  }

  // Store organization IDs for later use
  const organizationIds: Record<string, string> = {};

  // ============================================
  // STEP 1: CLEAR DATA (if --clear flag)
  // ============================================
  if (shouldClear) {
    console.log('STEP 0: Clearing existing data');
    console.log('-'.repeat(40));

    // Clear developments
    const existingDevelopments = await payload.find({ collection: 'developments', limit: 1000 });
    let deletedDev = 0;
    for (const doc of existingDevelopments.docs) {
      await payload.delete({ collection: 'developments', id: doc.id, overrideAccess: true });
      deletedDev++;
    }
    console.log(`  Deleted ${deletedDev} developments`);

    // Clear constructions
    const existingConstructions = await payload.find({ collection: 'constructions', limit: 1000 });
    let deletedCon = 0;
    for (const doc of existingConstructions.docs) {
      await payload.delete({ collection: 'constructions', id: doc.id, overrideAccess: true });
      deletedCon++;
    }
    console.log(`  Deleted ${deletedCon} constructions`);

    console.log('');
  }

  // ============================================
  // STEP 1: CREATE ORGANIZATIONS
  // ============================================
  console.log('STEP 1: Creating Organizations');
  console.log('-'.repeat(40));

  for (const org of testOrganizations) {
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
          description: createDescription(org.description),
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
  // STEP 2: CREATE USERS
  // ============================================
  console.log('STEP 2: Creating Test Users');
  console.log('-'.repeat(40));

  const createdUsers: Array<{ email: string; role: string; organization?: string }> = [];

  for (const user of testUsers) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  [EXISTS] ${user.email} (${user.role})`);
      createdUsers.push({ email: user.email, role: user.role, organization: user.organization });
    } else {
      let organizationId: string | undefined;
      if (user.organization && organizationIds[user.organization]) {
        organizationId = organizationIds[user.organization];
      }

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

      await payload.update({
        collection: 'users',
        id: created.id,
        overrideAccess: true,
        data: { _verified: true },
      });

      console.log(`  [CREATED] ${user.email} (${user.role})`);
      createdUsers.push({ email: user.email, role: user.role, organization: user.organization });
    }
  }
  console.log('');

  // ============================================
  // STEP 3: CREATE CONSTRUCTIONS
  // ============================================
  console.log('STEP 3: Creating HCMC Constructions');
  console.log('-'.repeat(40));

  let constructionsCreated = 0;
  let constructionsUpdated = 0;

  for (const construction of hcmcConstructions) {
    const existing = await payload.find({
      collection: 'constructions',
      where: { slug: { equals: construction.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      try {
        await payload.update({
          collection: 'constructions',
          id: existing.docs[0].id,
          overrideAccess: true,
          data: { ...construction, _status: 'published' },
        });
        console.log(`  [UPDATED] ${construction.title}`);
        constructionsUpdated++;
      } catch (error) {
        console.error(`  [ERROR] ${construction.title}:`, error);
      }
    } else {
      try {
        await payload.create({
          collection: 'constructions',
          overrideAccess: true,
          data: { ...construction, _status: 'published' },
        });
        console.log(`  [CREATED] ${construction.title}`);
        constructionsCreated++;
      } catch (error) {
        console.error(`  [ERROR] ${construction.title}:`, error);
      }
    }
  }
  console.log(`  Summary: ${constructionsCreated} created, ${constructionsUpdated} updated`);
  console.log('');

  // ============================================
  // STEP 4: CREATE DEVELOPMENTS
  // ============================================
  console.log('STEP 4: Creating Private Developments');
  console.log('-'.repeat(40));

  let developmentsCreated = 0;
  let developmentsUpdated = 0;
  let developmentsSkipped = 0;

  for (const development of developments) {
    const organizationId = organizationIds[development.organizationSlug];

    if (!organizationId) {
      console.log(`  [SKIPPED] ${development.title} (organization not found)`);
      developmentsSkipped++;
      continue;
    }

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
        primaryButton: { text: 'Contact Sales', action: 'phone' as const },
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
        console.log(`  [UPDATED] ${development.title}`);
        developmentsUpdated++;
      } catch (error) {
        console.error(`  [ERROR] ${development.title}:`, error);
      }
    } else {
      try {
        await payload.create({
          collection: 'developments',
          overrideAccess: true,
          data: developmentData,
        });
        console.log(`  [CREATED] ${development.title}`);
        developmentsCreated++;
      } catch (error) {
        console.error(`  [ERROR] ${development.title}:`, error);
      }
    }
  }
  console.log(`  Summary: ${developmentsCreated} created, ${developmentsUpdated} updated, ${developmentsSkipped} skipped`);
  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Password for all test accounts: ${TEST_PASSWORD}`);
  console.log('');
  console.log('Test Accounts:');
  console.log('-'.repeat(40));

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
  console.log('Data Summary:');
  console.log('-'.repeat(40));
  console.log(`  - Organizations: ${testOrganizations.length}`);
  console.log(`  - Users: ${testUsers.length}`);
  console.log(`  - Constructions: ${hcmcConstructions.length}`);
  console.log(`  - Developments: ${developments.length}`);

  console.log('');
  console.log('='.repeat(60));
  console.log('Seed complete!');
  console.log('='.repeat(60));

  process.exit(0);
};

seedAll().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
