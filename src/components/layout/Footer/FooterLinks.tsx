'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface FooterLink {
  href: string;
  labelKey: string;
  external?: boolean;
}

interface FooterLinksProps {
  title: string;
  links: FooterLink[];
}

export function FooterLinks({ title, links }: FooterLinksProps) {
  const t = useTranslations('footer');

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(link.labelKey)}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
