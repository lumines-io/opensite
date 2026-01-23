import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseButtonProps {
  /**
   * Button variant style
   * @default 'primary'
   */
  variant?: ButtonVariant;
  /**
   * Button size
   * @default 'md'
   */
  size?: ButtonSize;
  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Loading text to display when isLoading is true
   */
  loadingText?: string;
  /**
   * Additional className for custom styling
   */
  className?: string;
}

type ButtonAsButton = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> & {
    as?: 'button';
    href?: never;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> & {
    as: 'link';
    href: string;
    external?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary/50',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary/50',
  ghost:
    'bg-transparent text-foreground hover:bg-muted focus:ring-muted-foreground/50',
  danger:
    'bg-error text-error-foreground hover:opacity-90 focus:ring-error/50',
  success:
    'bg-success text-success-foreground hover:opacity-90 focus:ring-success/50',
  outline:
    'bg-transparent border border-border text-foreground hover:bg-muted focus:ring-ring/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      loadingText,
      className = '',
      children,
      ...rest
    } = props;

    // Extract disabled from appropriate props type
    const disabled = 'disabled' in rest ? rest.disabled : false;

    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
      fullWidth ? 'w-full' : ''
    } ${className}`;

    const content = isLoading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {loadingText || children}
      </>
    ) : (
      children
    );

    if ('as' in props && props.as === 'link') {
      const { as: _as, href, external, ...linkProps } = rest as Omit<ButtonAsLink, keyof BaseButtonProps>;
      void _as;

      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={combinedClassName}
            {...(linkProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
          >
            {content}
          </a>
        );
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...(linkProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    const { as: _asButton, ...buttonProps } = rest as ButtonAsButton;
    void _asButton;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled || isLoading}
        className={combinedClassName}
        {...(buttonProps as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
