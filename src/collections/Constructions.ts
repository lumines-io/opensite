import type { CollectionConfig, Where } from 'payload';
import { invalidateConstructionCache } from '@/lib/cache';
import { cacheLogger } from '@/lib/persistent-logger';
import {
  lexicalEditor,
  UploadFeature,
  LinkFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical';
import { CodeBlock } from '@/blocks/CodeBlock';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Constructions
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['title'],
  richTextFields: ['description'],
  immediate: false, // Process translations in background
});

export const Constructions: CollectionConfig = {
  slug: 'constructions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'constructionType', 'status', 'progress', 'updatedAt'],
    group: 'Content',
  },
  access: {
    // Read access:
    // - Public constructions: anyone can read
    // - Private constructions:
    //   - Published: anyone can read
    //   - Non-published: only admin, moderator, or sponsor users from same org
    read: ({ req }): boolean | Where => {
      // Admins and moderators can read everything
      if (['admin', 'moderator'].includes(req.user?.role as string)) {
        return true;
      }

      // Sponsor users can read their org's private constructions + all public
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) && req.user?.organization) {
        return {
          or: [
            // All public constructions
            { constructionCategory: { equals: 'public' } },
            // Published private constructions
            {
              and: [
                { constructionCategory: { equals: 'private' } },
                { approvalStatus: { equals: 'published' } },
              ],
            },
            // Their own org's private constructions (any status)
            {
              and: [
                { constructionCategory: { equals: 'private' } },
                { organization: { equals: req.user.organization } },
              ],
            },
          ],
        };
      }

      // Public: can read all public constructions + published private
      return {
        or: [
          { constructionCategory: { equals: 'public' } },
          {
            and: [
              { constructionCategory: { equals: 'private' } },
              { approvalStatus: { equals: 'published' } },
            ],
          },
        ],
      };
    },

    // Create access:
    // - Public constructions: only admin/moderator (contributors suggest via Suggestions)
    // - Private constructions: admin/moderator/sponsor_admin/sponsor_user
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      // Admin and moderator can create any construction type
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;
      // Sponsor users can create (will be restricted to private via hooks)
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string)) return true;
      return false;
    },

    // Update access:
    // - Public constructions: only admin/moderator
    // - Private constructions: admin/moderator OR sponsor users from same org
    update: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;

      // Admin and moderator can update any construction
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;

      // Sponsor users can only update their org's private constructions
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) && req.user?.organization) {
        return {
          and: [
            { constructionCategory: { equals: 'private' } },
            { organization: { equals: req.user.organization } },
          ],
        };
      }

      return false;
    },

    // Delete access: only admin
    delete: ({ req }) => {
      if (!req.user?._verified) return false;
      return req.user?.role === 'admin';
    },
  },
  versions: {
    drafts: true,
  },
  fields: [
    // ============================================
    // CONSTRUCTION CATEGORY (Public vs Private)
    // ============================================
    {
      name: 'constructionCategory',
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        { label: 'Public Infrastructure', value: 'public' },
        { label: 'Private Development', value: 'private' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Public = government infrastructure; Private = commercial/real estate',
      },
    },

    // Basic Info
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (!value && data?.title) {
              return data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          UploadFeature({
            collections: {
              media: {
                fields: [
                  {
                    name: 'caption',
                    type: 'text',
                    label: 'Caption',
                  },
                ],
              },
            },
          }),
          LinkFeature({
            enabledCollections: ['constructions'],
            fields: ({ defaultFields }) => [
              ...defaultFields,
              {
                name: 'rel',
                label: 'Rel Attribute',
                type: 'select',
                hasMany: true,
                options: ['noopener', 'noreferrer', 'nofollow'],
                admin: {
                  description: 'The rel attribute for external links',
                },
              },
            ],
          }),
          BlocksFeature({
            blocks: [CodeBlock],
          }),
        ],
      }),
      admin: {
        description: 'Rich description with support for images, links, and code blocks',
      },
    },

    // Type & Status (for Public constructions)
    {
      name: 'constructionType',
      type: 'select',
      defaultValue: 'road',
      options: [
        { label: 'Road Construction', value: 'road' },
        { label: 'Highway/Expressway', value: 'highway' },
        { label: 'Metro Line', value: 'metro' },
        { label: 'Bridge', value: 'bridge' },
        { label: 'Tunnel', value: 'tunnel' },
        { label: 'Interchange', value: 'interchange' },
        { label: 'Station', value: 'station' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        condition: (data) => data?.constructionCategory === 'public',
      },
    },

    // Private Construction Type (for Private constructions)
    {
      name: 'privateType',
      type: 'select',
      options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Office', value: 'office' },
        { label: 'Mixed-Use', value: 'mixed_use' },
        { label: 'Industrial', value: 'industrial' },
        { label: 'Hospitality', value: 'hospitality' },
        { label: 'Retail', value: 'retail' },
        { label: 'Healthcare', value: 'healthcare' },
        { label: 'Educational', value: 'educational' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
        condition: (data) => data?.constructionCategory === 'private',
      },
    },

    // Organization (owner of private construction)
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.constructionCategory === 'private',
        description: 'Organization that owns this private construction',
      },
    },

    // Approval Status (for Private constructions)
    {
      name: 'approvalStatus',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Internal Review', value: 'internal_review' },
        { label: 'Submitted for Approval', value: 'submitted' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Changes Requested', value: 'changes_requested' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
        condition: (data) => data?.constructionCategory === 'private',
      },
    },
    {
      name: 'constructionStatus',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Paused', value: 'paused' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'progress',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Completion percentage (0-100)',
      },
    },

    // Geometry
    {
      name: 'geometry',
      type: 'json',
      admin: {
        description: 'GeoJSON geometry (Point, LineString, or Polygon)',
        components: {
          Field: '/payload/components/fields/GeometryMapField#GeometryMapField',
        },
      },
    },
    {
      name: 'centroid',
      type: 'json',
      admin: {
        description: 'Center point [lng, lat] for map display',
      },
    },

    // Timeline
    {
      type: 'row',
      fields: [
        {
          name: 'announcedDate',
          type: 'date',
          label: 'Announced Date',
          admin: { width: '25%' },
        },
        {
          name: 'startDate',
          type: 'date',
          label: 'Start Date',
          admin: { width: '25%' },
        },
        {
          name: 'expectedEndDate',
          type: 'date',
          label: 'Expected End Date',
          admin: { width: '25%' },
        },
        {
          name: 'actualEndDate',
          type: 'date',
          label: 'Actual End Date',
          admin: { width: '25%' },
        },
      ],
    },

    // Details
    {
      name: 'details',
      type: 'group',
      fields: [
        {
          name: 'contractor',
          type: 'text',
          label: 'Contractor',
        },
        {
          name: 'budget',
          type: 'number',
          label: 'Budget (VND)',
        },
        {
          name: 'fundingSource',
          type: 'text',
          label: 'Funding Source',
        },
      ],
    },

    // Metro stations (only for metro type)
    {
      name: 'metroStations',
      type: 'array',
      admin: {
        condition: (data) => data?.constructionType === 'metro',
        description: 'Stations along the metro line',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'location',
          type: 'json',
          admin: {
            description: 'GeoJSON Point',
          },
        },
        {
          name: 'stationOrder',
          type: 'number',
        },
        {
          name: 'stationStatus',
          type: 'select',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'Under Construction', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Operational', value: 'operational' },
          ],
          defaultValue: 'planned',
        },
        {
          name: 'stationProgress',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        {
          name: 'openedAt',
          type: 'date',
        },
      ],
    },

    // Media
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
        },
        {
          name: 'takenAt',
          type: 'date',
        },
      ],
    },

    // Sources
    {
      name: 'sources',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'publishedAt',
          type: 'date',
        },
      ],
    },

    // Version tracking
    {
      name: 'currentVersion',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },

    // ============================================
    // PRIVATE CONSTRUCTION FIELDS
    // ============================================

    // Marketing Content (Private only)
    {
      name: 'marketing',
      type: 'group',
      admin: {
        condition: (data) => data?.constructionCategory === 'private',
        description: 'Marketing content for private developments',
      },
      fields: [
        {
          name: 'headline',
          type: 'text',
          localized: true,
          maxLength: 100,
          admin: {
            description: 'Marketing tagline (e.g., "Luxury Living in District 2")',
          },
        },
        {
          name: 'keyFeatures',
          type: 'array',
          maxRows: 6,
          fields: [
            {
              name: 'feature',
              type: 'text',
              localized: true,
            },
            {
              name: 'icon',
              type: 'select',
              options: [
                { label: 'Location', value: 'location' },
                { label: 'Price', value: 'price' },
                { label: 'Size', value: 'size' },
                { label: 'Amenities', value: 'amenities' },
                { label: 'View', value: 'view' },
                { label: 'Security', value: 'security' },
                { label: 'Parking', value: 'parking' },
                { label: 'Pool', value: 'pool' },
                { label: 'Gym', value: 'gym' },
                { label: 'Garden', value: 'garden' },
              ],
            },
          ],
        },
        {
          name: 'priceRange',
          type: 'group',
          fields: [
            {
              name: 'min',
              type: 'number',
              admin: { description: 'Minimum price (VND)' },
            },
            {
              name: 'max',
              type: 'number',
              admin: { description: 'Maximum price (VND)' },
            },
            {
              name: 'pricePerSqm',
              type: 'number',
              admin: { description: 'Price per square meter (VND)' },
            },
            {
              name: 'displayText',
              type: 'text',
              localized: true,
              admin: { description: 'Custom price display text' },
            },
          ],
        },
        {
          name: 'videoUrl',
          type: 'text',
          admin: { description: 'YouTube or Vimeo URL' },
        },
        {
          name: 'virtualTourUrl',
          type: 'text',
          admin: { description: '360° tour URL' },
        },
        {
          name: 'brochure',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'PDF brochure for download' },
        },
      ],
    },

    // Call to Action (Private only)
    {
      name: 'cta',
      type: 'group',
      admin: {
        condition: (data) => data?.constructionCategory === 'private',
        description: 'Call-to-action configuration',
      },
      fields: [
        {
          name: 'primaryButton',
          type: 'group',
          fields: [
            {
              name: 'text',
              type: 'text',
              localized: true,
              defaultValue: 'Contact Sales',
            },
            {
              name: 'url',
              type: 'text',
              admin: { description: 'External URL (optional)' },
            },
            {
              name: 'action',
              type: 'select',
              defaultValue: 'phone',
              options: [
                { label: 'External Link', value: 'link' },
                { label: 'Show Contact Form', value: 'form' },
                { label: 'Show Phone Number', value: 'phone' },
                { label: 'Download Brochure', value: 'download' },
              ],
            },
          ],
        },
        {
          name: 'contactPhone',
          type: 'text',
          admin: { description: 'Sales hotline' },
        },
        {
          name: 'contactEmail',
          type: 'email',
          admin: { description: 'Sales email' },
        },
        {
          name: 'salesOffice',
          type: 'textarea',
          localized: true,
          admin: { description: 'Sales office address' },
        },
      ],
    },

    // Display Options (Private only)
    {
      name: 'displayOptions',
      type: 'group',
      admin: {
        condition: (data) => data?.constructionCategory === 'private',
        description: 'Map display settings',
      },
      fields: [
        {
          name: 'featured',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Show in featured section' },
        },
        {
          name: 'priority',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Higher priority = more prominent placement' },
        },
        {
          name: 'showSponsoredBadge',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: 'Show "Sponsored" badge on map' },
        },
        {
          name: 'useCustomMarker',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Use organization brand color for marker' },
        },
      ],
    },

    // Active Promotion (Private only)
    {
      name: 'activePromotion',
      type: 'relationship',
      relationTo: 'promotions',
      admin: {
        readOnly: true,
        condition: (data) => data?.constructionCategory === 'private',
        description: 'Currently active promotion for this construction',
      },
    },
    {
      name: 'promotionExpiresAt',
      type: 'date',
      admin: {
        readOnly: true,
        condition: (data) => data?.constructionCategory === 'private',
        description: 'When the current promotion expires',
      },
    },

    // Review Metadata (Private only)
    {
      name: 'review',
      type: 'group',
      admin: {
        condition: (data) =>
          data?.constructionCategory === 'private' && data?.approvalStatus !== 'draft',
        description: 'Approval workflow metadata',
      },
      fields: [
        {
          name: 'submittedAt',
          type: 'date',
          admin: { readOnly: true },
        },
        {
          name: 'submittedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'reviewedAt',
          type: 'date',
          admin: { readOnly: true },
        },
        {
          name: 'reviewedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'reviewNotes',
          type: 'textarea',
          admin: { description: 'Notes from reviewer (visible to sponsor)' },
        },
        {
          name: 'internalNotes',
          type: 'textarea',
          admin: { description: 'Internal notes (not visible to sponsor)' },
        },
      ],
    },

    // Analytics (Private only, read-only)
    {
      name: 'analytics',
      type: 'group',
      admin: {
        condition: (data) => data?.constructionCategory === 'private',
        readOnly: true,
        description: 'Engagement metrics (updated automatically)',
      },
      fields: [
        {
          name: 'impressions',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Number of times shown on map' },
        },
        {
          name: 'clicks',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Number of popup opens' },
        },
        {
          name: 'ctaClicks',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Number of CTA button clicks' },
        },
        {
          name: 'inquiries',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Number of form submissions' },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        // Version tracking
        if (operation === 'update' && originalDoc) {
          data.currentVersion = (originalDoc.currentVersion || 0) + 1;
        }

        const userRole = req.user?.role as string;
        const isSponsorRole = ['sponsor_admin', 'sponsor_user'].includes(userRole);

        // Sponsor users can only create private constructions
        if (operation === 'create' && isSponsorRole) {
          data.constructionCategory = 'private';
          // Auto-set organization to user's organization
          if (req.user?.organization && !data.organization) {
            data.organization = req.user.organization;
          }
          // Set initial approval status
          if (!data.approvalStatus) {
            data.approvalStatus = 'draft';
          }
        }

        // Sponsor users cannot change category to public
        if (operation === 'update' && isSponsorRole && data.constructionCategory === 'public') {
          data.constructionCategory = 'private';
        }

        // Sponsor users cannot change approval status to approved/published
        // Only admin/moderator can approve
        if (isSponsorRole && ['approved', 'published'].includes(data.approvalStatus)) {
          // Keep the original status or set to submitted if trying to self-approve
          if (originalDoc?.approvalStatus) {
            data.approvalStatus = originalDoc.approvalStatus;
          } else {
            data.approvalStatus = 'submitted';
          }
        }

        // Track submission for approval workflow
        if (data.approvalStatus === 'submitted' && originalDoc?.approvalStatus !== 'submitted') {
          data.review = data.review || {};
          data.review.submittedAt = new Date().toISOString();
          data.review.submittedBy = req.user?.id;
        }

        // Track review completion (by admin/moderator)
        const isReviewRole = ['admin', 'moderator'].includes(userRole);
        const statusChanged = data.approvalStatus !== originalDoc?.approvalStatus;
        const isReviewedStatus = ['approved', 'rejected', 'changes_requested'].includes(data.approvalStatus);

        if (isReviewRole && statusChanged && isReviewedStatus) {
          data.review = data.review || {};
          data.review.reviewedAt = new Date().toISOString();
          data.review.reviewedBy = req.user?.id;
        }

        return data;
      },
      autoTranslateHooks.beforeChange,
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        // Invalidate cache after create or update
        const constructionName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Construction "${constructionName}" ${operation}d`, {
          constructionName,
          slug: doc.slug,
          operation,
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateConstructionCache(doc.slug);
        return doc;
      },
      autoTranslateHooks.afterChange,
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Invalidate cache after delete
        const constructionName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Construction "${constructionName}" deleted`, {
          constructionName,
          slug: doc.slug,
          operation: 'delete',
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateConstructionCache(doc.slug);
        return doc;
      },
    ],
  },
};
