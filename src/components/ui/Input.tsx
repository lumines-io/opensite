'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface BaseInputProps {
  /**
   * Label for the input field
   */
  label?: string;
  /**
   * Helper text displayed below the input
   */
  helperText?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Icon or element to display at the start of the input
   */
  startAdornment?: ReactNode;
  /**
   * Icon or element to display at the end of the input
   */
  endAdornment?: ReactNode;
  /**
   * Whether the input should take full width
   * @default true
   */
  fullWidth?: boolean;
  /**
   * Additional className for the container
   */
  containerClassName?: string;
}

type InputAsInput = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof BaseInputProps> & {
    as?: 'input';
    rows?: never;
  };

type InputAsTextarea = BaseInputProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof BaseInputProps> & {
    as: 'textarea';
    rows?: number;
  };

export type InputProps = InputAsInput | InputAsTextarea;

const baseInputStyles =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const errorInputStyles =
  'border-error focus:ring-error/50';

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (props, ref) => {
    const {
      label,
      helperText,
      error,
      startAdornment,
      endAdornment,
      fullWidth = true,
      containerClassName = '',
      className = '',
      id,
      ...rest
    } = props;

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    const inputClassName = `${baseInputStyles} ${hasError ? errorInputStyles : ''} ${
      startAdornment ? 'pl-10' : ''
    } ${endAdornment ? 'pr-10' : ''} ${className}`;

    const renderInput = () => {
      if ('as' in props && props.as === 'textarea') {
        const { as: _as, rows = 3, ...textareaProps } = rest as Omit<InputAsTextarea, keyof BaseInputProps>;
        void _as;
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            rows={rows}
            className={`${inputClassName} resize-none`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...(textareaProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        );
      }

      const { as: _asInput, ...inputProps } = rest as InputAsInput;
      void _asInput;
      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={inputId}
          className={inputClassName}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      );
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {startAdornment}
            </div>
          )}
          {renderInput()}
          {endAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {endAdornment}
            </div>
          )}
        </div>
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
