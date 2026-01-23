import 'dotenv/config';
import { getPayload } from 'payload';
import config from '@payload-config';

const seedData = async () => {
  const payload = await getPayload({ config });

  console.log('Seeding data...\n');

  // Create admin user first
  console.log('Creating admin user...');
  const existingAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: 'admin@example.com' } },
    limit: 1,
  });

  if (existingAdmin.docs.length === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        reputation: 100,
      },
      overrideAccess: true,
    });
    // Mark as verified
    const admin = await payload.find({
      collection: 'users',
      where: { email: { equals: 'admin@example.com' } },
      limit: 1,
    });
    if (admin.docs[0]) {
      await payload.update({
        collection: 'users',
        id: admin.docs[0].id,
        data: { _verified: true },
        overrideAccess: true,
      });
    }
    console.log('✓ Created admin user: admin@example.com / admin123');
  } else {
    console.log('✓ Admin user already exists');
  }

  console.log('\nSeeding construction data...');

  // Vành đai 3 (Ring Road 3) - Major expressway project
  await payload.create({
    collection: 'constructions',
    overrideAccess: true,
    data: {
      title: 'Đường Vành đai 3 TP.HCM',
      slug: 'vanh-dai-3-tphcm',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Đường Vành đai 3 là dự án hạ tầng giao thông trọng điểm kết nối TP.HCM với các tỉnh lân cận gồm Đồng Nai, Bình Dương và Long An. Tổng chiều dài khoảng 76.34 km, trong đó đoạn qua TP.HCM dài khoảng 47.5 km.',
                },
              ],
            },
          ],
        },
      },
      constructionType: 'highway',
      constructionStatus: 'in-progress',
      progress: 35,
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.8847, 10.8789], // Tân Vạn (Bình Dương)
          [106.8234, 10.9012], // Thủ Đức
          [106.7456, 10.8934], // Quận 12
          [106.6723, 10.8567], // Hóc Môn
          [106.5891, 10.7823], // Bình Chánh
          [106.5234, 10.7012], // Bến Lức (Long An)
          [106.5567, 10.6234], // Cần Giuộc
          [106.6891, 10.5678], // Nhơn Trạch (Đồng Nai)
          [106.8123, 10.6234], // Kết nối cao tốc Long Thành
          [106.8847, 10.8789], // Khép kín vành đai
        ],
      },
      centroid: [106.7034, 10.7623],
      announcedDate: '2022-06-15',
      startDate: '2023-06-18',
      expectedEndDate: '2027-06-30',
      details: {
        budget: 75378000000000,
        fundingSource: 'Ngân sách nhà nước và vốn ODA',
        contractor: 'Liên danh các nhà thầu trong nước',
      },
      sources: [
        {
          url: 'https://thuvienphapluat.vn/van-ban/Xay-dung-Do-thi/Nghi-quyet-57-2022-QH15-chu-truong-dau-tu-duong-Vanh-dai-3-Ho-Chi-Minh-520366.aspx',
          title: 'Nghị quyết 57/2022/QH15 về chủ trương đầu tư đường Vành đai 3',
          publishedAt: '2022-06-16',
        },
      ],
      _status: 'published',
    },
  });
  console.log('✓ Created: Đường Vành đai 3 TP.HCM');

  // Tỉnh lộ 25C
  await payload.create({
    collection: 'constructions',
    overrideAccess: true,
    data: {
      title: 'Tỉnh lộ 25C (Đường liên tỉnh Dĩ An - Nhơn Trạch)',
      slug: 'tinh-lo-25c',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Tỉnh lộ 25C kết nối TP. Thủ Đức với huyện Nhơn Trạch (Đồng Nai), đi qua cầu Cát Lái mới. Dự án có tổng chiều dài khoảng 8 km, mặt đường rộng 6 làn xe.',
                },
              ],
            },
          ],
        },
      },
      constructionType: 'road',
      constructionStatus: 'in-progress',
      progress: 60,
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.8234, 10.7623],
          [106.8456, 10.7534],
          [106.8678, 10.7445],
          [106.8901, 10.7356],
          [106.9123, 10.7267],
        ],
      },
      centroid: [106.8678, 10.7445],
      announcedDate: '2020-03-15',
      startDate: '2021-09-01',
      expectedEndDate: '2025-12-31',
      details: {
        budget: 8500000000000,
        fundingSource: 'Ngân sách TP.HCM và tỉnh Đồng Nai',
        contractor: 'Tổng công ty Xây dựng Số 1',
      },
      _status: 'published',
    },
  });
  console.log('✓ Created: Tỉnh lộ 25C');

  // Tỉnh lộ 25B
  await payload.create({
    collection: 'constructions',
    overrideAccess: true,
    data: {
      title: 'Tỉnh lộ 25B (Đường Nguyễn Xiển - Lò Lu)',
      slug: 'tinh-lo-25b',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Tỉnh lộ 25B nối từ đường Nguyễn Xiển đến Lò Lu, kết nối TP. Thủ Đức với Quận 9 cũ và các khu vực phía Đông TP.HCM. Chiều dài khoảng 12 km.',
                },
              ],
            },
          ],
        },
      },
      constructionType: 'road',
      constructionStatus: 'in-progress',
      progress: 75,
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.7891, 10.8123],
          [106.8012, 10.8234],
          [106.8234, 10.8345],
          [106.8456, 10.8456],
          [106.8678, 10.8567],
        ],
      },
      centroid: [106.8234, 10.8345],
      announcedDate: '2019-06-01',
      startDate: '2020-03-15',
      expectedEndDate: '2025-06-30',
      details: {
        budget: 4200000000000,
        fundingSource: 'Ngân sách TP.HCM',
        contractor: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM',
      },
      _status: 'published',
    },
  });
  console.log('✓ Created: Tỉnh lộ 25B');

  // Metro Line 1
  await payload.create({
    collection: 'constructions',
    overrideAccess: true,
    data: {
      title: 'Tuyến Metro số 1 (Bến Thành - Suối Tiên)',
      slug: 'metro-line-1-ben-thanh-suoi-tien',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Tuyến metro số 1 TP.HCM đi từ ga Bến Thành đến depot Suối Tiên, dài 19.7 km với 14 nhà ga (3 ga ngầm, 11 ga trên cao). Dự án sử dụng công nghệ Nhật Bản.',
                },
              ],
            },
          ],
        },
      },
      constructionType: 'metro',
      constructionStatus: 'in-progress',
      progress: 98,
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.6981, 10.7731],
          [106.7048, 10.7789],
          [106.7123, 10.7856],
          [106.7234, 10.7923],
          [106.7456, 10.8012],
          [106.7678, 10.8123],
          [106.7891, 10.8234],
          [106.8012, 10.8345],
          [106.8234, 10.8456],
          [106.8456, 10.8567],
          [106.8678, 10.8678],
          [106.8891, 10.8789],
          [106.9012, 10.8891],
          [106.9234, 10.9012],
        ],
      },
      centroid: [106.8012, 10.8345],
      announcedDate: '2007-11-21',
      startDate: '2012-08-28',
      expectedEndDate: '2024-12-22',
      details: {
        budget: 43757000000000,
        fundingSource: 'Vốn ODA Nhật Bản và ngân sách TP.HCM',
        contractor: 'Liên danh Sumitomo - Cienco 6',
      },
      metroStations: [
        { name: 'Bến Thành', nameEn: 'Ben Thanh', stationOrder: 1, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.6981, 10.7731] } },
        { name: 'Nhà hát Thành phố', nameEn: 'Opera House', stationOrder: 2, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7048, 10.7789] } },
        { name: 'Ba Son', nameEn: 'Ba Son', stationOrder: 3, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7123, 10.7856] } },
        { name: 'Văn Thánh', nameEn: 'Van Thanh', stationOrder: 4, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7234, 10.7923] } },
        { name: 'Tân Cảng', nameEn: 'Tan Cang', stationOrder: 5, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7456, 10.8012] } },
        { name: 'Thảo Điền', nameEn: 'Thao Dien', stationOrder: 6, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7678, 10.8123] } },
        { name: 'An Phú', nameEn: 'An Phu', stationOrder: 7, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.7891, 10.8234] } },
        { name: 'Rạch Chiếc', nameEn: 'Rach Chiec', stationOrder: 8, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8012, 10.8345] } },
        { name: 'Phước Long', nameEn: 'Phuoc Long', stationOrder: 9, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8234, 10.8456] } },
        { name: 'Bình Thái', nameEn: 'Binh Thai', stationOrder: 10, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8456, 10.8567] } },
        { name: 'Thủ Đức', nameEn: 'Thu Duc', stationOrder: 11, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8678, 10.8678] } },
        { name: 'Khu Công Nghệ Cao', nameEn: 'High-Tech Park', stationOrder: 12, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.8891, 10.8789] } },
        { name: 'Đại học Quốc gia', nameEn: 'National University', stationOrder: 13, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.9012, 10.8891] } },
        { name: 'Suối Tiên', nameEn: 'Suoi Tien', stationOrder: 14, stationStatus: 'completed', stationProgress: 100, location: { type: 'Point', coordinates: [106.9234, 10.9012] } },
      ],
      sources: [
        {
          url: 'https://maur.hochiminhcity.gov.vn/',
          title: 'Ban Quản lý Đường sắt Đô thị TP.HCM (MAUR)',
          publishedAt: '2024-01-01',
        },
      ],
      _status: 'published',
    },
  });
  console.log('✓ Created: Metro Line 1 (Bến Thành - Suối Tiên)');

  console.log('\n✅ Seeding complete!');
  console.log('   - 1 admin user (admin@example.com / admin123)');
  console.log('   - 4 construction projects');
  process.exit(0);
};

seedData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
