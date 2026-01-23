import Link from 'next/link';
import { ImageGallery } from './ImageGallery';
import { MiniMap } from './MiniMap';
import { PageContent } from './PageContent';

// Development status config
const DEV_STATUS_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string; icon: string }> = {
  upcoming: { color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', label: 'Sắp ra mắt', icon: '📋' },
  pre_launch: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', label: 'Sắp mở bán', icon: '🎯' },
  selling: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', label: 'Đang bán', icon: '✅' },
  limited: { color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', label: 'Còn ít căn', icon: '🔥' },
  sold_out: { color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: 'Đã bán hết', icon: '🏆' },
  under_construction: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', label: 'Đang xây dựng', icon: '🚧' },
  completed: { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300', label: 'Đã hoàn thành', icon: '🏠' },
};

// Development type config
const DEV_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  apartment_complex: { label: 'Chung cư', icon: '🏢', color: 'bg-pink-500' },
  condominium: { label: 'Căn hộ cao cấp', icon: '🏙️', color: 'bg-pink-400' },
  villa_project: { label: 'Biệt thự', icon: '🏡', color: 'bg-pink-600' },
  townhouse_project: { label: 'Nhà phố', icon: '🏘️', color: 'bg-rose-500' },
  resort: { label: 'Resort', icon: '🏝️', color: 'bg-teal-500' },
  hotel: { label: 'Khách sạn', icon: '🏨', color: 'bg-teal-600' },
  serviced_apartment: { label: 'Căn hộ dịch vụ', icon: '🛎️', color: 'bg-cyan-500' },
  commercial_center: { label: 'Trung tâm thương mại', icon: '🛒', color: 'bg-orange-500' },
  shopping_mall: { label: 'TTTM', icon: '🛍️', color: 'bg-orange-400' },
  office_building: { label: 'Tòa văn phòng', icon: '🏦', color: 'bg-blue-500' },
  industrial_park: { label: 'Khu công nghiệp', icon: '🏭', color: 'bg-stone-500' },
  mixed_use: { label: 'Tổ hợp đa năng', icon: '🏗️', color: 'bg-violet-500' },
  township: { label: 'Khu đô thị', icon: '🌆', color: 'bg-purple-500' },
  healthcare: { label: 'Bệnh viện', icon: '🏥', color: 'bg-red-500' },
  educational: { label: 'Trường học', icon: '🎓', color: 'bg-green-500' },
  other: { label: 'Khác', icon: '🏛️', color: 'bg-gray-500' },
};

interface DevelopmentDetailContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  development: any;
  slug: string;
}

export function DevelopmentDetailContent({ development, slug }: DevelopmentDetailContentProps) {
  const statusConfig = DEV_STATUS_CONFIG[development.developmentStatus] || DEV_STATUS_CONFIG.upcoming;
  const typeConfig = DEV_TYPE_CONFIG[development.developmentType] || DEV_TYPE_CONFIG.other;

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get images array
  const images = development.images?.map((img: { image?: { url?: string } | string; caption?: string | null; takenAt?: string | null }) => ({
    url: typeof img.image === 'object' ? img.image?.url : null,
    caption: img.caption,
    takenAt: img.takenAt,
  })).filter((img: { url: string | null }) => img.url) || [];

  // Get centroid for map
  const centroid = development.centroid as [number, number] | null;

  // Get organization name
  const organizationName = typeof development.organization === 'object'
    ? development.organization?.name
    : null;

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
                href={`/?development=${slug}`}
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
          <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-md ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
              <span>{statusConfig.icon}</span>
              {statusConfig.label}
            </span>
            {development.featured && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-md bg-yellow-100 text-yellow-800 border border-yellow-300">
                <span>⭐</span>
                Nổi bật
              </span>
            )}
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
                  {organizationName && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm text-slate-500">{organizationName}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  {development.title}
                </h1>
                {development.headline && (
                  <p className="text-lg text-slate-600 mb-4">{development.headline}</p>
                )}

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 md:gap-6">
                  {development.priceDisplay && (
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">Giá từ</p>
                        <p className="font-semibold text-emerald-600">{development.priceDisplay}</p>
                      </div>
                    </div>
                  )}

                  {development.launchDate && (
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">Ngày ra mắt</p>
                        <p className="font-semibold text-slate-900">{formatDate(development.launchDate)}</p>
                      </div>
                    </div>
                  )}

                  {development.expectedCompletion && (
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">Dự kiến bàn giao</p>
                        <p className="font-semibold text-slate-900">{formatDate(development.expectedCompletion)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              {development.cta?.ctaUrl && (
                <div className="flex-shrink-0">
                  <a
                    href={development.cta.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 font-medium"
                  >
                    {development.cta.ctaText || 'Liên hệ ngay'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {development.excerpt && (
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
                    <p className="text-slate-600 leading-relaxed">{development.excerpt}</p>
                  </div>
                </div>
              )}

              {/* Marketing Content */}
              {development.marketing?.fullDescription && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </span>
                    Chi tiết dự án
                  </h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{development.marketing.fullDescription}</p>
                  </div>
                </div>
              )}

              {/* Key Features */}
              {development.marketing?.keyFeatures && development.marketing.keyFeatures.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    Điểm nổi bật
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {development.marketing.keyFeatures.map((feature: { feature: string }, index: number) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-slate-700">{feature.feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Mini Map */}
              {centroid && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
                  <MiniMap centroid={centroid} slug={slug} title={development.title} />
                </div>
              )}

              {/* Contact CTA */}
              {development.cta?.ctaUrl && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-blue-100">
                  <h3 className="font-semibold text-slate-900 mb-2">Quan tâm dự án này?</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Liên hệ ngay để nhận thông tin chi tiết và ưu đãi mới nhất.
                  </p>
                  <a
                    href={development.cta.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    {development.cta.ctaText || 'Liên hệ ngay'}
                  </a>
                </div>
              )}

              {/* Organization Info */}
              {organizationName && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    Chủ đầu tư
                  </h3>
                  <p className="font-medium text-slate-900">{organizationName}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </PageContent>
  );
}
