import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      leftIcon,
      rightIcon,
      helperText,
      disabled,
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const baseInputStyles =
      'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500';

    const stateStyles = error
      ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
      : success
      ? 'border-green-300 text-green-900 focus:border-green-500 focus:ring-green-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    const paddingStyles = leftIcon && rightIcon
      ? 'pl-10 pr-10'
      : leftIcon
      ? 'pl-10 pr-4'
      : rightIcon
      ? 'pl-4 pr-10'
      : 'px-4';

    const sizeStyles = 'py-2 text-base';

    return (
      <div className="w-full">
        {label && (
          <label
            className={`block text-sm font-medium mb-1.5 ${
              error
                ? 'text-red-700'
                : success
                ? 'text-green-700'
                : 'text-gray-700'
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={`${baseInputStyles} ${stateStyles} ${paddingStyles} ${sizeStyles} ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : helperText
                ? `${props.id}-helper`
                : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}

          {success && !rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}

          {error && !rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {error && (
          <p
            className="mt-1.5 text-sm text-red-600"
            id={`${props.id}-error`}
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            className={`mt-1.5 text-sm ${
              success ? 'text-green-600' : 'text-gray-500'
            }`}
            id={`${props.id}-helper`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
