import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import { ChangelogTimeline } from '@/components/ChangelogTimeline';
import { ImageGallery } from './ImageGallery';
import { ProgressRing } from './ProgressRing';
import { MiniMap } from './MiniMap';
import { TimelineVisual } from './TimelineVisual';
import { MetroLineVisualization } from './MetroLineVisualization';
import { PageContent } from './PageContent';

// Status colors and labels
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

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConstructionDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const payload = await getPayload({ config });

  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    where: {
      slug: {
        equals: slug,
      },
      _status: {
        equals: 'published',
      },
    },
    limit: 1,
    depth: 2,
  });

  if (constructions.length === 0) {
    notFound();
  }

  const construction = constructions[0];
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="font-medium">Quay lại</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/details/${slug}/suggest`}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Đề xuất thay đổi
            </Link>
            <Link
              href={`/?construction=${slug}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
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
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
                      <svg className={`w-4 h-4 ${daysInfo.overdue ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
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
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
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
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
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
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
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
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
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
                    <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
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
                          <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
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

  const payload = await getPayload({ config });

  const { docs: constructions } = await payload.find({
    collection: 'constructions',
    where: {
      slug: { equals: slug },
      _status: { equals: 'published' },
    },
    limit: 1,
  });

  if (constructions.length === 0) {
    return { title: 'Không tìm thấy' };
  }

  const construction = constructions[0];

  return {
    title: `${construction.title} | OpenSite`,
    description: `Theo dõi tiến độ ${construction.title} - ${construction.progress}% hoàn thành`,
  };
}
