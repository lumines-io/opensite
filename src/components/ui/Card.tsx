import { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant
   * @default 'default'
   */
  variant?: 'default' | 'elevated' | 'outlined';
  /**
   * Whether to add padding
   * @default true
   */
  padding?: boolean;
  /**
   * Additional className
   */
  className?: string;
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-card border border-border shadow-sm',
  elevated: 'bg-card shadow-lg shadow-black/5',
  outlined: 'bg-transparent border border-border',
};

export function Card({
  variant = 'default',
  padding = true,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card title
   */
  title?: string;
  /**
   * Card description
   */
  description?: string;
  /**
   * Actions to display in the header
   */
  actions?: ReactNode;
  /**
   * Additional className
   */
  className?: string;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  actions,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div>
        {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Additional className
   */
  className?: string;
  children: ReactNode;
}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Additional className
   */
  className?: string;
  children: ReactNode;
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div
      className={`mt-6 pt-4 border-t border-border flex items-center gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
