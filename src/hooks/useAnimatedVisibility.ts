'use client';

import { useState, useEffect, startTransition } from 'react';

interface AnimationState {
  isVisible: boolean;
  shouldRender: boolean;
}

export function useAnimatedVisibility(
  isOpen: boolean,
  duration: number = 300
): AnimationState {
  // shouldRender controls whether the DOM is present
  const [shouldRender, setShouldRender] = useState(isOpen);
  // isVisible controls whether the animation classes show it as visible
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;

    if (isOpen) {
      // Opening: render first, then animate in
      startTransition(() => {
        setShouldRender(true);
      });
      // Wait for next frame to trigger CSS transition
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          startTransition(() => {
            setIsVisible(true);
          });
        });
      });
    } else {
      // Closing: animate out first, then unmount
      startTransition(() => {
        setIsVisible(false);
      });
      timeoutId = setTimeout(() => {
        startTransition(() => {
          setShouldRender(false);
        });
      }, duration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, duration]);

  return { isVisible, shouldRender };
}
