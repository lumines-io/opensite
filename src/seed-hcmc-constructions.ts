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

// Major constructions data for Ho Chi Minh City from 2010
const hcmcConstructions = [
  // ============================================
  // METRO LINES
  // ============================================
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
        [106.6981, 10.7731], // Bến Thành
        [106.7025, 10.7765], // Nhà hát TP
        [106.7089, 10.7836], // Ba Son
        [106.7178, 10.7925], // Văn Thánh
        [106.7267, 10.8014], // Tân Cảng
        [106.7456, 10.8089], // Thảo Điền
        [106.7623, 10.8178], // An Phú
        [106.7834, 10.8267], // Rạch Chiếc
        [106.8012, 10.8356], // Phước Long
        [106.8189, 10.8445], // Bình Thái
        [106.8378, 10.8534], // Thủ Đức
        [106.8567, 10.8623], // Khu CNC
        [106.8756, 10.8712], // ĐHQG
        [106.9012, 10.8834], // Suối Tiên
      ],
    },
    centroid: [106.7834, 10.8267],
    announcedDate: '2007-11-21',
    startDate: '2012-08-28',
    expectedEndDate: '2024-12-22',
    actualEndDate: '2024-12-22',
    details: {
      budget: 43757000000000, // ~$2.05 billion
      fundingSource: 'Vốn ODA Nhật Bản (JICA) và ngân sách TP.HCM',
      contractor: 'Liên danh Sumitomo Corporation - CIENCO 6',
    },
    metroStations: [
      {
        name: 'Bến Thành',
        nameEn: 'Ben Thanh',
        stationOrder: 1,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.6981, 10.7731] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Nhà hát Thành phố',
        nameEn: 'Opera House',
        stationOrder: 2,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7025, 10.7765] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Ba Son',
        nameEn: 'Ba Son',
        stationOrder: 3,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7089, 10.7836] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Văn Thánh',
        nameEn: 'Van Thanh',
        stationOrder: 4,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7178, 10.7925] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Tân Cảng',
        nameEn: 'Tan Cang',
        stationOrder: 5,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7267, 10.8014] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Thảo Điền',
        nameEn: 'Thao Dien',
        stationOrder: 6,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7456, 10.8089] },
        openedAt: '2024-12-22',
      },
      {
        name: 'An Phú',
        nameEn: 'An Phu',
        stationOrder: 7,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7623, 10.8178] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Rạch Chiếc',
        nameEn: 'Rach Chiec',
        stationOrder: 8,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.7834, 10.8267] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Phước Long',
        nameEn: 'Phuoc Long',
        stationOrder: 9,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.8012, 10.8356] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Bình Thái',
        nameEn: 'Binh Thai',
        stationOrder: 10,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.8189, 10.8445] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Thủ Đức',
        nameEn: 'Thu Duc',
        stationOrder: 11,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.8378, 10.8534] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Khu Công Nghệ Cao',
        nameEn: 'High-Tech Park',
        stationOrder: 12,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.8567, 10.8623] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Đại học Quốc gia',
        nameEn: 'National University',
        stationOrder: 13,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.8756, 10.8712] },
        openedAt: '2024-12-22',
      },
      {
        name: 'Suối Tiên',
        nameEn: 'Suoi Tien',
        stationOrder: 14,
        stationStatus: 'completed',
        stationProgress: 100,
        location: { type: 'Point', coordinates: [106.9012, 10.8834] },
        openedAt: '2024-12-22',
      },
    ],
    sources: [
      {
        url: 'https://maur.hochiminhcity.gov.vn/',
        title: 'Ban Quản lý Đường sắt Đô thị TP.HCM (MAUR)',
        publishedAt: '2024-12-22',
      },
    ],
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
        [106.6981, 10.7731], // Bến Thành (chung với Line 1)
        [106.6889, 10.7756], // Tao Đàn
        [106.6734, 10.7812], // Dân Chủ
        [106.6623, 10.7889], // Hòa Hưng
        [106.6567, 10.7978], // Lê Thị Riêng
        [106.6512, 10.8089], // Phạm Văn Hai
        [106.6478, 10.8212], // Bà Quẹo
        [106.6423, 10.8334], // Phạm Văn Bạch
        [106.6389, 10.8467], // Tân Bình
        [106.6345, 10.8623], // Tham Lương
      ],
    },
    centroid: [106.6567, 10.8089],
    announcedDate: '2010-03-15',
    startDate: '2022-09-26',
    expectedEndDate: '2030-12-31',
    details: {
      budget: 30000000000000, // ~$1.4 billion
      fundingSource: 'Vốn ODA Đức (KfW), ADB, EIB và ngân sách TP.HCM',
      contractor: 'Liên danh GS Engineering & Construction - Hyundai',
    },
    metroStations: [
      {
        name: 'Bến Thành',
        nameEn: 'Ben Thanh',
        stationOrder: 1,
        stationStatus: 'in-progress',
        stationProgress: 20,
        location: { type: 'Point', coordinates: [106.6981, 10.7731] },
      },
      {
        name: 'Tao Đàn',
        nameEn: 'Tao Dan',
        stationOrder: 2,
        stationStatus: 'in-progress',
        stationProgress: 15,
        location: { type: 'Point', coordinates: [106.6889, 10.7756] },
      },
      {
        name: 'Dân Chủ',
        nameEn: 'Dan Chu',
        stationOrder: 3,
        stationStatus: 'in-progress',
        stationProgress: 10,
        location: { type: 'Point', coordinates: [106.6734, 10.7812] },
      },
      {
        name: 'Hòa Hưng',
        nameEn: 'Hoa Hung',
        stationOrder: 4,
        stationStatus: 'planned',
        stationProgress: 5,
        location: { type: 'Point', coordinates: [106.6623, 10.7889] },
      },
      {
        name: 'Lê Thị Riêng',
        nameEn: 'Le Thi Rieng',
        stationOrder: 5,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6567, 10.7978] },
      },
      {
        name: 'Phạm Văn Hai',
        nameEn: 'Pham Van Hai',
        stationOrder: 6,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6512, 10.8089] },
      },
      {
        name: 'Bà Quẹo',
        nameEn: 'Ba Queo',
        stationOrder: 7,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6478, 10.8212] },
      },
      {
        name: 'Phạm Văn Bạch',
        nameEn: 'Pham Van Bach',
        stationOrder: 8,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6423, 10.8334] },
      },
      {
        name: 'Tân Bình',
        nameEn: 'Tan Binh',
        stationOrder: 9,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6389, 10.8467] },
      },
      {
        name: 'Tham Lương',
        nameEn: 'Tham Luong',
        stationOrder: 10,
        stationStatus: 'planned',
        stationProgress: 0,
        location: { type: 'Point', coordinates: [106.6345, 10.8623] },
      },
    ],
    sources: [
      {
        url: 'https://maur.hochiminhcity.gov.vn/',
        title: 'Ban Quản lý Đường sắt Đô thị TP.HCM - Metro Line 2',
        publishedAt: '2024-01-01',
      },
    ],
  },

  // ============================================
  // RING ROADS & EXPRESSWAYS
  // ============================================
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
        [106.7523, 10.8456], // Thủ Đức
        [106.7234, 10.8623], // An Phú
        [106.6945, 10.8534], // Bình Thạnh
        [106.6656, 10.8345], // Gò Vấp
        [106.6367, 10.8156], // Quận 12
        [106.6078, 10.7967], // Bình Tân
        [106.5789, 10.7678], // Bình Chánh
        [106.5945, 10.7345], // Quận 7
        [106.6234, 10.7123], // Quận 7 (gần Phú Mỹ Hưng)
        [106.6789, 10.6945], // Nhà Bè
      ],
    },
    centroid: [106.6567, 10.7945],
    announcedDate: '2010-05-15',
    startDate: '2018-03-15',
    expectedEndDate: '2025-12-31',
    details: {
      budget: 38000000000000, // ~$1.8 billion
      fundingSource: 'Ngân sách TP.HCM và vốn xã hội hóa',
      contractor: 'Nhiều nhà thầu theo từng phân đoạn',
    },
    sources: [
      {
        url: 'https://sggp.org.vn/',
        title: 'Tiến độ đường Vành đai 2 TP.HCM',
        publishedAt: '2024-06-15',
      },
    ],
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
        [106.8847, 10.8789], // Tân Vạn (Bình Dương)
        [106.8456, 10.8945], // Thủ Đức
        [106.7923, 10.8812], // Quận 12
        [106.7234, 10.8567], // Hóc Môn
        [106.6545, 10.8123], // Củ Chi
        [106.5856, 10.7678], // Bình Chánh
        [106.5167, 10.7034], // Bến Lức (Long An)
        [106.5523, 10.6345], // Cần Giuộc
        [106.6345, 10.5856], // Nhơn Trạch (Đồng Nai)
        [106.7523, 10.5678], // Long Thành
        [106.8234, 10.6234], // Kết nối cao tốc
        [106.8847, 10.8789], // Khép kín vành đai
      ],
    },
    centroid: [106.7034, 10.7623],
    announcedDate: '2022-06-15',
    startDate: '2023-06-18',
    expectedEndDate: '2027-06-30',
    details: {
      budget: 75378000000000, // ~$3.2 billion
      fundingSource: 'Ngân sách nhà nước trung ương và địa phương',
      contractor: 'Liên danh các nhà thầu trong nước',
    },
    sources: [
      {
        url: 'https://thuvienphapluat.vn/van-ban/Xay-dung-Do-thi/Nghi-quyet-57-2022-QH15-chu-truong-dau-tu-duong-Vanh-dai-3-Ho-Chi-Minh-520366.aspx',
        title: 'Nghị quyết 57/2022/QH15 về chủ trương đầu tư đường Vành đai 3',
        publishedAt: '2022-06-16',
      },
    ],
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
        [106.9234, 10.9512], // Bình Dương
        [106.8012, 10.9723], // Tân Uyên
        [106.6789, 10.9534], // Củ Chi
        [106.5567, 10.8945], // Tây Ninh
        [106.4345, 10.7856], // Trảng Bàng
        [106.3523, 10.6567], // Long An
        [106.4234, 10.5178], // Cần Giuộc
        [106.5456, 10.4389], // Nhà Bè
        [106.7234, 10.3856], // Cần Giờ
        [106.9012, 10.4567], // Bà Rịa - Vũng Tàu
        [107.0234, 10.5678], // Long Thành
        [106.9234, 10.9512], // Khép kín
      ],
    },
    centroid: [106.6234, 10.6945],
    announcedDate: '2023-01-15',
    startDate: '2025-06-01',
    expectedEndDate: '2030-12-31',
    details: {
      budget: 100000000000000, // ~$4.5 billion
      fundingSource: 'Ngân sách nhà nước và vốn PPP',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Quy hoạch đường Vành đai 4 vùng TP.HCM',
        publishedAt: '2023-06-15',
      },
    ],
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
      coordinates: [
        [106.8923, 10.6234], // Long Thành
        [106.8234, 10.5945], // Nhơn Trạch
        [106.7545, 10.5656], // Cần Giuộc
        [106.6856, 10.5367], // Cần Đước
        [106.6167, 10.5078], // Bến Lức
        [106.5478, 10.4789], // Kết nối cao tốc Trung Lương
      ],
    },
    centroid: [106.7234, 10.5512],
    announcedDate: '2010-09-15',
    startDate: '2014-07-01',
    expectedEndDate: '2025-12-31',
    details: {
      budget: 40000000000000, // ~$1.9 billion total (both phases)
      fundingSource: 'Vốn vay ADB và ngân sách nhà nước',
      contractor: 'Posco E&C, Sumitomo và các nhà thầu trong nước',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Cao tốc Bến Lức - Long Thành sắp hoàn thành',
        publishedAt: '2024-09-15',
      },
    ],
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
      coordinates: [
        [106.7523, 10.8234], // TP. Thủ Đức
        [106.8234, 10.7945], // Long Bình
        [106.8945, 10.7656], // Long Thành
        [106.9656, 10.7367], // Dầu Giây
      ],
    },
    centroid: [106.8589, 10.7800],
    announcedDate: '2009-01-15',
    startDate: '2009-10-15',
    expectedEndDate: '2015-02-08',
    actualEndDate: '2015-02-08',
    details: {
      budget: 20630000000000, // ~$1.1 billion
      fundingSource: 'Vốn vay ADB, JICA và ngân sách nhà nước',
      contractor: 'Liên danh Posco - Lotte - GS E&C',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cao tốc Long Thành - Dầu Giây',
        publishedAt: '2015-02-08',
      },
    ],
  },

  // ============================================
  // BRIDGES
  // ============================================
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
      coordinates: [
        [106.7089, 10.7812], // Quận 1 (Ba Son)
        [106.7145, 10.7834],
        [106.7212, 10.7856],
        [106.7278, 10.7878], // Thủ Thiêm
      ],
    },
    centroid: [106.7178, 10.7845],
    announcedDate: '2015-02-15',
    startDate: '2015-06-15',
    expectedEndDate: '2018-12-31',
    actualEndDate: '2022-04-28',
    details: {
      budget: 1800000000000, // ~$86 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Tổng công ty Xây dựng Số 1 (CC1)',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cầu Thủ Thiêm 2',
        publishedAt: '2022-04-28',
      },
    ],
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
      coordinates: [
        [106.7234, 10.7534], // Quận 7
        [106.7323, 10.7612],
        [106.7412, 10.7689], // Thủ Thiêm
      ],
    },
    centroid: [106.7323, 10.7612],
    announcedDate: '2020-06-15',
    startDate: '2025-06-01',
    expectedEndDate: '2028-12-31',
    details: {
      budget: 5000000000000, // ~$220 million
      fundingSource: 'Ngân sách TP.HCM và vốn PPP',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Quy hoạch cầu Thủ Thiêm 4',
        publishedAt: '2024-03-15',
      },
    ],
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
      coordinates: [
        [106.8234, 10.7623], // TP. Thủ Đức
        [106.8412, 10.7534],
        [106.8589, 10.7445],
        [106.8767, 10.7356], // Nhơn Trạch
      ],
    },
    centroid: [106.8501, 10.7490],
    announcedDate: '2020-12-15',
    startDate: '2024-03-15',
    expectedEndDate: '2027-12-31',
    details: {
      budget: 7500000000000, // ~$330 million
      fundingSource: 'Ngân sách TP.HCM và tỉnh Đồng Nai',
      contractor: 'Liên danh Tổng công ty 36 và các nhà thầu',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khởi công cầu Cát Lái',
        publishedAt: '2024-03-15',
      },
    ],
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
      coordinates: [
        [106.7523, 10.6234], // Nhà Bè
        [106.7612, 10.6089],
        [106.7701, 10.5945], // Cần Giờ
      ],
    },
    centroid: [106.7612, 10.6089],
    announcedDate: '2021-06-15',
    startDate: '2025-03-01',
    expectedEndDate: '2028-12-31',
    details: {
      budget: 9000000000000, // ~$400 million
      fundingSource: 'Ngân sách TP.HCM và vốn PPP',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Quy hoạch cầu Cần Giờ',
        publishedAt: '2024-01-15',
      },
    ],
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
      coordinates: [
        [106.6234, 10.7345], // Quận 8
        [106.6189, 10.7289],
        [106.6145, 10.7234], // Bình Chánh
      ],
    },
    centroid: [106.6189, 10.7289],
    announcedDate: '2019-01-15',
    startDate: '2019-06-15',
    expectedEndDate: '2022-06-30',
    actualEndDate: '2022-05-15',
    details: {
      budget: 1000000000000, // ~$45 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Công ty CP Xây dựng Công trình 568',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cầu Nhị Thiên Đường',
        publishedAt: '2022-05-15',
      },
    ],
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
      coordinates: [
        [106.7523, 10.7478], // Quận 7
        [106.7612, 10.7534],
        [106.7701, 10.7589], // TP. Thủ Đức
      ],
    },
    centroid: [106.7612, 10.7534],
    announcedDate: '2005-06-15',
    startDate: '2005-09-15',
    expectedEndDate: '2009-09-02',
    actualEndDate: '2009-09-02',
    details: {
      budget: 2100000000000, // ~$118 million (2009 USD)
      fundingSource: 'Vốn BOT',
      contractor: 'Công ty Cổ phần Đầu tư Hạ tầng Kỹ thuật TP.HCM (CII)',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cầu Phú Mỹ',
        publishedAt: '2009-09-02',
      },
    ],
  },

  // ============================================
  // TUNNELS
  // ============================================
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
      coordinates: [
        [106.7045, 10.7856], // Quận 1
        [106.7123, 10.7867],
        [106.7201, 10.7878], // Thủ Thiêm
      ],
    },
    centroid: [106.7123, 10.7867],
    announcedDate: '2005-02-15',
    startDate: '2005-03-31',
    expectedEndDate: '2011-11-20',
    actualEndDate: '2011-11-20',
    details: {
      budget: 7500000000000, // ~$352 million
      fundingSource: 'Vốn vay JICA',
      contractor: 'Liên danh Obayashi (Nhật Bản) và các nhà thầu',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành hầm Thủ Thiêm',
        publishedAt: '2011-11-20',
      },
    ],
  },

  // ============================================
  // AIRPORTS
  // ============================================
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
      coordinates: [
        [
          [106.9523, 10.9834],
          [106.9834, 10.9834],
          [106.9834, 10.9523],
          [106.9523, 10.9523],
          [106.9523, 10.9834],
        ],
      ],
    },
    centroid: [106.9678, 10.9678],
    announcedDate: '2020-01-15',
    startDate: '2021-01-05',
    expectedEndDate: '2026-12-31',
    details: {
      budget: 100000000000000, // ~$4.5 billion
      fundingSource: 'Vốn nhà nước, ODA và vốn doanh nghiệp (ACV)',
      contractor: 'Tổng công ty Cảng hàng không Việt Nam (ACV) và các nhà thầu',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ xây dựng sân bay Long Thành',
        publishedAt: '2024-12-15',
      },
    ],
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
      coordinates: [
        [
          [106.6567, 10.8234],
          [106.6678, 10.8234],
          [106.6678, 10.8123],
          [106.6567, 10.8123],
          [106.6567, 10.8234],
        ],
      ],
    },
    centroid: [106.6623, 10.8178],
    announcedDate: '2021-06-15',
    startDate: '2022-12-24',
    expectedEndDate: '2025-12-31',
    details: {
      budget: 19000000000000, // ~$885 million
      fundingSource: 'Vốn doanh nghiệp (ACV)',
      contractor: 'Tổng công ty Cảng hàng không Việt Nam (ACV)',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khởi công nhà ga T3 Tân Sơn Nhất',
        publishedAt: '2022-12-24',
      },
    ],
  },

  // ============================================
  // FLOOD CONTROL & INFRASTRUCTURE
  // ============================================
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
      coordinates: [
        [106.7012, 10.8234], // Bình Thạnh
        [106.6845, 10.7945], // Quận 1
        [106.6678, 10.7656], // Quận 4
        [106.6512, 10.7367], // Quận 7
        [106.6345, 10.7078], // Nhà Bè
      ],
    },
    centroid: [106.6678, 10.7656],
    announcedDate: '2016-06-15',
    startDate: '2016-06-26',
    expectedEndDate: '2025-12-31',
    details: {
      budget: 12000000000000, // ~$527 million
      fundingSource: 'Vốn vay ODA Nhật Bản và ngân sách TP.HCM',
      contractor: 'Trung Nam Group',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ dự án chống ngập TP.HCM',
        publishedAt: '2024-09-15',
      },
    ],
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
      coordinates: [
        [106.6678, 10.7823], // Phú Nhuận
        [106.6834, 10.7867], // Quận 3
        [106.6989, 10.7912], // Bình Thạnh
        [106.7145, 10.7956], // Cửa sông
      ],
    },
    centroid: [106.6911, 10.7889],
    announcedDate: '2003-06-15',
    startDate: '2003-09-15',
    expectedEndDate: '2012-12-31',
    actualEndDate: '2012-06-15',
    details: {
      budget: 7000000000000, // ~$320 million
      fundingSource: 'Vốn vay Ngân hàng Thế giới (WB)',
      contractor: 'Liên danh các nhà thầu trong và ngoài nước',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Hoàn thành cải tạo kênh Nhiêu Lộc - Thị Nghè',
        publishedAt: '2012-06-15',
      },
    ],
  },

  // ============================================
  // ADDITIONAL ROADS
  // ============================================
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
      budget: 8500000000000, // ~$370 million
      fundingSource: 'Ngân sách TP.HCM và tỉnh Đồng Nai',
      contractor: 'Tổng công ty Xây dựng Số 1',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ Tỉnh lộ 25C',
        publishedAt: '2024-06-15',
      },
    ],
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
      budget: 4200000000000, // ~$185 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ Tỉnh lộ 25B',
        publishedAt: '2024-03-15',
      },
    ],
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
      coordinates: [
        [106.6523, 10.8167], // Cộng Hòa
        [106.6612, 10.8212],
        [106.6701, 10.8256], // Tân Sơn Nhất
      ],
    },
    centroid: [106.6612, 10.8212],
    announcedDate: '2020-06-15',
    startDate: '2021-03-15',
    expectedEndDate: '2025-06-30',
    details: {
      budget: 4800000000000, // ~$210 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Liên danh Hòa Bình - Coteccons',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ đường Trần Quốc Hoàn',
        publishedAt: '2024-06-15',
      },
    ],
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
      coordinates: [
        [106.7234, 10.8678], // TP. Thủ Đức
        [106.7156, 10.8789],
        [106.7078, 10.8901],
        [106.7001, 10.9012], // Bình Dương
      ],
    },
    centroid: [106.7117, 10.8845],
    announcedDate: '2018-06-15',
    startDate: '2022-09-15',
    expectedEndDate: '2026-12-31',
    details: {
      budget: 9800000000000, // ~$430 million
      fundingSource: 'Ngân sách TP.HCM và vốn PPP',
      contractor: 'Liên danh các nhà thầu',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ mở rộng Quốc lộ 13',
        publishedAt: '2024-09-15',
      },
    ],
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
    details: {
      budget: 3400000000000, // ~$150 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Liên danh Tổng công ty 36 và các nhà thầu',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ nút giao An Phú',
        publishedAt: '2024-06-15',
      },
    ],
  },

  // ============================================
  // ADDITIONAL METRO LINES
  // ============================================
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
      coordinates: [
        [106.6981, 10.7731], // Bến Thành
        [106.6856, 10.7678], // Hàm Nghi
        [106.6712, 10.7623], // Trần Hưng Đạo
        [106.6567, 10.7567], // An Dương Vương
        [106.6423, 10.7512], // Phú Lâm
        [106.6278, 10.7456], // Bình Phú
        [106.6134, 10.7401], // An Lạc
        [106.5989, 10.7345], // Tân Kiên
      ],
    },
    centroid: [106.6485, 10.7538],
    announcedDate: '2018-06-15',
    startDate: '2025-12-01',
    expectedEndDate: '2035-12-31',
    details: {
      budget: 68000000000000, // ~$2.8 billion
      fundingSource: 'Vốn ODA và ngân sách TP.HCM',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://maur.hochiminhcity.gov.vn/',
        title: 'Quy hoạch tuyến Metro số 3a',
        publishedAt: '2024-01-01',
      },
    ],
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
      coordinates: [
        [106.6234, 10.7234], // Bến xe Cần Giuộc
        [106.6356, 10.7312], // Quận 8
        [106.6478, 10.7389], // Bình Tây
        [106.6612, 10.7467], // Chợ Lớn
        [106.6745, 10.7545], // Hòa Bình
        [106.6878, 10.7623], // Lý Thái Tổ
        [106.7012, 10.7701], // Lê Hồng Phong
        [106.7145, 10.7778], // Cầu Sài Gòn
      ],
    },
    centroid: [106.6689, 10.7506],
    announcedDate: '2019-09-15',
    startDate: '2027-01-01',
    expectedEndDate: '2036-12-31',
    details: {
      budget: 40000000000000, // ~$1.7 billion
      fundingSource: 'Vốn ODA Tây Ban Nha, ADB và ngân sách',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://maur.hochiminhcity.gov.vn/',
        title: 'Quy hoạch tuyến Metro số 5',
        publishedAt: '2024-01-01',
      },
    ],
  },

  // ============================================
  // ADDITIONAL EXPRESSWAYS
  // ============================================
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
      coordinates: [
        [106.6234, 10.8456], // TP.HCM (Củ Chi)
        [106.5945, 10.8678], // Trảng Bàng
        [106.5656, 10.8901], // Gò Dầu
        [106.5367, 10.9123], // Bến Cầu
        [106.5078, 10.9345], // Mộc Bài
      ],
    },
    centroid: [106.5656, 10.8901],
    announcedDate: '2021-06-15',
    startDate: '2025-06-01',
    expectedEndDate: '2028-12-31',
    details: {
      budget: 25000000000000, // ~$1.1 billion
      fundingSource: 'Vốn PPP và ngân sách nhà nước',
      contractor: 'Chưa xác định',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Quy hoạch cao tốc TP.HCM - Mộc Bài',
        publishedAt: '2024-03-15',
      },
    ],
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
      coordinates: [
        [106.8678, 10.8945], // Biên Hòa
        [106.9123, 10.8456], // Long Thành
        [106.9567, 10.7967], // Phú Mỹ
        [107.0012, 10.7478], // Long Hải
        [107.0456, 10.6989], // Vũng Tàu
      ],
    },
    centroid: [106.9567, 10.7967],
    announcedDate: '2020-09-15',
    startDate: '2023-06-15',
    expectedEndDate: '2027-12-31',
    details: {
      budget: 17800000000000, // ~$780 million
      fundingSource: 'Ngân sách nhà nước và vốn PPP',
      contractor: 'Liên danh các nhà thầu trong nước',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khởi công cao tốc Biên Hòa - Vũng Tàu',
        publishedAt: '2023-06-15',
      },
    ],
  },

  // ============================================
  // ADDITIONAL BRIDGES
  // ============================================
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
      coordinates: [
        [106.7234, 10.6534], // Nhà Bè
        [106.7389, 10.6389],
        [106.7545, 10.6245], // Cần Giờ
      ],
    },
    centroid: [106.7389, 10.6389],
    announcedDate: '2015-06-15',
    startDate: '2023-03-15',
    expectedEndDate: '2026-12-31',
    details: {
      budget: 3500000000000, // ~$155 million
      fundingSource: 'Vốn vay ADB và ngân sách nhà nước',
      contractor: 'Liên danh nhà thầu Nhật Bản - Việt Nam',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ cầu Bình Khánh',
        publishedAt: '2024-06-15',
      },
    ],
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
      coordinates: [
        [106.3678, 10.3456], // Tiền Giang
        [106.3834, 10.3367],
        [106.3989, 10.3278], // Bến Tre
      ],
    },
    centroid: [106.3834, 10.3367],
    announcedDate: '2019-09-15',
    startDate: '2021-03-15',
    expectedEndDate: '2024-06-30',
    actualEndDate: '2024-04-27',
    details: {
      budget: 5200000000000, // ~$230 million
      fundingSource: 'Ngân sách nhà nước',
      contractor: 'Liên danh Tổng công ty 36 - Cienco 4',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cầu Rạch Miễu 2',
        publishedAt: '2024-04-27',
      },
    ],
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
      coordinates: [
        [105.9123, 10.2567], // Tiền Giang
        [105.9234, 10.2456],
        [105.9345, 10.2345], // Vĩnh Long
      ],
    },
    centroid: [105.9234, 10.2456],
    announcedDate: '2018-12-15',
    startDate: '2020-02-28',
    expectedEndDate: '2023-12-31',
    actualEndDate: '2023-12-24',
    details: {
      budget: 5000000000000, // ~$220 million
      fundingSource: 'Ngân sách nhà nước',
      contractor: 'Tổng công ty Xây dựng Trường Sơn',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Khánh thành cầu Mỹ Thuận 2',
        publishedAt: '2023-12-24',
      },
    ],
  },

  // ============================================
  // ADDITIONAL INTERCHANGES
  // ============================================
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
    details: {
      budget: 2800000000000, // ~$125 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Tổng công ty Xây dựng Số 1',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ nút giao Mỹ Thủy',
        publishedAt: '2024-06-15',
      },
    ],
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
    details: {
      budget: 1500000000000, // ~$66 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ nút giao Nguyễn Văn Linh',
        publishedAt: '2024-06-15',
      },
    ],
  },

  // ============================================
  // ADDITIONAL ROADS
  // ============================================
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
      coordinates: [
        [106.6923, 10.7456], // Cầu Kênh Tẻ
        [106.6978, 10.7312],
        [106.7034, 10.7167],
        [106.7089, 10.7023], // Nguyễn Văn Linh
      ],
    },
    centroid: [106.7006, 10.7239],
    announcedDate: '2019-06-15',
    startDate: '2020-12-15',
    expectedEndDate: '2025-12-31',
    details: {
      budget: 6800000000000, // ~$300 million
      fundingSource: 'Ngân sách TP.HCM và vốn PPP',
      contractor: 'Liên danh Hòa Bình - IDICO',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ mở rộng đường Nguyễn Hữu Thọ',
        publishedAt: '2024-06-15',
      },
    ],
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
      coordinates: [
        [106.6623, 10.8189], // Cộng Hòa (tiếp nối)
        [106.6678, 10.8212],
        [106.6734, 10.8234], // Nhà ga T3
      ],
    },
    centroid: [106.6678, 10.8212],
    announcedDate: '2022-06-15',
    startDate: '2023-06-15',
    expectedEndDate: '2026-06-30',
    details: {
      budget: 2500000000000, // ~$110 million
      fundingSource: 'Ngân sách TP.HCM',
      contractor: 'Liên danh Hòa Bình - Coteccons',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ đường Trần Quốc Hoàn giai đoạn 2',
        publishedAt: '2024-06-15',
      },
    ],
  },

  // ============================================
  // ADDITIONAL FLOOD CONTROL
  // ============================================
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
      coordinates: [
        [106.6145, 10.8567], // Quận 12
        [106.6012, 10.8389], // Tân Phú
        [106.5878, 10.8212], // Bình Tân
        [106.5745, 10.8034], // Bình Chánh
      ],
    },
    centroid: [106.5945, 10.8301],
    announcedDate: '2017-06-15',
    startDate: '2019-09-15',
    expectedEndDate: '2026-12-31',
    details: {
      budget: 8000000000000, // ~$350 million
      fundingSource: 'Vốn vay Ngân hàng Thế giới và ngân sách TP.HCM',
      contractor: 'Liên danh các nhà thầu trong nước',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ cải tạo kênh Tham Lương',
        publishedAt: '2024-06-15',
      },
    ],
  },

  // ============================================
  // PORTS
  // ============================================
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
      coordinates: [
        [
          [106.7956, 10.7534],
          [106.8123, 10.7534],
          [106.8123, 10.7389],
          [106.7956, 10.7389],
          [106.7956, 10.7534],
        ],
      ],
    },
    centroid: [106.8039, 10.7462],
    announcedDate: '2019-06-15',
    startDate: '2020-12-15',
    expectedEndDate: '2026-12-31',
    details: {
      budget: 4500000000000, // ~$200 million
      fundingSource: 'Vốn doanh nghiệp (Tân Cảng Sài Gòn)',
      contractor: 'Tổng công ty Tân Cảng Sài Gòn',
    },
    sources: [
      {
        url: 'https://vnexpress.net/',
        title: 'Tiến độ mở rộng cảng Cát Lái',
        publishedAt: '2024-06-15',
      },
    ],
  },
];

// Note: Private/sponsor constructions have been moved to the Developments collection.
// Use seed-developments.ts to seed private development projects.

const seedHCMCConstructions = async () => {
  const payload = await getPayload({ config });

  // Check for --clear flag
  const shouldClear = process.argv.includes('--clear');

  console.log('🏗️  Seeding HCMC major construction data (2010-present)...\n');

  if (shouldClear) {
    console.log('🗑️  --clear flag detected. Removing all existing construction data...');
    const existing = await payload.find({
      collection: 'constructions',
      limit: 1000,
    });

    let deleted = 0;
    for (const doc of existing.docs) {
      await payload.delete({
        collection: 'constructions',
        id: doc.id,
        overrideAccess: true,
      });
      deleted++;
    }
    console.log(`🗑️  Deleted ${deleted} existing records\n`);
  }

  console.log('=' .repeat(60));

  let created = 0;
  let updated = 0;

  for (const construction of hcmcConstructions) {
    // Check if construction already exists
    const existing = await payload.find({
      collection: 'constructions',
      where: { slug: { equals: construction.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      // Update existing record
      try {
        await payload.update({
          collection: 'constructions',
          id: existing.docs[0].id,
          overrideAccess: true,
          data: {
            ...construction,
            _status: 'published',
          },
        });
        console.log(`🔄 Updated: ${construction.title}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${construction.title}:`, error);
      }
      continue;
    }

    try {
      await payload.create({
        collection: 'constructions',
        overrideAccess: true,
        data: {
          ...construction,
          _status: 'published',
        },
      });
      console.log(`✅ Created: ${construction.title}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${construction.title}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   📍 Total: ${hcmcConstructions.length}`);
  console.log('\n🎉 HCMC construction data seeding complete!');
  console.log('\n💡 Note: For private/sponsor developments, run seed:developments');

  process.exit(0);
};

seedHCMCConstructions().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
