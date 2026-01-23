import type { GlobalConfig } from 'payload';

/**
 * Ad Settings Global Configuration
 *
 * Manages advertising configuration for the site including:
 * - Ad provider selection (Ezoic, Mediavine, AdThrive)
 * - Provider-specific settings and IDs
 * - Ad placement controls
 * - Revenue tracking settings
 */
export const AdSettings: GlobalConfig = {
  slug: 'ad-settings',
  label: 'Ad Settings',
  admin: {
    group: 'Monetization',
    description: 'Configure advertising providers and placements',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // Tab 1: General Settings
        {
          label: 'General',
          description: 'General advertising settings',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              label: 'Enable Ads',
              defaultValue: false,
              admin: {
                description: 'Master switch to enable/disable all ads on the site',
              },
            },
            {
              name: 'provider',
              type: 'select',
              label: 'Ad Provider',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Google AdSense', value: 'adsense' },
                { label: 'Ezoic', value: 'ezoic' },
                { label: 'Mediavine', value: 'mediavine' },
                { label: 'AdThrive (Raptive)', value: 'adthrive' },
              ],
              admin: {
                description: 'Select the ad network provider to use',
              },
            },
            {
              name: 'consentRequired',
              type: 'checkbox',
              label: 'Require Cookie Consent',
              defaultValue: true,
              admin: {
                description: 'Require user consent before loading ads (GDPR compliance)',
              },
            },
            {
              name: 'lazyLoadAds',
              type: 'checkbox',
              label: 'Lazy Load Ads',
              defaultValue: true,
              admin: {
                description: 'Only load ads when they are about to enter the viewport',
              },
            },
          ],
        },

        // Tab 2: Google AdSense
        {
          label: 'Google AdSense',
          description: 'Google AdSense configuration',
          fields: [
            {
              name: 'adsense',
              type: 'group',
              fields: [
                {
                  name: 'publisherId',
                  type: 'text',
                  label: 'Publisher ID',
                  admin: {
                    description: 'Your AdSense Publisher ID (e.g., ca-pub-XXXXXXXXXXXXXXXX)',
                    placeholder: 'ca-pub-XXXXXXXXXXXXXXXX',
                  },
                },
                {
                  name: 'autoAds',
                  type: 'checkbox',
                  label: 'Enable Auto Ads',
                  defaultValue: false,
                  admin: {
                    description: 'Let Google automatically place ads on your site',
                  },
                },
              ],
            },
          ],
        },

        // Tab 3: Ezoic
        {
          label: 'Ezoic',
          description: 'Ezoic configuration',
          fields: [
            {
              name: 'ezoic',
              type: 'group',
              fields: [
                {
                  name: 'siteId',
                  type: 'text',
                  label: 'Site ID',
                  admin: {
                    description: 'Your Ezoic Site ID',
                    placeholder: 'XXXXX',
                  },
                },
                {
                  name: 'useCloudIntegration',
                  type: 'checkbox',
                  label: 'Use Cloud Integration',
                  defaultValue: false,
                  admin: {
                    description: 'Use Ezoic cloud integration instead of JavaScript',
                  },
                },
                {
                  name: 'enablePlaceholders',
                  type: 'checkbox',
                  label: 'Enable Placeholders',
                  defaultValue: true,
                  admin: {
                    description: 'Use placeholder divs for ad placement control',
                  },
                },
              ],
            },
          ],
        },

        // Tab 4: Mediavine
        {
          label: 'Mediavine',
          description: 'Mediavine configuration',
          fields: [
            {
              name: 'mediavine',
              type: 'group',
              fields: [
                {
                  name: 'siteId',
                  type: 'text',
                  label: 'Site ID',
                  admin: {
                    description: 'Your Mediavine Site ID',
                    placeholder: 'your-site-name',
                  },
                },
                {
                  name: 'enableGrowMe',
                  type: 'checkbox',
                  label: 'Enable Grow.me',
                  defaultValue: true,
                  admin: {
                    description: 'Enable Mediavine Grow.me engagement suite',
                  },
                },
                {
                  name: 'disableOnMobile',
                  type: 'checkbox',
                  label: 'Disable on Mobile',
                  defaultValue: false,
                  admin: {
                    description: 'Disable certain ad units on mobile devices',
                  },
                },
              ],
            },
          ],
        },

        // Tab 5: AdThrive (Raptive)
        {
          label: 'AdThrive',
          description: 'AdThrive (Raptive) configuration',
          fields: [
            {
              name: 'adthrive',
              type: 'group',
              fields: [
                {
                  name: 'siteId',
                  type: 'text',
                  label: 'Site ID',
                  admin: {
                    description: 'Your AdThrive/Raptive Site ID',
                    placeholder: 'your-site-id',
                  },
                },
                {
                  name: 'enableVideoAds',
                  type: 'checkbox',
                  label: 'Enable Video Ads',
                  defaultValue: true,
                  admin: {
                    description: 'Enable AdThrive video ad player',
                  },
                },
                {
                  name: 'stickyFooter',
                  type: 'checkbox',
                  label: 'Enable Sticky Footer',
                  defaultValue: true,
                  admin: {
                    description: 'Show sticky footer ad on mobile',
                  },
                },
              ],
            },
          ],
        },

        // Tab 6: Ad Placements
        {
          label: 'Placements',
          description: 'Configure where ads appear on the site',
          fields: [
            {
              name: 'placements',
              type: 'group',
              fields: [
                {
                  name: 'headerBanner',
                  type: 'checkbox',
                  label: 'Header Banner',
                  defaultValue: false,
                  admin: {
                    description: 'Show banner ad below header (728x90 or responsive)',
                  },
                },
                {
                  name: 'sidebarAd',
                  type: 'checkbox',
                  label: 'Sidebar Ad',
                  defaultValue: true,
                  admin: {
                    description: 'Show ad in sidebar on detail pages (300x250)',
                  },
                },
                {
                  name: 'inContentAd',
                  type: 'checkbox',
                  label: 'In-Content Ad',
                  defaultValue: true,
                  admin: {
                    description: 'Show ad between content sections on detail pages',
                  },
                },
                {
                  name: 'footerBanner',
                  type: 'checkbox',
                  label: 'Footer Banner',
                  defaultValue: false,
                  admin: {
                    description: 'Show banner ad above footer (728x90 or responsive)',
                  },
                },
                {
                  name: 'stickyFooterMobile',
                  type: 'checkbox',
                  label: 'Sticky Footer (Mobile)',
                  defaultValue: false,
                  admin: {
                    description: 'Show sticky footer ad on mobile devices',
                  },
                },
                {
                  name: 'searchResultsAd',
                  type: 'checkbox',
                  label: 'Search Results Ad',
                  defaultValue: false,
                  admin: {
                    description: 'Show native ads in search results list',
                  },
                },
              ],
            },
          ],
        },

        // Tab 7: Analytics & Revenue
        {
          label: 'Analytics',
          description: 'Ad performance tracking settings',
          fields: [
            {
              name: 'analytics',
              type: 'group',
              fields: [
                {
                  name: 'trackImpressions',
                  type: 'checkbox',
                  label: 'Track Ad Impressions',
                  defaultValue: true,
                  admin: {
                    description: 'Track when ads are viewed (for internal analytics)',
                  },
                },
                {
                  name: 'trackClicks',
                  type: 'checkbox',
                  label: 'Track Ad Clicks',
                  defaultValue: true,
                  admin: {
                    description: 'Track when ads are clicked (for internal analytics)',
                  },
                },
                {
                  name: 'revenueGoalMonthly',
                  type: 'number',
                  label: 'Monthly Revenue Goal ($)',
                  defaultValue: 0,
                  min: 0,
                  admin: {
                    description: 'Set a monthly revenue goal for tracking purposes',
                  },
                },
              ],
            },
          ],
        },

        // Tab 8: Exclusions
        {
          label: 'Exclusions',
          description: 'Configure where ads should NOT appear',
          fields: [
            {
              name: 'exclusions',
              type: 'group',
              fields: [
                {
                  name: 'excludeHomepage',
                  type: 'checkbox',
                  label: 'Exclude Homepage',
                  defaultValue: true,
                  admin: {
                    description: 'Do not show ads on the homepage/map view',
                  },
                },
                {
                  name: 'excludeAuthPages',
                  type: 'checkbox',
                  label: 'Exclude Auth Pages',
                  defaultValue: true,
                  admin: {
                    description: 'Do not show ads on login/register pages',
                  },
                },
                {
                  name: 'excludeAdminPages',
                  type: 'checkbox',
                  label: 'Exclude Admin Pages',
                  defaultValue: true,
                  admin: {
                    description: 'Do not show ads on admin/moderator pages',
                  },
                },
                {
                  name: 'excludeForLoggedInUsers',
                  type: 'checkbox',
                  label: 'Exclude for Logged-in Users',
                  defaultValue: false,
                  admin: {
                    description: 'Hide ads for authenticated users',
                  },
                },
                {
                  name: 'excludedPaths',
                  type: 'array',
                  label: 'Excluded Paths',
                  admin: {
                    description: 'Additional paths where ads should not appear',
                  },
                  fields: [
                    {
                      name: 'path',
                      type: 'text',
                      label: 'Path',
                      admin: {
                        placeholder: '/some/path',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
