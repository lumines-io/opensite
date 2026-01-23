import { ReactNode, HTMLAttributes } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Alert variant
   * @default 'info'
   */
  variant?: AlertVariant;
  /**
   * Alert title
   */
  title?: string;
  /**
   * Whether to show the default icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom icon to display
   */
  icon?: ReactNode;
  /**
   * Action element (e.g., close button)
   */
  action?: ReactNode;
  /**
   * Additional className
   */
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-info-light border-info/30 text-info dark:bg-info/10 dark:border-info/20',
  success: 'bg-success-light border-success/30 text-success dark:bg-success/10 dark:border-success/20',
  warning: 'bg-warning-light border-warning/30 text-warning dark:bg-warning/10 dark:border-warning/20',
  error: 'bg-error-light border-error/30 text-error dark:bg-error/10 dark:border-error/20',
};

const iconColors: Record<AlertVariant, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

const defaultIcons: Record<AlertVariant, typeof InfoIcon> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

export function Alert({
  variant = 'info',
  title,
  showIcon = true,
  icon,
  action,
  className = '',
  children,
  ...props
}: AlertProps) {
  const DefaultIcon = defaultIcons[variant];

  return (
    <div
      role="alert"
      className={`p-4 rounded-lg border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <div className="flex gap-3">
        {showIcon && (
          <div className={`flex-shrink-0 ${iconColors[variant]}`}>
            {icon || <DefaultIcon className="w-5 h-5" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-medium mb-1">{title}</h3>
          )}
          <div className={title ? 'text-sm opacity-90' : ''}>{children}</div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
