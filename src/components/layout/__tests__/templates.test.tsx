/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPageTemplate } from '../templates/AuthPageTemplate';
import { ContentPageTemplate } from '../templates/ContentPageTemplate';
import { ErrorPageTemplate } from '../templates/ErrorPageTemplate';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    React.createElement('a', { href }, children)
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/test',
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      footer: {
        tagline: 'Track road construction and infrastructure projects.',
        quickLinks: 'Quick Links',
        home: 'Home',
        suggestProject: 'Suggest a Project',
        status: 'System Status',
        legal: 'Legal',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        contact: 'Contact Us',
        allRightsReserved: 'All rights reserved.',
      },
      common: {
        appName: 'OpenSite',
      },
      nav: {
        suggestions: 'My Suggestions',
        moderator: 'Moderation',
      },
    };
    return translations[namespace]?.[key] || key;
  },
}));

vi.mock('@/components/Auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    hasRole: () => false,
  }),
  UserMenu: () => React.createElement('div', { 'data-testid': 'user-menu' }, 'UserMenu'),
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => React.createElement('button', { 'data-testid': 'theme-toggle' }, 'Theme Toggle'),
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => React.createElement('div', { 'data-testid': 'language-switcher' }, 'Language Switcher'),
}));

vi.mock('@/lib/feature-flags/provider', () => ({
  useFeatureFlag: () => true,
  FEATURE_FLAGS: {
    FEATURE_THEME_TOGGLE: 'FEATURE_THEME_TOGGLE',
    FEATURE_I18N: 'FEATURE_I18N',
    FEATURE_COMMUNITY_SUGGESTIONS: 'FEATURE_COMMUNITY_SUGGESTIONS',
    FEATURE_MODERATOR_DASHBOARD: 'FEATURE_MODERATOR_DASHBOARD',
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      React.createElement('div', props, children)
    ),
  },
}));

describe('AuthPageTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <AuthPageTemplate>
          <div data-testid="child-content">Test Content</div>
        </AuthPageTemplate>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <AuthPageTemplate title="Welcome Back">
          <div>Content</div>
        </AuthPageTemplate>
      );

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <AuthPageTemplate title="Welcome" description="Sign in to continue">
          <div>Content</div>
        </AuthPageTemplate>
      );

      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('should render without title and description', () => {
      render(
        <AuthPageTemplate>
          <div data-testid="content">Content</div>
        </AuthPageTemplate>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      // When no title is provided, the template's title area should not show
      // Note: There may still be other headings from header/footer components
    });
  });

  describe('Layout Structure', () => {
    it('should have minimal header', () => {
      render(
        <AuthPageTemplate>
          <div>Content</div>
        </AuthPageTemplate>
      );

      // Minimal header shows language switcher but not user menu
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('should have minimal footer', () => {
      render(
        <AuthPageTemplate>
          <div>Content</div>
        </AuthPageTemplate>
      );

      // Minimal footer shows copyright but not full sections like Quick Links
      expect(screen.queryByText('Quick Links')).not.toBeInTheDocument();
    });

    it('should render content in a card with proper styling', () => {
      const { container } = render(
        <AuthPageTemplate>
          <div>Content</div>
        </AuthPageTemplate>
      );

      // Check for card styling classes - find the main content card specifically
      const cards = container.querySelectorAll('.bg-card');
      expect(cards.length).toBeGreaterThan(0);
      // At least one card should have rounded corners
      const hasRoundedCard = Array.from(cards).some(card => card.className.includes('rounded'));
      expect(hasRoundedCard).toBe(true);
    });
  });

  describe('Max Width', () => {
    it('should apply default max-w-md', () => {
      const { container } = render(
        <AuthPageTemplate>
          <div>Content</div>
        </AuthPageTemplate>
      );

      const wrapper = container.querySelector('.max-w-md');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply max-w-sm when specified', () => {
      const { container } = render(
        <AuthPageTemplate maxWidth="sm">
          <div>Content</div>
        </AuthPageTemplate>
      );

      const wrapper = container.querySelector('.max-w-sm');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply max-w-lg when specified', () => {
      const { container } = render(
        <AuthPageTemplate maxWidth="lg">
          <div>Content</div>
        </AuthPageTemplate>
      );

      const wrapper = container.querySelector('.max-w-lg');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

describe('ContentPageTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <ContentPageTemplate>
          <div data-testid="child-content">Test Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render page title when provided', () => {
      render(
        <ContentPageTemplate pageTitle="My Page Title">
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByText('My Page Title')).toBeInTheDocument();
    });

    it('should render page description when provided', () => {
      render(
        <ContentPageTemplate pageTitle="Title" pageDescription="This is a description">
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have full header with user menu', () => {
      render(
        <ContentPageTemplate>
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('should have full footer by default', () => {
      render(
        <ContentPageTemplate>
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('should have minimal footer when showFullFooter is false', () => {
      render(
        <ContentPageTemplate showFullFooter={false}>
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.queryByText('Quick Links')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render actions when provided', () => {
      render(
        <ContentPageTemplate
          pageTitle="Page"
          actions={<button data-testid="action-button">Action</button>}
        >
          <div>Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByTestId('action-button')).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should render sidebar when provided', () => {
      render(
        <ContentPageTemplate sidebar={<div data-testid="sidebar">Sidebar Content</div>}>
          <div>Main Content</div>
        </ContentPageTemplate>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should use grid layout when sidebar is present', () => {
      const { container } = render(
        <ContentPageTemplate sidebar={<div>Sidebar</div>}>
          <div>Main Content</div>
        </ContentPageTemplate>
      );

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toContain('lg:grid-cols-3');
    });
  });

  describe('Max Width', () => {
    it('should apply default max-w-7xl', () => {
      const { container } = render(
        <ContentPageTemplate>
          <div>Content</div>
        </ContentPageTemplate>
      );

      const wrapper = container.querySelector('.max-w-7xl');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply max-w-4xl when specified', () => {
      const { container } = render(
        <ContentPageTemplate maxWidth="4xl">
          <div>Content</div>
        </ContentPageTemplate>
      );

      const wrapper = container.querySelector('.max-w-4xl');
      expect(wrapper).toBeInTheDocument();
    });
  });
});

describe('ErrorPageTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render error code when provided', () => {
      render(
        <ErrorPageTemplate
          errorCode="404"
          title="Not Found"
          description="Page not found"
        />
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('404');
    });

    it('should render title', () => {
      render(
        <ErrorPageTemplate
          title="Page Not Found"
          description="The page you're looking for doesn't exist"
        />
      );

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Page Not Found');
    });

    it('should render description', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Something went wrong"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Default Actions', () => {
    it('should show Go Home button by default', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      expect(screen.getByRole('link', { name: 'Go Home' })).toBeInTheDocument();
    });

    it('should show Go Back button by default', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });

    it('should not show default buttons when custom actions provided', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          actions={<button>Custom Action</button>}
        />
      );

      expect(screen.queryByRole('link', { name: 'Go Home' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Go Back' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
    });
  });

  describe('Custom Button Labels', () => {
    it('should use custom home button label', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          homeButtonLabel="Return Home"
        />
      );

      expect(screen.getByRole('link', { name: 'Return Home' })).toBeInTheDocument();
    });

    it('should use custom back button label', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          backButtonLabel="Previous Page"
        />
      );

      expect(screen.getByRole('button', { name: 'Previous Page' })).toBeInTheDocument();
    });
  });

  describe('Hide Buttons', () => {
    it('should hide home button when showHomeButton is false', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          showHomeButton={false}
        />
      );

      expect(screen.queryByRole('link', { name: 'Go Home' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });

    it('should hide back button when showBackButton is false', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          showBackButton={false}
        />
      );

      expect(screen.getByRole('link', { name: 'Go Home' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Go Back' })).not.toBeInTheDocument();
    });
  });

  describe('Go Back Functionality', () => {
    it('should call window.history.back when Go Back is clicked', () => {
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      const backButton = screen.getByRole('button', { name: 'Go Back' });
      fireEvent.click(backButton);

      expect(historyBackSpy).toHaveBeenCalled();

      historyBackSpy.mockRestore();
    });
  });

  describe('Custom Icon', () => {
    it('should render custom icon when provided', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
          icon={<div data-testid="custom-icon">Custom Icon</div>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render default icon when not provided', () => {
      const { container } = render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      // Default icon is an SVG with warning triangle
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have minimal header', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      // Minimal header shows language switcher
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('should have minimal footer', () => {
      render(
        <ErrorPageTemplate
          title="Error"
          description="Description"
        />
      );

      // Minimal footer shows copyright only (no Quick Links)
      expect(screen.queryByText('Quick Links')).not.toBeInTheDocument();
    });
  });
});
