import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: 'none' | 'light' | 'medium' | 'heavy';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const Card = ({
  header,
  footer,
  children,
  shadow = 'md',
  border = 'light',
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) => {
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const borderStyles = {
    none: '',
    light: 'border border-gray-200',
    medium: 'border-2 border-gray-300',
    heavy: 'border-4 border-gray-400',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverStyles = hoverable
    ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
    : '';

  const baseStyles = 'bg-white rounded-lg overflow-hidden';

  return (
    <div
      className={`${baseStyles} ${shadowStyles[shadow]} ${borderStyles[border]} ${hoverStyles} ${className}`}
      {...props}
    >
      {header && (
        <div
          className={`border-b border-gray-200 bg-gray-50 ${
            padding === 'none' ? 'p-4' : paddingStyles[padding]
          }`}
        >
          {header}
        </div>
      )}

      <div className={padding === 'none' ? '' : paddingStyles[padding]}>
        {children}
      </div>

      {footer && (
        <div
          className={`border-t border-gray-200 bg-gray-50 ${
            padding === 'none' ? 'p-4' : paddingStyles[padding]
          }`}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
