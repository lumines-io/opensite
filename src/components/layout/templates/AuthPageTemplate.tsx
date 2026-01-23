'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../Header';
import { Footer } from '../Footer';

export interface AuthPageTemplateProps {
  /**
   * The page content (typically a form)
   */
  children: ReactNode;
  /**
   * The page title displayed above the content card
   */
  title?: string;
  /**
   * The page description displayed below the title
   */
  description?: string;
  /**
   * Maximum width of the content card
   * @default 'md' (max-w-md)
   */
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function AuthPageTemplate({
  children,
  title,
  description,
  maxWidth = 'md',
}: AuthPageTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header variant="minimal" sticky={false} />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`w-full ${maxWidthClasses[maxWidth]}`}
        >
          {(title || description) && (
            <div className="text-center mb-8">
              {title && (
                <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground">{description}</p>
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            {children}
          </div>
        </motion.div>
      </main>

      <Footer variant="minimal" />
    </div>
  );
}
