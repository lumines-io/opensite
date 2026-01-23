'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TransitionOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageTransitionContextType {
  isTransitioning: boolean;
  transitionOrigin: TransitionOrigin | null;
  targetUrl: string | null;
  startTransition: (origin: TransitionOrigin, url: string) => void;
  endTransition: () => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState<TransitionOrigin | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  const startTransition = useCallback((origin: TransitionOrigin, url: string) => {
    setTransitionOrigin(origin);
    setTargetUrl(url);
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
    setTransitionOrigin(null);
    setTargetUrl(null);
  }, []);

  return (
    <PageTransitionContext.Provider
      value={{
        isTransitioning,
        transitionOrigin,
        targetUrl,
        startTransition,
        endTransition,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within a PageTransitionProvider');
  }
  return context;
}
