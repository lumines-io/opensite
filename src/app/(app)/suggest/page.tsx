import { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import { SuggestionForm } from '@/components/SuggestionForm';
import { ContentPageTemplate } from '@/components/layout';
import { Alert } from '@/components/ui';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Submit Suggestion',
  description: 'Submit a suggestion for a new or existing construction project',
};

export default async function SuggestPage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  // Fetch constructions for the selector
  let constructionsList: { id: number; title: string; slug: string; constructionType: string; constructionStatus: string }[] = [];

  try {
    const payload = await getPayload({ config });
    const { docs: constructions } = await payload.find({
      collection: 'constructions',
      where: {
        _status: {
          equals: 'published',
        },
      },
      limit: 500,
      sort: 'title',
    });

    constructionsList = constructions.map((c) => ({
      id: c.id as number,
      title: c.title as string,
      slug: c.slug as string,
      constructionType: c.constructionType as string,
      constructionStatus: c.constructionStatus as string,
    }));
  } catch (error) {
    console.error('Failed to fetch constructions:', error);
    // Continue with empty list - form will still work for new suggestions
  }

  return (
    <ContentPageTemplate
      pageTitle="Submit a Suggestion"
      pageDescription="Help us keep the construction data accurate and up-to-date. Your suggestions will be reviewed by our moderators."
      showFullFooter={false}
    >
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Map
      </Link>

      {/* Info banner */}
      <Alert variant="info" title="How it works" className="mb-8">
        <ul className="text-sm mt-1 space-y-1">
          <li>1. Fill out the form with as much detail as possible</li>
          <li>2. Draw the construction geometry on the map (optional but helpful)</li>
          <li>3. Add source URLs to support your suggestion</li>
          <li>4. Submit for review by our moderators</li>
        </ul>
      </Alert>

      {/* Suggestion Form */}
      <SuggestionForm
        accessToken={mapboxToken}
        constructions={constructionsList}
      />
    </ContentPageTemplate>
  );
}
