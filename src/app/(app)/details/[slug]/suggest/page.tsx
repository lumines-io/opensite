import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { SuggestionForm, type ConstructionType, type ConstructionStatus } from '@/components/SuggestionForm';
import { ContentPageTemplate } from '@/components/layout';
import { Alert, Card } from '@/components/ui';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SuggestChangesPage({ params }: PageProps) {
  const { slug } = await params;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  const payload = await getPayload({ config });

  // Fetch the construction by slug
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

  // Transform construction data to initial form data
  const initialData = {
    title: `Update: ${construction.title}`,
    suggestionType: 'update' as const,
    construction: {
      id: construction.id as number,
      title: construction.title as string,
      slug: construction.slug as string,
      constructionType: construction.constructionType as string,
      constructionStatus: construction.constructionStatus as string,
    },
    proposedData: {
      title: construction.title as string,
      constructionType: construction.constructionType as ConstructionType,
      constructionStatus: construction.constructionStatus as ConstructionStatus,
      progress: construction.progress as number,
      startDate: construction.startDate as string | undefined,
      expectedEndDate: construction.expectedEndDate as string | undefined,
      contractor: construction.details?.contractor as string | undefined,
      budget: construction.details?.budget as number | undefined,
      fundingSource: construction.details?.fundingSource as string | undefined,
    },
    proposedGeometry: construction.geometry as GeoJSON.Geometry | null,
    locationDescription: '',
    justification: '',
    evidenceUrls: [] as { url: string }[],
  };

  return (
    <ContentPageTemplate
      pageTitle="Suggest Changes"
      pageDescription={`Propose updates or corrections to ${construction.title}`}
      showFullFooter={false}
    >
      {/* Back link */}
      <Link
        href={`/details/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {construction.title}
      </Link>

      {/* Current data summary */}
      <Card variant="outlined" className="mb-8 bg-muted/30">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground" />
          Current Project Data
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Type</span>
            <span className="font-medium text-foreground capitalize">
              {construction.constructionType}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Status</span>
            <span className="font-medium text-foreground capitalize">
              {construction.constructionStatus?.replace('-', ' ')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Progress</span>
            <span className="font-medium text-foreground">
              {construction.progress}%
            </span>
          </div>
          {construction.details?.contractor && (
            <div>
              <span className="text-muted-foreground block">Contractor</span>
              <span className="font-medium text-foreground">
                {construction.details.contractor}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Info banner */}
      <Alert variant="warning" title="Before you submit" className="mb-8">
        <ul className="text-sm mt-1 space-y-1">
          <li>Only change the fields that need updating</li>
          <li>Add source URLs to support your changes</li>
          <li>Explain why the change is needed in the justification</li>
        </ul>
      </Alert>

      {/* Suggestion Form with initial data */}
      <SuggestionForm
        accessToken={mapboxToken}
        initialData={initialData}
      />
    </ContentPageTemplate>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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
    return { title: 'Not Found' };
  }

  return {
    title: `Suggest Changes - ${constructions[0].title}`,
    description: `Suggest updates or corrections for ${constructions[0].title}`,
  };
}
