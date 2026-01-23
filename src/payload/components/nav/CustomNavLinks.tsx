'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Building2, Database, BarChart, SlidersHorizontal } from 'lucide-react';

const customLinks = [
  {
    label: 'Dashboard Overview',
    href: '/admin',
    exactMatch: true,
    icon: <Home size={20} />,
  },
  {
    label: 'Suggestions Queue',
    href: '/admin/suggestions-queue',
    icon: <ClipboardList size={20} />,
  },
  {
    label: 'Private Constructions',
    href: '/admin/private-constructions-review',
    icon: <Building2 size={20} />,
  },
  {
    label: 'Scrapers',
    href: '/admin/scrapers',
    icon: <Database size={20} />,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: <BarChart size={20} />,
  },
  {
    label: 'Feature Toggles',
    href: '/admin/feature-toggles',
    icon: <SlidersHorizontal size={20} />,
  },
];

export const CustomNavLinks: React.FC = () => {
  const pathname = usePathname();

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--theme-elevation-100)' }}>
      <div style={{
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--theme-elevation-300)',
        padding: '0 16px',
        marginBottom: 8
      }}>
        Custom Tools
      </div>
      {customLinks.map((link) => {
        const isActive = link.exactMatch
          ? pathname === link.href
          : pathname === link.href || pathname?.startsWith(link.href + '/');
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              margin: '2px 8px',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              background: isActive ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : 'transparent',
              color: isActive ? 'white' : 'var(--theme-elevation-300)',
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.7 }}>{link.icon}</span>
            <span style={{ fontSize: '0.875rem' }}>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default CustomNavLinks;
