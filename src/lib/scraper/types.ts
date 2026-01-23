import { ConstructionStatus, ConstructionType } from '../validation';

// Scraper source identifiers
export type ScraperSource = 'vnexpress' | 'tuoitre' | 'government';

// Raw article data from scraping
export interface ScrapedArticle {
  source: ScraperSource;
  sourceUrl: string;
  title: string;
  description?: string;
  content: string;
  publishedAt?: string;
  scrapedAt: string;
}

// Extracted location mention
export interface ExtractedLocation {
  text: string;
  confidence: number;
  coordinates?: [number, number]; // [lng, lat]
  district?: string;
}

// Extracted date mention
export interface ExtractedDate {
  type: 'announced' | 'start' | 'end' | 'mentioned';
  date: string; // ISO date string
  confidence: number;
}

// Processed scraper result
export interface ScraperResult {
  source: ScraperSource;
  sourceUrl: string;
  contentHash: string;
  title: string;
  description?: string;
  rawText: string;
  extractedData: {
    dates: ExtractedDate[];
    locations: ExtractedLocation[];
    constructionType?: ConstructionType;
    status?: ConstructionStatus;
    keywords: string[];
  };
  confidence: number;
  scrapedAt: string;
}

// Scraper run status
export type ScraperRunStatus = 'pending' | 'running' | 'completed' | 'failed';

// Scraper run record
export interface ScraperRun {
  id: string;
  source: ScraperSource;
  status: ScraperRunStatus;
  startedAt: string;
  completedAt?: string;
  articlesFound: number;
  articlesProcessed: number;
  suggestionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

// Scraper configuration
export interface ScraperConfig {
  source: ScraperSource;
  name: string;
  baseUrl: string;
  enabled: boolean;
  keywords: string[];
  maxArticles: number;
  rateLimitMs: number; // Delay between requests
}

// Keywords for construction-related articles (Vietnamese)
export const CONSTRUCTION_KEYWORDS = [
  // General construction
  'xây dựng',
  'công trình',
  'thi công',
  'khởi công',
  'hoàn thành',
  // Road/infrastructure
  'đường',
  'cầu',
  'hầm',
  'cao tốc',
  'quốc lộ',
  // Metro/rail
  'metro',
  'tàu điện',
  'đường sắt',
  'ga',
  // Urban
  'dự án',
  'quy hoạch',
  'khu đô thị',
  'chung cư',
  'cao ốc',
  // Government terms
  'UBND',
  'Sở Giao thông',
  'Sở Xây dựng',
  'đầu tư công',
  'ngân sách',
  // Status
  'chậm tiến độ',
  'đúng tiến độ',
  'hoàn thành',
  'tạm dừng',
];

// HCMC district names for location extraction
export const HCMC_DISTRICTS = [
  // Urban districts
  'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
  'Quận 10', 'Quận 11', 'Quận 12',
  'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú',
  'Thủ Đức', 'Bình Tân',
  // Suburban districts
  'Củ Chi', 'Hóc Môn', 'Bình Chánh', 'Nhà Bè', 'Cần Giờ',
  // Common abbreviations
  'Q1', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q10', 'Q11', 'Q12',
];

// Construction type keyword mapping
export const CONSTRUCTION_TYPE_KEYWORDS: Record<ConstructionType, string[]> = {
  road: ['đường', 'cao tốc', 'quốc lộ', 'tỉnh lộ', 'hương lộ', 'đại lộ'],
  bridge: ['cầu', 'cầu vượt', 'cầu đi bộ'],
  metro: ['metro', 'tàu điện', 'đường sắt', 'ga metro', 'tuyến metro'],
  building: ['cao ốc', 'tòa nhà', 'chung cư', 'trung tâm thương mại'],
  infrastructure: ['hạ tầng', 'điện', 'nước', 'thoát nước', 'chiếu sáng'],
  utility: ['viễn thông', 'cáp ngầm', 'trạm biến áp'],
  other: [],
};

// Status keyword mapping
export const STATUS_KEYWORDS: Record<ConstructionStatus, string[]> = {
  planned: ['quy hoạch', 'dự kiến', 'đề xuất', 'chuẩn bị'],
  in_progress: ['đang thi công', 'triển khai', 'thực hiện', 'tiến hành'],
  delayed: ['chậm tiến độ', 'đình trệ', 'tạm dừng', 'vướng mắc'],
  completed: ['hoàn thành', 'khánh thành', 'đưa vào sử dụng', 'nghiệm thu'],
  cancelled: ['hủy bỏ', 'dừng dự án', 'chấm dứt'],
};
