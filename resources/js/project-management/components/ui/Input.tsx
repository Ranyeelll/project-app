import React from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}
export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label &&
      <label
        htmlFor={inputId}
        className="text-sm font-medium dark:text-dark-text text-light-text">

          {label}
        </label>
      }
      <div className="relative">
        {icon &&
        <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
            {icon}
          </div>
        }
        <input
          id={inputId}
          className={`
            w-full rounded-btn text-sm transition-colors
            dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle
            bg-white border-light-border text-light-text placeholder-light-subtle
            border px-3 py-2.5
            focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${iconRight ? 'pr-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : ''}
            ${className}
          `}
          {...props} />

        {iconRight &&
        <div className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
            {iconRight}
          </div>
        }
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error &&
      <p className="text-xs dark:text-dark-subtle text-light-subtle">
          {hint}
        </p>
      }
    </div>);

}
interface TextareaProps extends
  React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export function Textarea({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label &&
      <label
        htmlFor={inputId}
        className="text-sm font-medium dark:text-dark-text text-light-text">

          {label}
        </label>
      }
      <textarea
        id={inputId}
        className={`
          w-full rounded-btn text-sm transition-colors resize-none
          dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle
          bg-white border-light-border text-light-text placeholder-light-subtle
          border px-3 py-2.5
          focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : ''}
          ${className}
        `}
        rows={4}
        {...props} />

      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error &&
      <p className="text-xs dark:text-dark-subtle text-light-subtle">
          {hint}
        </p>
      }
    </div>);

}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: {
    value: string;
    label: string;
  }[];
}
export function Select({
  label,
  error,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label &&
      <label
        htmlFor={inputId}
        className="text-sm font-medium dark:text-dark-text text-light-text">

          {label}
        </label>
      }
      <select
        id={inputId}
        className={`
          w-full rounded-btn text-sm transition-colors
          dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text
          bg-white border-light-border text-light-text
          border px-3 py-2.5
          focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}>

        {options.map((opt) =>
        <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>);

}