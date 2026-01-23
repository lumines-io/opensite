import type { CollectionConfig, Where } from 'payload';
import { invalidateDevelopmentCache } from '@/lib/cache';
import { cacheLogger } from '@/lib/persistent-logger';
import {
  lexicalEditor,
  UploadFeature,
  LinkFeature,
  BlocksFeature,
} from '@payloadcms/richtext-lexical';
import { CodeBlock } from '@/blocks/CodeBlock';
import { createAutoTranslateHooks } from '@/hooks/auto-translate';

// Auto-translate configuration for Developments
const autoTranslateHooks = createAutoTranslateHooks({
  fields: ['title'],
  richTextFields: ['description'],
  immediate: false,
});

export const Developments: CollectionConfig = {
  slug: 'developments',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'developmentType', 'developmentStatus', 'organization', 'approvalStatus', 'updatedAt'],
    group: 'Content',
  },
  access: {
    // Read access:
    // - Published developments: anyone can read
    // - Non-published: only admin, moderator, or sponsor users from same org
    read: ({ req }): boolean | Where => {
      // Admins and moderators can read everything
      if (['admin', 'moderator'].includes(req.user?.role as string)) {
        return true;
      }

      // Sponsor users can read their org's developments + all published
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) && req.user?.organization) {
        return {
          or: [
            // Published developments
            { approvalStatus: { equals: 'published' } },
            // Their own org's developments (any status)
            { organization: { equals: req.user.organization } },
          ],
        };
      }

      // Public: can read only published developments
      return {
        approvalStatus: { equals: 'published' },
      };
    },

    // Create access: admin/moderator/sponsor users
    create: ({ req }) => {
      if (!req.user?._verified) return false;
      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string)) return true;
      return false;
    },

    // Update access: admin/moderator OR sponsor users from same org
    update: ({ req }): boolean | Where => {
      if (!req.user?._verified) return false;

      if (['admin', 'moderator'].includes(req.user?.role as string)) return true;

      // Sponsor users can only update their org's developments
      if (['sponsor_admin', 'sponsor_user'].includes(req.user?.role as string) && req.user?.organization) {
        return {
          organization: { equals: req.user.organization },
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
    // BASIC INFORMATION
    // ============================================
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
            enabledCollections: ['developments'],
            fields: ({ defaultFields }) => [
              ...defaultFields,
              {
                name: 'rel',
                label: 'Rel Attribute',
                type: 'select',
                hasMany: true,
                options: ['noopener', 'noreferrer', 'nofollow'],
              },
            ],
          }),
          BlocksFeature({
            blocks: [CodeBlock],
          }),
        ],
      }),
    },

    // ============================================
    // DEVELOPMENT TYPE
    // ============================================
    {
      name: 'developmentType',
      type: 'select',
      required: true,
      defaultValue: 'apartment_complex',
      options: [
        // Residential Projects
        { label: 'Apartment Complex', value: 'apartment_complex' },
        { label: 'Condominium', value: 'condominium' },
        { label: 'Villa Project', value: 'villa_project' },
        { label: 'Townhouse Project', value: 'townhouse_project' },
        // Hospitality
        { label: 'Resort', value: 'resort' },
        { label: 'Hotel', value: 'hotel' },
        { label: 'Serviced Apartment', value: 'serviced_apartment' },
        // Commercial
        { label: 'Commercial Center', value: 'commercial_center' },
        { label: 'Shopping Mall', value: 'shopping_mall' },
        { label: 'Office Building', value: 'office_building' },
        { label: 'Industrial Park', value: 'industrial_park' },
        // Mixed & Other
        { label: 'Mixed-Use Development', value: 'mixed_use' },
        { label: 'Township', value: 'township' },
        { label: 'Healthcare Facility', value: 'healthcare' },
        { label: 'Educational Campus', value: 'educational' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    // ============================================
    // ORGANIZATION (OWNER)
    // ============================================
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Organization that owns this development',
      },
    },

    // ============================================
    // STATUS & APPROVAL
    // ============================================
    {
      name: 'developmentStatus',
      type: 'select',
      required: true,
      defaultValue: 'upcoming',
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Pre-Launch', value: 'pre_launch' },
        { label: 'Now Selling', value: 'selling' },
        { label: 'Limited Units', value: 'limited' },
        { label: 'Sold Out', value: 'sold_out' },
        { label: 'Under Construction', value: 'under_construction' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
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
      },
    },

    // ============================================
    // GEOMETRY & LOCATION
    // ============================================
    {
      name: 'geometry',
      type: 'json',
      admin: {
        description: 'GeoJSON geometry (Point or Polygon)',
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
    {
      name: 'address',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Full address of the development',
      },
    },

    // ============================================
    // TIMELINE
    // ============================================
    {
      type: 'row',
      fields: [
        {
          name: 'announcedDate',
          type: 'date',
          label: 'Announced Date',
          admin: { width: '33%' },
        },
        {
          name: 'launchDate',
          type: 'date',
          label: 'Launch/Sales Date',
          admin: { width: '33%' },
        },
        {
          name: 'expectedCompletion',
          type: 'date',
          label: 'Expected Completion',
          admin: { width: '33%' },
        },
      ],
    },

    // ============================================
    // PROJECT DETAILS
    // ============================================
    {
      name: 'projectDetails',
      type: 'group',
      fields: [
        {
          name: 'developer',
          type: 'text',
          label: 'Developer Name',
        },
        {
          name: 'totalUnits',
          type: 'number',
          label: 'Total Units',
        },
        {
          name: 'totalArea',
          type: 'number',
          label: 'Total Area (m²)',
        },
        {
          name: 'floors',
          type: 'number',
          label: 'Number of Floors',
        },
        {
          name: 'unitSizeRange',
          type: 'group',
          fields: [
            {
              name: 'min',
              type: 'number',
              label: 'Min Size (m²)',
            },
            {
              name: 'max',
              type: 'number',
              label: 'Max Size (m²)',
            },
          ],
        },
      ],
    },

    // ============================================
    // MARKETING CONTENT
    // ============================================
    {
      name: 'marketing',
      type: 'group',
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
          maxRows: 8,
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
                { label: 'Beach', value: 'beach' },
                { label: 'Golf', value: 'golf' },
                { label: 'Spa', value: 'spa' },
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

    // ============================================
    // CALL TO ACTION
    // ============================================
    {
      name: 'cta',
      type: 'group',
      fields: [
        {
          name: 'primaryButton',
          type: 'group',
          fields: [
            {
              name: 'text',
              type: 'text',
              localized: true,
              defaultValue: 'Liên hệ',
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

    // ============================================
    // DISPLAY OPTIONS
    // ============================================
    {
      name: 'displayOptions',
      type: 'group',
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
        {
          name: 'markerColor',
          type: 'text',
          admin: {
            description: 'Custom marker color (hex, e.g., #FF5500)',
            condition: (data) => data?.displayOptions?.useCustomMarker,
          },
        },
      ],
    },

    // ============================================
    // MEDIA
    // ============================================
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
          name: 'imageType',
          type: 'select',
          options: [
            { label: 'Exterior', value: 'exterior' },
            { label: 'Interior', value: 'interior' },
            { label: 'Amenities', value: 'amenities' },
            { label: 'Floor Plan', value: 'floor_plan' },
            { label: 'Location Map', value: 'location_map' },
            { label: 'Render', value: 'render' },
            { label: 'Progress Photo', value: 'progress' },
            { label: 'Other', value: 'other' },
          ],
        },
      ],
    },

    // ============================================
    // REVIEW METADATA
    // ============================================
    {
      name: 'review',
      type: 'group',
      admin: {
        condition: (data) => data?.approvalStatus !== 'draft',
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

    // ============================================
    // ANALYTICS (Read-only)
    // ============================================
    {
      name: 'analytics',
      type: 'group',
      admin: {
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

    // ============================================
    // SOURCES
    // ============================================
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

        // Auto-set organization to user's organization for sponsor users
        if (operation === 'create' && isSponsorRole) {
          if (req.user?.organization && !data.organization) {
            data.organization = req.user.organization;
          }
          if (!data.approvalStatus) {
            data.approvalStatus = 'draft';
          }
        }

        // Sponsor users cannot change approval status to approved/published
        if (isSponsorRole && ['approved', 'published'].includes(data.approvalStatus)) {
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
        const developmentName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Development "${developmentName}" ${operation}d`, {
          developmentName,
          slug: doc.slug,
          operation,
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateDevelopmentCache(doc.slug);
        return doc;
      },
      autoTranslateHooks.afterChange,
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const developmentName = doc.title || doc.slug || 'Unknown';
        cacheLogger.info(`Development "${developmentName}" deleted`, {
          developmentName,
          slug: doc.slug,
          operation: 'delete',
          userName: req.user?.name,
          userEmail: req.user?.email,
          userRole: req.user?.role,
        });
        await invalidateDevelopmentCache(doc.slug);
        return doc;
      },
    ],
  },
};
