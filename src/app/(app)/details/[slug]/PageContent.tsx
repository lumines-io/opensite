'use client';

import { ReactNode } from 'react';

interface PageContentProps {
  children: ReactNode;
}

export function PageContent({ children }: PageContentProps) {
  // Simplified - framer-motion removed to reduce bundle size and prevent Jest worker crashes
  return <div className="animate-fade-in">{children}</div>;
}
