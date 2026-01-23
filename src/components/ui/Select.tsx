'use client';

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  /**
   * Label for the select field
   */
  label?: string;
  /**
   * Options for the select
   */
  options: SelectOption[];
  /**
   * Placeholder option text
   */
  placeholder?: string;
  /**
   * Helper text displayed below the select
   */
  helperText?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Icon to display at the start
   */
  startAdornment?: ReactNode;
  /**
   * Whether the select should take full width
   * @default true
   */
  fullWidth?: boolean;
  /**
   * Additional className for the container
   */
  containerClassName?: string;
}

const baseSelectStyles =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';

const errorSelectStyles = 'border-error focus:ring-error/50';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      helperText,
      error,
      startAdornment,
      fullWidth = true,
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    const selectClassName = `${baseSelectStyles} ${hasError ? errorSelectStyles : ''} ${
      startAdornment ? 'pl-10' : ''
    } pr-10 ${className}`;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {startAdornment}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={selectClassName}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-xs text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
