import { ReactNode, HTMLAttributes } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

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

const defaultIcons: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
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
