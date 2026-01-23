'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, ProtectedRoute } from '@/components/Auth';
import { ContentPageTemplate } from '@/components/layout';
import { Button, Alert, Input, Select } from '@/components/ui';

const privateTypeOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
  { value: 'mixed_use', label: 'Mixed-Use' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'retail', label: 'Retail' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'educational', label: 'Educational' },
  { value: 'other', label: 'Other' },
];

const constructionStatusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
];

interface FormData {
  title: string;
  privateType: string;
  constructionStatus: string;
  progress: number;
  announcedDate: string;
  startDate: string;
  expectedEndDate: string;
  'marketing.headline': string;
  'marketing.priceRange.displayText': string;
  'cta.contactPhone': string;
  'cta.contactEmail': string;
  'cta.salesOffice': string;
}

function NewProjectContent() {
  const router = useRouter();
  const t = useTranslations('sponsor');
  const { isSponsor } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    privateType: 'residential',
    constructionStatus: 'planned',
    progress: 0,
    announcedDate: '',
    startDate: '',
    expectedEndDate: '',
    'marketing.headline': '',
    'marketing.priceRange.displayText': '',
    'cta.contactPhone': '',
    'cta.contactEmail': '',
    'cta.salesOffice': '',
  });

  // Check if user is a sponsor
  if (!isSponsor) {
    return (
      <ContentPageTemplate pageTitle="New Project" showFullFooter={false}>
        <Alert variant="error" title="Access Denied">
          <p>This page is only accessible to sponsor users.</p>
          <div className="mt-4">
            <Button as="link" href="/" variant="primary">
              Return to Home
            </Button>
          </div>
        </Alert>
      </ContentPageTemplate>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Transform flat form data to nested structure
      const constructionData = {
        title: formData.title,
        privateType: formData.privateType,
        constructionStatus: formData.constructionStatus,
        progress: formData.progress,
        announcedDate: formData.announcedDate || undefined,
        startDate: formData.startDate || undefined,
        expectedEndDate: formData.expectedEndDate || undefined,
        marketing: {
          headline: formData['marketing.headline'] || undefined,
          priceRange: {
            displayText: formData['marketing.priceRange.displayText'] || undefined,
          },
        },
        cta: {
          contactPhone: formData['cta.contactPhone'] || undefined,
          contactEmail: formData['cta.contactEmail'] || undefined,
          salesOffice: formData['cta.salesOffice'] || undefined,
        },
      };

      const response = await fetch('/api/sponsor/constructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(constructionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const result = await response.json();
      router.push(`/sponsor/projects/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ContentPageTemplate pageTitle="Create New Project" showFullFooter={false}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Basic Information */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
                Project Title *
              </label>
              <Input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter project title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="privateType"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Project Type *
                </label>
                <Select
                  id="privateType"
                  name="privateType"
                  value={formData.privateType}
                  onChange={handleChange}
                  options={privateTypeOptions}
                />
              </div>

              <div>
                <label
                  htmlFor="constructionStatus"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Status *
                </label>
                <Select
                  id="constructionStatus"
                  name="constructionStatus"
                  value={formData.constructionStatus}
                  onChange={handleChange}
                  options={constructionStatusOptions}
                />
              </div>
            </div>

            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-foreground mb-1">
                Progress (%)
              </label>
              <Input
                id="progress"
                name="progress"
                type="number"
                min={0}
                max={100}
                value={formData.progress}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="announcedDate"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Announced Date
              </label>
              <Input
                id="announcedDate"
                name="announcedDate"
                type="date"
                value={formData.announcedDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1">
                Start Date
              </label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label
                htmlFor="expectedEndDate"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Expected End Date
              </label>
              <Input
                id="expectedEndDate"
                name="expectedEndDate"
                type="date"
                value={formData.expectedEndDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Marketing */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Marketing Information</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="marketing.headline"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Marketing Headline
              </label>
              <Input
                id="marketing.headline"
                name="marketing.headline"
                type="text"
                value={formData['marketing.headline']}
                onChange={handleChange}
                placeholder="e.g., Luxury Living in District 2"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A catchy tagline for your project (max 100 characters)
              </p>
            </div>

            <div>
              <label
                htmlFor="marketing.priceRange.displayText"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Price Display Text
              </label>
              <Input
                id="marketing.priceRange.displayText"
                name="marketing.priceRange.displayText"
                type="text"
                value={formData['marketing.priceRange.displayText']}
                onChange={handleChange}
                placeholder="e.g., From 2.5 billion VND"
              />
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cta.contactPhone"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Contact Phone
                </label>
                <Input
                  id="cta.contactPhone"
                  name="cta.contactPhone"
                  type="tel"
                  value={formData['cta.contactPhone']}
                  onChange={handleChange}
                  placeholder="e.g., 0909 123 456"
                />
              </div>
              <div>
                <label
                  htmlFor="cta.contactEmail"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Contact Email
                </label>
                <Input
                  id="cta.contactEmail"
                  name="cta.contactEmail"
                  type="email"
                  value={formData['cta.contactEmail']}
                  onChange={handleChange}
                  placeholder="e.g., sales@example.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="cta.salesOffice"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Sales Office Address
              </label>
              <textarea
                id="cta.salesOffice"
                name="cta.salesOffice"
                value={formData['cta.salesOffice']}
                onChange={handleChange}
                placeholder="Enter sales office address"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button as="link" href="/sponsor/projects" variant="ghost">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          After creating the project, you can add more details and submit it for review through the
          Payload admin panel.
        </p>
      </form>
    </ContentPageTemplate>
  );
}

export default function NewProjectPage() {
  return (
    <ProtectedRoute>
      <NewProjectContent />
    </ProtectedRoute>
  );
}
