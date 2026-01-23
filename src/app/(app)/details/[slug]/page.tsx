import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import {
  ChevronLeft,
  Pencil,
  Map,
  DollarSign,
  Clock,
  Building2,
  Calendar,
  FileText,
  ClipboardList,
  MapPin,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { ChangelogTimeline } from '@/components/ChangelogTimeline';
import { ImageGallery } from './ImageGallery';
import { ProgressRing } from './ProgressRing';
import { MiniMap } from './MiniMap';
import { TimelineVisual } from './TimelineVisual';
import { MetroLineVisualization } from './MetroLineVisualization';
import { PageContent } from './PageContent';
import { DevelopmentDetailContent } from './DevelopmentDetailContent';

// Construction status colors and labels
const STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string; icon: string }> = {
  planned: { color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', label: 'Kế hoạch', icon: '📋' },
  'in-progress': { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', label: 'Đang thi công', icon: '🚧' },
  completed: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', label: 'Hoàn thành', icon: '✅' },
  paused: { color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', label: 'Tạm dừng', icon: '⏸️' },
  cancelled: { color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: 'Đã hủy', icon: '❌' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  road: { label: 'Công trình đường', icon: '🛣️', color: 'bg-blue-500' },
  highway: { label: 'Cao tốc', icon: '🛤️', color: 'bg-indigo-500' },
  metro: { label: 'Metro', icon: '🚇', color: 'bg-purple-500' },
  bridge: { label: 'Cầu', icon: '🌉', color: 'bg-cyan-500' },
  tunnel: { label: 'Hầm', icon: '🚇', color: 'bg-slate-500' },
  interchange: { label: 'Nút giao', icon: '🔀', color: 'bg-orange-500' },
  station: { label: 'Trạm', icon: '🚉', color: 'bg-teal-500' },
  other: { label: 'Khác', icon: '🏗️', color: 'bg-gray-500' },
};

// Helper function to find item in constructions or developments
async function findBySlug(slug: string) {
  const payload = await getPayload({ config });

  // First, try constructions
  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    where: {
      slug: { equals: slug },
      _status: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  });

  if (constructions.length > 0) {
    return { type: 'construction' as const, data: constructions[0] };
  }

  // If not found in constructions, try developments
  const { docs: developments } = await payload.find({
    collection: 'developments',
    where: {
      slug: { equals: slug },
      approvalStatus: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  });

  if (developments.length > 0) {
    return { type: 'development' as const, data: developments[0] };
  }

  return null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConstructionDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const result = await findBySlug(slug);

  if (!result) {
    notFound();
  }

  // If it's a development, render the development content
  if (result.type === 'development') {
    return <DevelopmentDetailContent development={result.data} slug={slug} />;
  }

  // Otherwise, it's a construction - render the existing construction content
  const construction = result.data;
  const statusConfig = STATUS_CONFIG[construction.constructionStatus] || STATUS_CONFIG.planned;
  const typeConfig = TYPE_CONFIG[construction.constructionType] || TYPE_CONFIG.other;

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate days until completion or days since start
  const calculateDaysInfo = () => {
    const now = new Date();
    if (construction.expectedEndDate) {
      const end = new Date(construction.expectedEndDate);
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) return { label: 'Còn lại', value: diff, unit: 'ngày' };
      if (diff < 0) return { label: 'Quá hạn', value: Math.abs(diff), unit: 'ngày', overdue: true };
    }
    if (construction.startDate) {
      const start = new Date(construction.startDate);
      const diff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) return { label: 'Đã thi công', value: diff, unit: 'ngày' };
    }
    return null;
  };

  const daysInfo = calculateDaysInfo();

  // Get images array
  const images = construction.images?.map((img: { image?: { url?: string } | string; caption?: string | null; takenAt?: string | null }) => ({
    url: typeof img.image === 'object' ? img.image?.url : null,
    caption: img.caption,
    takenAt: img.takenAt,
  })).filter((img: { url: string | null }) => img.url) || [];

  // Get centroid for map
  const centroid = construction.centroid as [number, number] | null;

  return (
    <PageContent>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </span>
            <span className="font-medium">Quay lại</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/details/${slug}/suggest`}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
            >
              <Pencil className="w-4 h-4" />
              Đề xuất thay đổi
            </Link>
            <Link
              href={`/?construction=${slug}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Map className="w-4 h-4" />
              Xem trên bản đồ
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative">
        {images.length > 0 ? (
          <ImageGallery images={images} />
        ) : (
          <div className={`h-48 md:h-64 ${typeConfig.color} bg-opacity-20 flex items-center justify-center`}>
            <div className="text-center">
              <span className="text-6xl mb-2 block">{typeConfig.icon}</span>
              <span className="text-slate-600 font-medium">{typeConfig.label}</span>
            </div>
          </div>
        )}

        {/* Floating status badge */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-md ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
            <span>{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 -mt-6 relative z-10">
        {/* Title Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${typeConfig.color}`} />
                <span className="text-sm text-slate-500 font-medium">{typeConfig.label}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                {construction.title}
              </h1>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 md:gap-6">
                {construction.details?.budget && (
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Ngân sách</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(construction.details.budget)}</p>
                    </div>
                  </div>
                )}

                {daysInfo && (
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${daysInfo.overdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <Clock className={`w-4 h-4 ${daysInfo.overdue ? 'text-red-600' : 'text-blue-600'}`} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">{daysInfo.label}</p>
                      <p className={`font-semibold ${daysInfo.overdue ? 'text-red-600' : 'text-slate-900'}`}>
                        {daysInfo.value} {daysInfo.unit}
                      </p>
                    </div>
                  </div>
                )}

                {construction.details?.contractor && (
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Nhà thầu</p>
                      <p className="font-semibold text-slate-900">{construction.details.contractor}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Ring */}
            <div className="flex-shrink-0">
              <ProgressRing progress={construction.progress} status={construction.constructionStatus} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline Visual */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-600" />
                </span>
                Tiến trình dự án
              </h2>
              <TimelineVisual
                announcedDate={construction.announcedDate}
                startDate={construction.startDate}
                expectedEndDate={construction.expectedEndDate}
                actualEndDate={construction.actualEndDate}
                progress={construction.progress}
                status={construction.constructionStatus}
              />
            </div>

            {/* Description */}
            {construction.description && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </span>
                  Mô tả dự án
                </h2>
                <div className="prose prose-slate prose-sm max-w-none">
                  <p className="text-slate-600 leading-relaxed">Chi tiết công trình...</p>
                </div>
              </div>
            )}

            {/* Project Details */}
            {construction.details && (construction.details.contractor || construction.details.budget || construction.details.fundingSource) && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                  </span>
                  Chi tiết dự án
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {construction.details.contractor && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Nhà thầu</p>
                      <p className="font-medium text-slate-900">{construction.details.contractor}</p>
                    </div>
                  )}
                  {construction.details.budget && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ngân sách</p>
                      <p className="font-medium text-slate-900">{formatCurrency(construction.details.budget)}</p>
                    </div>
                  )}
                  {construction.details.fundingSource && (
                    <div className="p-4 bg-slate-50 rounded-xl md:col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Nguồn vốn</p>
                      <p className="font-medium text-slate-900">{construction.details.fundingSource}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metro stations */}
            {construction.constructionType === 'metro' && construction.metroStations && construction.metroStations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </span>
                  Các ga Metro ({construction.metroStations.length})
                </h2>
                <MetroLineVisualization
                  stations={[...construction.metroStations].sort((a: { stationOrder?: number | null }, b: { stationOrder?: number | null }) =>
                    (a.stationOrder || 0) - (b.stationOrder || 0)
                  )}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mini Map */}
            {centroid && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
                <MiniMap centroid={centroid} slug={slug} title={construction.title} />
              </div>
            )}

            {/* Changelog */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
              <ChangelogTimeline slug={slug} maxItems={8} showHeader={true} />
            </div>

            {/* Sources */}
            {construction.sources && construction.sources.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-cyan-600" />
                  </span>
                  Nguồn tham khảo
                </h3>
                <ul className="space-y-3">
                  {construction.sources.map((source: { url: string; title?: string | null; publishedAt?: string | null }, index: number) => (
                    <li key={index} className="group">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 -mx-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <ExternalLink className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                              {source.title || source.url}
                            </p>
                            {source.publishedAt && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {formatDate(source.publishedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </PageContent>
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  const result = await findBySlug(slug);

  if (!result) {
    return { title: 'Không tìm thấy' };
  }

  if (result.type === 'development') {
    const development = result.data;
    return {
      title: `${development.title} | OpenSite`,
      description: development.headline || `${development.title} - ${development.developmentType}`,
    };
  }

  const construction = result.data;
  return {
    title: `${construction.title} | OpenSite`,
    description: `Theo dõi tiến độ ${construction.title} - ${construction.progress}% hoàn thành`,
  };
}
