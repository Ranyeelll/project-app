import React from 'react';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-btn transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants: Record<ButtonVariant, string> = {
    primary:
    'bg-green-primary text-black hover:bg-green-progress active:scale-[0.98] shadow-sm',
    secondary:
    'dark:bg-dark-card2 dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-border bg-light-card2 text-light-text border border-light-border hover:bg-light-border border',
    ghost:
    'dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
    outline:
    'border dark:border-green-primary dark:text-green-primary dark:hover:bg-green-primary/10 border-green-primary text-green-primary hover:bg-green-primary/10'
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm'
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}>

      {loading ?
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4" />

          <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />

        </svg> :

      icon && <span className="flex-shrink-0">{icon}</span>
      }
      {children}
      {iconRight && !loading &&
      <span className="flex-shrink-0">{iconRight}</span>
      }
    </button>);

}