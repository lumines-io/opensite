/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    React.createElement('a', { href }, children)
  ),
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
    };
    return translations[namespace]?.[key] || key;
  },
}));

describe('Footer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render footer element', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('should render with full variant by default', () => {
      render(<Footer />);

      // Full variant shows all sections
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('should render with minimal variant', () => {
      render(<Footer variant="minimal" />);

      // Minimal variant only shows copyright
      expect(screen.getByText(/OpenSite/)).toBeInTheDocument();

      // Should not show full sections
      expect(screen.queryByText('Quick Links')).not.toBeInTheDocument();
      expect(screen.queryByText('Legal')).not.toBeInTheDocument();
    });
  });

  describe('Full Variant Content', () => {
    it('should display brand section with logo', () => {
      render(<Footer variant="full" />);

      // Brand section with app name
      const links = screen.getAllByRole('link');
      const homeLink = links.find((link) => link.getAttribute('href') === '/');
      expect(homeLink).toBeInTheDocument();
    });

    it('should display tagline', () => {
      render(<Footer variant="full" />);
      expect(screen.getByText(/Track road construction/)).toBeInTheDocument();
    });

    it('should display quick links section', () => {
      render(<Footer variant="full" />);

      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Suggest a Project')).toBeInTheDocument();
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('should display legal links section', () => {
      render(<Footer variant="full" />);

      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });

    it('should display copyright with current year', () => {
      render(<Footer variant="full" />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });

    it('should have correct link destinations', () => {
      render(<Footer variant="full" />);

      const homeLinks = screen.getAllByRole('link');

      // Find suggest link
      const suggestLink = homeLinks.find(
        (link) => link.textContent === 'Suggest a Project'
      );
      expect(suggestLink).toHaveAttribute('href', '/suggest');

      // Find status link
      const statusLink = homeLinks.find((link) => link.textContent === 'System Status');
      expect(statusLink).toHaveAttribute('href', '/status');
    });

    it('should have GitHub social link with proper attributes', () => {
      render(<Footer variant="full" />);

      const githubLink = screen.getByLabelText('GitHub');
      expect(githubLink).toHaveAttribute('href', 'https://github.com');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Minimal Variant Content', () => {
    it('should display only copyright', () => {
      render(<Footer variant="minimal" />);

      expect(screen.getByText(/OpenSite/)).toBeInTheDocument();
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
    });

    it('should have centered text alignment', () => {
      const { container } = render(<Footer variant="minimal" />);
      const footer = container.querySelector('footer');

      expect(footer?.className).toContain('text-center');
    });
  });

  describe('Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Footer className="custom-footer-class" />);
      const footer = container.querySelector('footer');

      expect(footer?.className).toContain('custom-footer-class');
    });

    it('should apply border and background styles', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');

      expect(footer?.className).toContain('border-t');
      expect(footer?.className).toContain('border-border');
      expect(footer?.className).toContain('bg-card');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic footer element', () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('should have accessible link labels', () => {
      render(<Footer variant="full" />);

      // GitHub link has aria-label
      const githubLink = screen.getByLabelText('GitHub');
      expect(githubLink).toBeInTheDocument();
    });

    it('should have heading structure for sections', () => {
      render(<Footer variant="full" />);

      // Section headings
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('FooterLinks Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title and links', async () => {
    const { FooterLinks } = await import('../Footer/FooterLinks');

    const links = [
      { href: '/test1', labelKey: 'home' },
      { href: '/test2', labelKey: 'suggestProject' },
    ];

    render(<FooterLinks title="Test Section" links={links} />);

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Suggest a Project')).toBeInTheDocument();
  });

  it('should render external links with correct attributes', async () => {
    const { FooterLinks } = await import('../Footer/FooterLinks');

    const links = [
      { href: 'https://external.com', labelKey: 'home', external: true },
    ];

    render(<FooterLinks title="External Links" links={links} />);

    const externalLink = screen.getByRole('link');
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
